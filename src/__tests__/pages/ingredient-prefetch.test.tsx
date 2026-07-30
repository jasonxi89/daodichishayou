import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

import IngredientPage from '../../pages/ingredient/ingredient'

const mockRequest = taroMock.request as jest.Mock
const mockShowToast = taroMock.showToast as jest.Mock

const quickResponse = {
  statusCode: 200,
  data: {
    dishes: [{ name: '番茄炒蛋', summary: '家常快手菜' }],
    input_ingredients: ['番茄'],
  },
}

describe('ingredient recommendation prefetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('prefetches one second after ingredient selection settles', async () => {
    mockRequest.mockResolvedValue(quickResponse)
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))

    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1), {
      timeout: 2500,
    })
    expect(mockRequest.mock.calls[0][0].url).toContain('/api/recommend/quick')
  })

  it('reuses the matching prefetched promise on recommend click', async () => {
    mockRequest.mockResolvedValue(quickResponse)
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1), {
      timeout: 2500,
    })

    fireEvent.click(screen.getByText('开做！'))

    await waitFor(() => {
      expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    })
    expect(mockRequest).toHaveBeenCalledTimes(1)
  })

  it('discards a stale prefetch after the selection changes', async () => {
    mockRequest.mockResolvedValue(quickResponse)
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1), {
      timeout: 2500,
    })

    fireEvent.click(screen.getByText('土豆'))
    fireEvent.click(screen.getByText('开做！'))

    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2))
    expect(mockRequest.mock.calls[1][0].data.ingredients).toEqual([
      '番茄',
      '土豆',
    ])
  })

  it('silently discards a failed background prefetch', async () => {
    mockRequest.mockRejectedValue(new Error('offline'))
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))

    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1), {
      timeout: 2500,
    })
    expect(mockShowToast).not.toHaveBeenCalled()
  })
})
