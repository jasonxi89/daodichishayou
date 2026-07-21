import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

jest.mock('../../data/recipes', () => ({
  __esModule: true,
  getLocalRecipe: jest.fn().mockReturnValue(null),
  fetchRecipeFromAPI: jest.fn().mockResolvedValue(null),
  default: {},
}))

jest.mock('../../services/api', () => ({
  __esModule: true,
  fetchTrending: jest.fn().mockResolvedValue({ total: 0, items: [] }),
  fetchCategories: jest.fn().mockResolvedValue([]),
  generateFoodsByCategory: jest.fn().mockResolvedValue({ foods: [], category: '' }),
  bulkGenerateFoodsByCategory: jest.fn().mockResolvedValue({ results: {} }),
  fetchDigest: jest.fn().mockResolvedValue(null),
}))

const mockGetStorageSync = taroMock.getStorageSync as jest.Mock
const mockSetStorageSync = taroMock.setStorageSync as jest.Mock

function loadIndexPage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../pages/index/index').default as React.ComponentType
}

describe('Index hybrid-theme layout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'drawCountTotal') return 4
      return {}
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the custom navigation, date line and approved hero copy', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    expect(screen.getByText('到底吃啥哟')).toHaveClass('custom-navigation__title')
    expect(screen.getByText('今日一问')).toBeInTheDocument()
    expect(screen.getByText('今晚食何')).toBeInTheDocument()
    expect(screen.getByText('三十道候选 · 把纠结交给大厨')).toBeInTheDocument()
    expect(screen.getByText(/月.+ · .+时分/)).toBeInTheDocument()
    expect(screen.getByText('第 4 次帮你定夺')).toBeInTheDocument()
  })

  it('renders MenuGrid, Chinese CountStepper and the decree CTA', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    expect(screen.getByText('菜单 · 择一挂')).toBeInTheDocument()
    expect(screen.getByText('MENU')).toBeInTheDocument()
    expect(screen.getByText('壹')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '为我定夺' })).toBeInTheDocument()
  })

  it('keeps the decree label on one line', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    expect(screen.getByRole('button', { name: '为我定夺' })).toHaveClass('decree-btn')
    expect(screen.getByText('为我定夺')).toHaveClass('decree-btn__label')
  })

  it('uses the single-screen result layout for three results', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))
    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))
    fireEvent.click(screen.getByRole('button', { name: '为我定夺' }))
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(document.querySelector('.index')).toHaveClass('index--single-screen')
    expect(document.querySelector('.index')).toHaveClass('index--has-result')
  })

  it('increments draw count only when a draw actually starts', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    const decree = screen.getByRole('button', { name: '为我定夺' })

    fireEvent.click(decree)
    fireEvent.click(screen.getByRole('button', { name: '正在定夺' }))

    expect(mockSetStorageSync).toHaveBeenCalledTimes(1)
    expect(mockSetStorageSync).toHaveBeenCalledWith('drawCountTotal', 5)
    expect(screen.getByText('第 5 次帮你定夺')).toBeInTheDocument()
  })
})
