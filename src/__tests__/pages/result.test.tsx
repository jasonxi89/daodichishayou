import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

jest.mock('../../data/recipes', () => ({
  __esModule: true,
  getLocalRecipe: jest.fn().mockReturnValue(null),
  fetchRecipeFromAPI: jest.fn().mockResolvedValue(null),
  default: {},
}))

const mockGetStorageSync = taroMock.getStorageSync as jest.Mock
const mockSetStorageSync = taroMock.setStorageSync as jest.Mock
const mockNavigateBack = taroMock.navigateBack as jest.Mock
const mockShowToast = taroMock.showToast as jest.Mock
const mockUseLoad = taroMock.useLoad as jest.Mock
const mockEventCenter = taroMock.eventCenter as unknown as { trigger: jest.Mock }

const DRAW = {
  foods: ['红烧肉', '清炒西兰花', '番茄蛋汤'],
  category: '家常下饭',
  servings: 3,
  pool: ['红烧肉', '清炒西兰花', '番茄蛋汤', '糖醋排骨', '蒜蓉生菜'],
  drawIndex: 128,
  ts: 1700000000000,
}

function loadResultPage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../pages/result/result').default as React.ComponentType
}

function mountResult(draw: unknown = DRAW) {
  mockGetStorageSync.mockImplementation((key: string) => {
    if (key === 'lastDrawResult') return draw
    if (key === 'drawCountWeekly') return undefined
    return {}
  })
  // Taro invokes useLoad once per page instance; emulate that, not per render.
  mockUseLoad.mockImplementationOnce((cb: () => void) => cb())
  const ResultPage = loadResultPage()
  return render(<ResultPage />)
}

describe('Result page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders one row per dish with Chinese ordinals', () => {
    mountResult()

    expect(screen.getByText('红烧肉')).toBeInTheDocument()
    expect(screen.getByText('清炒西兰花')).toBeInTheDocument()
    expect(screen.getByText('番茄蛋汤')).toBeInTheDocument()
    expect(screen.getByText('壹')).toBeInTheDocument()
    expect(screen.getByText('贰')).toBeInTheDocument()
    expect(screen.getByText('叁')).toBeInTheDocument()
  })

  it('marks meat, vegetarian and unknown dishes with distinct chips', () => {
    const { container } = mountResult({ ...DRAW, foods: ['红烧肉', '清炒西兰花', '蘑菇炖兔'] })

    expect(container.querySelectorAll('.dish-chip--meat')).toHaveLength(1)
    expect(container.querySelectorAll('.dish-chip--vegetarian')).toHaveLength(1)
    expect(container.querySelectorAll('.dish-chip--unknown')).toHaveLength(1)
  })

  it('returns home with a toast when the handoff is missing', () => {
    mountResult(null)

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '厨房走神了，再试一次' }),
    )
    expect(mockNavigateBack).toHaveBeenCalled()
  })

  it('counts one weekly draw on entry', () => {
    mountResult()

    const weekly = mockSetStorageSync.mock.calls.find(([key]) => key === 'drawCountWeekly')
    expect(weekly).toBeDefined()
    expect(weekly![1].count).toBe(1)
  })

  it('swaps a single dish without duplicating the others', () => {
    mountResult()

    fireEvent.click(screen.getByRole('button', { name: '换掉清炒西兰花' }))

    expect(screen.queryByText('清炒西兰花')).not.toBeInTheDocument()
    expect(screen.getByText('红烧肉')).toBeInTheDocument()
    expect(screen.getByText('番茄蛋汤')).toBeInTheDocument()
  })

  it('asks the home page to redraw and goes back', () => {
    mountResult()

    fireEvent.click(screen.getByRole('button', { name: '再抽' }))

    expect(mockEventCenter.trigger).toHaveBeenCalledWith('ddcsy:redraw')
    expect(mockNavigateBack).toHaveBeenCalled()
  })

  it('hides the lucky-carp tail below the weekly threshold', () => {
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'lastDrawResult') return DRAW
      if (key === 'drawCountWeekly') return undefined
      return {}
    })
    mountResult()

    expect(screen.getByText(/本周第 1 次听天由命/)).toBeInTheDocument()
    expect(screen.queryByText(/干饭锦鲤/)).not.toBeInTheDocument()
  })

  it('unlocks the lucky-carp tail at the weekly threshold', () => {
    const week = new Date()
    const target = new Date(Date.UTC(week.getUTCFullYear(), week.getUTCMonth(), week.getUTCDate()))
    const day = target.getUTCDay() || 7
    target.setUTCDate(target.getUTCDate() + 4 - day)
    const isoYear = target.getUTCFullYear()
    const yearStart = new Date(Date.UTC(isoYear, 0, 1))
    const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    const weekKey = `${isoYear}-W${String(weekNo).padStart(2, '0')}`

    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'lastDrawResult') return DRAW
      if (key === 'drawCountWeekly') return { weekKey, count: 4 }
      return {}
    })
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())
    const ResultPage = loadResultPage()
    render(<ResultPage />)

    expect(screen.getByText(/本周第 5 次听天由命 · 已解锁「干饭锦鲤」/)).toBeInTheDocument()
  })

  it('keeps many dishes inside a scrollable card', () => {
    const many = ['红烧肉', '清炒西兰花', '番茄蛋汤', '糖醋排骨', '蒜蓉生菜']
    const { container } = mountResult({ ...DRAW, foods: many, servings: many.length })

    expect(container.querySelectorAll('.dish-row')).toHaveLength(5)
    expect(container.querySelector('.dish-list')).toBeInTheDocument()
  })
})
