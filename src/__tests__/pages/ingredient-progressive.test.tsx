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
const mockFetchDishStepsStreaming = fetchDishStepsStreaming as jest.Mock

declare const API_BASE: string

const quickDish = {
  name: '番茄炒蛋',
  summary: '家常快手菜',
  difficulty: '简单',
  cook_time: '约10分钟',
}

const fullDish = {
  ...quickDish,
  ingredients: ['番茄 2个', '鸡蛋 3个'],
  steps: ['番茄切块', '鸡蛋炒熟'],
  extra_ingredients: null,
}

async function renderQuickResult() {
  mockRequest.mockResolvedValueOnce({
    statusCode: 200,
    data: { dishes: [quickDish], input_ingredients: ['番茄'] },
  })
  render(<IngredientPage />)
  fireEvent.click(screen.getByText('番茄'))
  fireEvent.click(screen.getByText('开始推荐'))
  await waitFor(() => {
    expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
  })
}

describe('Ingredient page progressive recommendation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rotates staged loading copy while quick request is pending', async () => {
    mockRequest.mockImplementation(() => new Promise(() => undefined))
    render(<IngredientPage />)
    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    expect(screen.getByText('正在翻 2 万本菜谱...')).toBeInTheDocument()
    await waitFor(
      () => expect(screen.getByText('大厨思考中...')).toBeInTheDocument(),
      { timeout: 4000 },
    )
  })

  it('requests quick dish cards with a 30 second timeout', async () => {
    await renderQuickResult()

    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: `${API_BASE}/api/recommend/quick`,
        timeout: 30000,
      }),
    )
    expect(screen.queryByText('做法步骤')).not.toBeInTheDocument()
  })

  it('loads full steps when a quick card is expanded', async () => {
    await renderQuickResult()
    mockFetchDishStepsStreaming.mockResolvedValue(fullDish)

    fireEvent.click(screen.getByText('番茄炒蛋'))

    await waitFor(() => {
      expect(mockFetchDishStepsStreaming).toHaveBeenCalledWith(
        '番茄炒蛋',
        ['番茄'],
        expect.any(Function),
        3000,
        3000,
        { preferences: null, allowExtra: false },
      )
      expect(screen.getByText('鸡蛋炒熟')).toBeInTheDocument()
    })
  })

  it('does not reload steps when the same card is expanded again', async () => {
    await renderQuickResult()
    mockFetchDishStepsStreaming.mockResolvedValue(fullDish)

    fireEvent.click(screen.getByText('番茄炒蛋'))
    await waitFor(() => expect(screen.getByText('鸡蛋炒熟')).toBeInTheDocument())

    fireEvent.click(screen.getByText('番茄炒蛋'))
    fireEvent.click(screen.getByText('番茄炒蛋'))

    await waitFor(() => expect(screen.getByText('鸡蛋炒熟')).toBeInTheDocument())
    expect(mockFetchDishStepsStreaming).toHaveBeenCalledTimes(1)
  })

  it('uses the quick endpoint for load more', async () => {
    await renderQuickResult()
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: {
        dishes: [{ ...quickDish, name: '番茄蛋汤' }],
        input_ingredients: ['番茄'],
      },
    })

    fireEvent.click(screen.getByText('加载更多 ▼'))

    await waitFor(() => {
      expect(screen.getByText('番茄蛋汤')).toBeInTheDocument()
      expect(mockRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          url: `${API_BASE}/api/recommend/quick`,
          data: expect.objectContaining({
            exclude_dishes: ['番茄炒蛋'],
          }),
        }),
      )
    })
  })
})
