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

function bytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

function streamTask(chunks: string[]) {
  const task = Promise.resolve({ statusCode: 200, data: null }) as any
  task.abort = jest.fn()
  task.onChunkReceived = jest.fn((callback) => {
    queueMicrotask(() => {
      chunks.forEach(chunk => callback({ data: bytes(chunk) }))
    })
  })
  return task
}

describe('recommend steps streaming service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders completed step strings incrementally and resolves marker JSON', async () => {
    const progress: string[] = []
    const raw = JSON.stringify(fullDish)
    const marker = `\n@@JSON@@${raw}`
    const task = streamTask([
      raw.slice(0, raw.indexOf('番茄切块') + '番茄切块'.length + 1),
      raw.slice(raw.indexOf('番茄切块') + '番茄切块'.length + 1),
      marker,
    ])
    mockRequest.mockReturnValueOnce(task)

    const result = await fetchDishStepsStreaming(
      '番茄炒蛋',
      ['番茄', '鸡蛋'],
      text => progress.push(text),
    )

    expect(result).toEqual(fullDish)
    expect(progress.some(text => text.includes('番茄切块'))).toBe(true)
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/api/recommend/steps?stream=1'),
        enableChunked: true,
      }),
    )
    expect(task.abort).not.toHaveBeenCalled()
  })

  it('aborts before fallback when chunk callbacks are unavailable', async () => {
    const unsupportedTask = Promise.resolve({ statusCode: 200 }) as any
    unsupportedTask.abort = jest.fn()
    mockRequest
      .mockReturnValueOnce(unsupportedTask)
      .mockResolvedValueOnce({ statusCode: 200, data: fullDish })

    const result = await fetchDishStepsStreaming(
      '番茄炒蛋',
      ['番茄'],
      jest.fn(),
    )

    expect(result).toEqual(fullDish)
    expect(unsupportedTask.abort).toHaveBeenCalledTimes(1)
    expect(mockRequest).toHaveBeenCalledTimes(2)
    expect(mockRequest.mock.calls[1][0].url).toContain('/api/recommend/steps')
    expect(mockRequest.mock.calls[1][0].url).not.toContain('stream=1')
  })

  it('aborts before fallback when the stream emits an error marker', async () => {
    const task = streamTask(['部分步骤', '\n@@ERR@@'])
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

  it('aborts and falls back if the first chunk misses the deadline', async () => {
    const task = new Promise(() => undefined) as any
    task.abort = jest.fn()
    task.onChunkReceived = jest.fn()
    mockRequest
      .mockReturnValueOnce(task)
      .mockResolvedValueOnce({ statusCode: 200, data: fullDish })

    const result = await fetchDishStepsStreaming(
      '番茄炒蛋',
      ['番茄'],
      jest.fn(),
      20,
    )

    expect(result).toEqual(fullDish)
    expect(task.abort).toHaveBeenCalledTimes(1)
  })
})
