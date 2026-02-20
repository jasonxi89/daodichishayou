import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'
import CustomTabBar from '../../custom-tab-bar/index'

const mockSwitchTab = taroMock.switchTab as jest.Mock
const mockGetCurrentPages = taroMock.getCurrentPages as jest.Mock
const mockUseDidShow = taroMock.useDidShow as jest.Mock

describe('CustomTabBar – rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/index/index' }])
  })

  it('renders without crashing', () => {
    expect(() => render(<CustomTabBar />)).not.toThrow()
  })

  it('renders both tab labels', () => {
    render(<CustomTabBar />)
    expect(screen.getByText('抽啥吃啥')).toBeInTheDocument()
    expect(screen.getByText('有啥做啥')).toBeInTheDocument()
  })

  it('renders two images for tab icons', () => {
    const { container } = render(<CustomTabBar />)
    const images = container.querySelectorAll('img')
    expect(images.length).toBe(2)
  })

  it('renders a divider element between tabs', () => {
    const { container } = render(<CustomTabBar />)
    const bar = container.firstChild
    expect(bar?.childNodes.length).toBe(3) // tab, divider, tab
  })
})

describe('CustomTabBar – tab switching', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/index/index' }])
  })

  it('calls switchTab when clicking the other tab', () => {
    render(<CustomTabBar />)
    fireEvent.click(screen.getByText('有啥做啥'))
    expect(mockSwitchTab).toHaveBeenCalledWith({ url: '/pages/ingredient/ingredient' })
  })

  it('does not call switchTab when clicking the active tab', () => {
    render(<CustomTabBar />)
    fireEvent.click(screen.getByText('抽啥吃啥'))
    expect(mockSwitchTab).not.toHaveBeenCalled()
  })
})

describe('CustomTabBar – page detection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets active to 1 when on ingredient page', () => {
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/ingredient/ingredient' }])
    render(<CustomTabBar />)
    const ingredientText = screen.getByText('有啥做啥')
    expect(ingredientText.style.color).toMatch(/(#f5a623|rgb\(245, 166, 35\))/)
  })

  it('sets active to 0 when on index page', () => {
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/index/index' }])
    render(<CustomTabBar />)
    const homeText = screen.getByText('抽啥吃啥')
    expect(homeText.style.color).toMatch(/(#f5a623|rgb\(245, 166, 35\))/)
  })

  it('registers eventCenter listener on mount', () => {
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/index/index' }])
    render(<CustomTabBar />)
    expect((taroMock as any).eventCenter.on).toHaveBeenCalledWith('switchTab', expect.any(Function))
  })
})
