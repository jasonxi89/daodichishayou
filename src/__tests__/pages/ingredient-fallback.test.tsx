import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

import IngredientPage from '../../pages/ingredient/ingredient'

const mockRequest = taroMock.request as jest.Mock
const mockShowToast = taroMock.showToast as jest.Mock

const remoteResponse = {
  statusCode: 200,
  data: {
    dishes: [{ name: '远端番茄菜', summary: '远端推荐' }],
    input_ingredients: ['番茄'],
  },
}

async function selectAndRecommend() {
  render(<IngredientPage />)
  fireEvent.click(screen.getByText('番茄'))
  fireEvent.click(screen.getByText('开做！'))
  await waitFor(() => {
    expect(screen.getByText('网络开小差，先看看这些经典搭配')).toBeInTheDocument()
  })
}

describe('ingredient recommendation silent fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows matching local dishes and retry on HTTP failure', async () => {
    mockRequest.mockResolvedValue({ statusCode: 502, data: {} })

    await selectAndRecommend()

    expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    expect(screen.getByText('重试')).toBeInTheDocument()
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: '网络异常，请重试' }),
    )
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: '推荐失败，请重试' }),
    )
  })

  it('uses the same silent fallback on network rejection', async () => {
    mockRequest.mockRejectedValue(new Error('offline'))

    await selectAndRecommend()

    expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('retries the quick request and replaces fallback results', async () => {
    mockRequest
      .mockResolvedValueOnce({ statusCode: 502, data: {} })
      .mockResolvedValueOnce(remoteResponse)

    await selectAndRecommend()
    fireEvent.click(screen.getByText('重试'))

    await waitFor(() => {
      expect(screen.getByText('远端番茄菜')).toBeInTheDocument()
    })
    expect(screen.queryByText('网络开小差，先看看这些经典搭配')).not.toBeInTheDocument()
  })
})
