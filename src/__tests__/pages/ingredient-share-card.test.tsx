import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

jest.mock('../../pages/ingredient/shareCard', () => ({
  drawShareCard: jest.fn(),
}))
jest.mock('../../utils/dateLabel', () => ({
  ...jest.requireActual('../../utils/dateLabel'),
  getDateShort: jest.fn(() => '七月十九'),
}))

import IngredientPage from '../../pages/ingredient/ingredient'
import { drawShareCard } from '../../pages/ingredient/shareCard'

const mockRequest = taroMock.request as jest.Mock
const mockCreateSelectorQuery = taroMock.createSelectorQuery as jest.Mock
const mockCanvasToTempFilePath = taroMock.canvasToTempFilePath as jest.Mock
const mockUseShareAppMessage = taroMock.useShareAppMessage as jest.Mock
const mockUseShareTimeline = taroMock.useShareTimeline as jest.Mock
const mockDrawShareCard = drawShareCard as jest.Mock
const EMPTY_SHARE_TITLE = '有材料不知道做什么？到底吃啥哟，专业智能'
  + '推荐！'

function latestShareCallback(mock: jest.Mock) {
  return mock.mock.calls[mock.mock.calls.length - 1][0]
}

describe('Ingredient share-card Canvas pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('preserves the existing empty-result share copy and path', () => {
    render(<IngredientPage />)

    const appShare = latestShareCallback(mockUseShareAppMessage)
    const timelineShare = latestShareCallback(mockUseShareTimeline)

    expect(appShare()).toEqual({
      title: EMPTY_SHARE_TITLE,
      path: '/pages/ingredient/ingredient',
    })
    expect(timelineShare()).toEqual({
      title: EMPTY_SHARE_TITLE,
    })
  })

  it('draws and exports the shared image when the Canvas node exists', async () => {
    const ctx = { scale: jest.fn() }
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => ctx),
    }
    const exec = jest.fn((callback) => callback([{ node: canvas }]))
    const fields = jest.fn(() => ({ exec }))
    const select = jest.fn(() => ({ fields }))
    mockCreateSelectorQuery.mockReturnValueOnce({ select })
    mockCanvasToTempFilePath.mockImplementationOnce(({ success }) => {
      success({ tempFilePath: '/tmp/share-card.png' })
    })
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: {
        dishes: [{
          name: '番茄炒蛋',
          summary: '家常快手菜',
          cook_time: '10 分钟',
        }],
        input_ingredients: ['番茄'],
      },
    })

    render(<IngredientPage />)
    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开做！'))

    await waitFor(() => {
      expect(mockDrawShareCard).toHaveBeenCalledWith(ctx, {
        dishes: [{
          name: '番茄炒蛋',
          summary: '家常快手菜',
          cook_time: '10 分钟',
          detailStatus: 'idle',
        }],
        ingredients: ['番茄'],
        dateLabel: '七月十九',
        width: 500,
        height: 400,
      })
    })

    expect(select).toHaveBeenCalledWith('#shareCanvas')
    expect(fields).toHaveBeenCalledWith({ node: true, size: true })
    expect(canvas.width).toBe(1000)
    expect(canvas.height).toBe(800)
    expect(ctx.scale).toHaveBeenCalledWith(2, 2)
    expect(mockCanvasToTempFilePath).toHaveBeenCalledWith(expect.objectContaining({
      canvas,
      width: 1000,
      height: 800,
      destWidth: 1000,
      destHeight: 800,
      success: expect.any(Function),
      fail: expect.any(Function),
    }))

    const appShare = latestShareCallback(mockUseShareAppMessage)
    const timelineShare = latestShareCallback(mockUseShareTimeline)
    expect(appShare()).toEqual(expect.objectContaining({
      imageUrl: '/tmp/share-card.png',
    }))
    expect(timelineShare()).toEqual(expect.objectContaining({
      imageUrl: '/tmp/share-card.png',
    }))
  })
})
