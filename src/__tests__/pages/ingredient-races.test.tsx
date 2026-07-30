import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

jest.mock('../../services/api', () => ({
  ...jest.requireActual('../../services/api'),
  fetchDishStepsStreaming: jest.fn(),
}))

import IngredientPage from '../../pages/ingredient/ingredient'
import { fetchDishStepsStreaming } from '../../services/api'

const mockRequest = taroMock.request as jest.Mock
const mockFetchSteps = fetchDishStepsStreaming as jest.Mock

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const tomatoQuick = {
  statusCode: 200,
  data: {
    dishes: [{ name: '番茄炒蛋', summary: '番茄结果' }],
    input_ingredients: ['番茄'],
  },
}
const potatoQuick = {
  statusCode: 200,
  data: {
    dishes: [{ name: '土豆丝', summary: '土豆结果' }],
    input_ingredients: ['番茄', '土豆'],
  },
}

describe('ingredient async request ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ignores an older quick response after criteria change', async () => {
    const first = deferred<any>()
    const second = deferred<any>()
    mockRequest
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))
    fireEvent.click(screen.getByText('土豆'))

    await waitFor(() => expect(screen.getByText('开做！')).toBeInTheDocument())
    fireEvent.click(screen.getByText('开做！'))
    second.resolve(potatoQuick)
    await waitFor(() => expect(screen.getByText('土豆丝')).toBeInTheDocument())

    first.resolve(tomatoQuick)
    await Promise.resolve()
    expect(screen.queryByText('番茄炒蛋')).not.toBeInTheDocument()
    expect(screen.getByText('土豆丝')).toBeInTheDocument()
  })

  it('does not let an old detail stream mutate a new result list', async () => {
    mockRequest
      .mockResolvedValueOnce(tomatoQuick)
      .mockResolvedValueOnce(potatoQuick)
    const detail = deferred<any>()
    let emitProgress: ((steps: string[]) => void) | undefined
    mockFetchSteps.mockImplementation((_name, _ingredients, progress) => {
      emitProgress = progress
      return detail.promise
    })
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))
    await waitFor(() => expect(screen.getByText('番茄炒蛋')).toBeInTheDocument())
    fireEvent.click(screen.getByText('番茄炒蛋'))

    fireEvent.click(screen.getByText('土豆'))
    fireEvent.click(screen.getByText('开做！'))
    await waitFor(() => expect(screen.getByText('土豆丝')).toBeInTheDocument())

    emitProgress?.(['旧步骤'])
    detail.resolve({
      name: '番茄炒蛋',
      summary: '旧详情',
      ingredients: ['番茄'],
      steps: ['旧步骤'],
    })
    await Promise.resolve()

    expect(screen.getByText('土豆丝')).toBeInTheDocument()
    expect(screen.queryByText('番茄炒蛋')).not.toBeInTheDocument()
    expect(screen.queryByText('旧步骤')).not.toBeInTheDocument()
  })

  it('allows retry after partial stream progress followed by failure', async () => {
    mockRequest.mockResolvedValue(tomatoQuick)
    mockFetchSteps.mockImplementation((_name, _ingredients, progress) => {
      progress(['半截步骤'])
      return Promise.reject(new Error('stream and fallback failed'))
    })
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))
    await waitFor(() => expect(screen.getByText('番茄炒蛋')).toBeInTheDocument())

    fireEvent.click(screen.getByText('番茄炒蛋'))
    await waitFor(() => expect(mockFetchSteps).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByText('番茄炒蛋'))
    fireEvent.click(screen.getByText('番茄炒蛋'))
    await waitFor(() => expect(mockFetchSteps).toHaveBeenCalledTimes(2))
  })

  it('guards load more against rapid duplicate taps', async () => {
    const loadMore = deferred<any>()
    mockRequest
      .mockResolvedValueOnce(tomatoQuick)
      .mockReturnValueOnce(loadMore.promise)
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))
    await waitFor(() => expect(screen.getByText('加载更多 ▼')).toBeInTheDocument())

    const button = screen.getByText('加载更多 ▼')
    fireEvent.click(button)
    fireEvent.click(button)
    expect(mockRequest).toHaveBeenCalledTimes(2)

    loadMore.resolve({ statusCode: 200, data: { dishes: [] } })
  })

  it('invalidates visible results when criteria change before load more', async () => {
    mockRequest.mockResolvedValue(tomatoQuick)
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))
    await waitFor(() => expect(screen.getByText('番茄炒蛋')).toBeInTheDocument())

    fireEvent.click(screen.getByText('土豆'))

    await waitFor(() => {
      expect(screen.queryByText('番茄炒蛋')).not.toBeInTheDocument()
      expect(screen.queryByText('加载更多 ▼')).not.toBeInTheDocument()
    })
    expect(mockRequest).toHaveBeenCalledTimes(1)
  })

  it('a fresh recommendation does not inherit stale load-more state', async () => {
    const oldLoadMore = deferred<any>()
    mockRequest
      .mockResolvedValueOnce(tomatoQuick)
      .mockReturnValueOnce(oldLoadMore.promise)
      .mockResolvedValueOnce({
        statusCode: 200,
        data: {
          dishes: [{ name: '番茄蛋汤', summary: '新推荐' }],
          input_ingredients: ['番茄'],
        },
      })
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))
    await waitFor(() => expect(screen.getByText('加载更多 ▼')).toBeInTheDocument())
    fireEvent.click(screen.getByText('加载更多 ▼'))
    await waitFor(() => expect(screen.getByText('加载中...')).toBeInTheDocument())

    fireEvent.click(screen.getByText('开做！'))
    await waitFor(() => {
      expect(screen.getByText('番茄蛋汤')).toBeInTheDocument()
      expect(screen.getByText('加载更多 ▼')).toBeInTheDocument()
    })

    oldLoadMore.resolve({
      statusCode: 200,
      data: { dishes: [{ name: '旧加载结果', summary: '不应出现' }] },
    })
    await Promise.resolve()
    expect(screen.queryByText('旧加载结果')).not.toBeInTheDocument()
  })

  it('uses local fallback for an empty initial quick response', async () => {
    mockRequest.mockResolvedValue({
      statusCode: 200,
      data: { dishes: [], input_ingredients: ['番茄'] },
    })
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))

    await waitFor(() => {
      expect(screen.getByText('网络开小差，先看看这些经典搭配')).toBeInTheDocument()
      expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    })
  })
})
