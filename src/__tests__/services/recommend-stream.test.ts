import Taro from '@tarojs/taro'
import { TextDecoder, TextEncoder } from 'util'

import { fetchDishStepsStreaming } from '../../services/api'

Object.assign(global, { TextDecoder, TextEncoder })

const mockRequest = Taro.request as jest.Mock

const fullDish = {
  name: '番茄炒蛋',
  summary: '家常快手菜',
  ingredients: ['番茄 2个', '鸡蛋 3个'],
  steps: ['番茄切块', '鸡蛋炒熟'],
  difficulty: '简单',
  cook_time: '约10分钟',
  extra_ingredients: null,
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function frame(value: unknown): string {
  return `${JSON.stringify(value)}\n`
}

function streamTask(byteChunks: Uint8Array[]) {
  let resolveTask: (value: unknown) => void
  const task = new Promise(resolve => {
    resolveTask = resolve
  }) as any
  task.abort = jest.fn()
  task.onChunkReceived = jest.fn((callback) => {
    queueMicrotask(() => {
      byteChunks.forEach(chunk => callback({ data: chunk.buffer as ArrayBuffer }))
      resolveTask({ statusCode: 200 })
    })
  })
  return task
}

describe('recommend steps streaming service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parses NDJSON across UTF-8 boundaries without treating metadata as steps', async () => {
    const progress: string[][] = []
    const modelJson = JSON.stringify(fullDish)
    const wire = encode(
      frame({ type: 'delta', text: modelJson })
      + frame({ type: 'complete', dish: fullDish }),
    )
    const chineseStart = wire.findIndex(byte => byte > 0x7f)
    const task = streamTask([
      wire.slice(0, chineseStart + 1),
      wire.slice(chineseStart + 1, chineseStart + 2),
      wire.slice(chineseStart + 2),
    ])
    mockRequest.mockReturnValueOnce(task)

    const result = await fetchDishStepsStreaming(
      '番茄炒蛋',
      ['番茄', '鸡蛋'],
      steps => progress.push(steps),
    )

    expect(result).toEqual(fullDish)
    expect(progress.at(-1)).toEqual(['番茄切块', '鸡蛋炒熟'])
    expect(progress.flat()).not.toContain('difficulty')
    expect(progress.flat()).not.toContain('约10分钟')
    expect(task.abort).not.toHaveBeenCalled()
  })

  it('aborts before fallback when chunk callbacks are unavailable', async () => {
    const events: string[] = []
    let rejectTask: (error: Error) => void
    const unsupportedTask = new Promise((_, reject) => {
      rejectTask = reject
    }) as any
    unsupportedTask.abort = jest.fn(() => {
      events.push('abort')
      rejectTask(new Error('aborted'))
    })
    mockRequest
      .mockReturnValueOnce(unsupportedTask)
      .mockImplementationOnce(() => {
        events.push('fallback-request')
        return Promise.resolve({ statusCode: 200, data: fullDish })
      })

    const result = await fetchDishStepsStreaming(
      '番茄炒蛋',
      ['番茄'],
      jest.fn(),
    )

    expect(result).toEqual(fullDish)
    expect(events).toEqual(['abort', 'fallback-request'])
  })

  it('aborts before fallback when an error frame arrives', async () => {
    const task = streamTask([
      encode(frame({ type: 'delta', text: '部分步骤' })),
      encode(frame({ type: 'error', code: 'provider_interrupted' })),
    ])
    mockRequest
      .mockReturnValueOnce(task)
      .mockResolvedValueOnce({ statusCode: 200, data: fullDish })

    const result = await fetchDishStepsStreaming(
      '番茄炒蛋',
      ['番茄'],
      jest.fn(),
    )

    expect(result).toEqual(fullDish)
    expect(task.abort).toHaveBeenCalledTimes(1)
    expect(mockRequest).toHaveBeenCalledTimes(2)
  })

  it('aborts a stream that emits one chunk and then stalls', async () => {
    const task = new Promise(() => undefined) as any
    task.abort = jest.fn()
    task.onChunkReceived = jest.fn(callback => {
      callback({
        data: encode(frame({ type: 'delta', text: '{"steps":[' })).buffer,
      })
    })
    mockRequest
      .mockReturnValueOnce(task)
      .mockResolvedValueOnce({ statusCode: 200, data: fullDish })

    const result = await fetchDishStepsStreaming(
      '番茄炒蛋',
      ['番茄'],
      jest.fn(),
      20,
      20,
    )

    expect(result).toEqual(fullDish)
    expect(task.abort).toHaveBeenCalledTimes(1)
  })

  it('uses only the non-stream request when TextDecoder is unavailable', async () => {
    const original = global.TextDecoder
    // @ts-expect-error exercise old WeChat base-library behavior
    delete global.TextDecoder
    mockRequest.mockResolvedValueOnce({ statusCode: 200, data: fullDish })
    try {
      const result = await fetchDishStepsStreaming(
        '番茄炒蛋',
        ['番茄'],
        jest.fn(),
      )
      expect(result).toEqual(fullDish)
      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls[0][0].url).not.toContain('stream=1')
    } finally {
      global.TextDecoder = original
    }
  })
})
