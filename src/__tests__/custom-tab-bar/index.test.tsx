import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

// Mock image imports
jest.mock('../../assets/tab-home.png', () => 'tab-home.png')
jest.mock('../../assets/tab-home-active.png', () => 'tab-home-active.png')
jest.mock('../../assets/tab-ingredient.png', () => 'tab-ingredient.png')
jest.mock('../../assets/tab-ingredient-active.png', () => 'tab-ingredient-active.png')

const mockSwitchTab = taroMock.switchTab as jest.Mock
const mockGetCurrentPages = taroMock.getCurrentPages as jest.Mock
const mockUseDidShow = taroMock.useDidShow as jest.Mock

function loadTabBar() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: CustomTabBar } = require('../../custom-tab-bar/index')
  return CustomTabBar as React.ComponentType
}

describe('CustomTabBar – rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/index/index' }])
  })

  it('renders without crashing', () => {
    const TabBar = loadTabBar()
    expect(() => render(<TabBar />)).not.toThrow()
  })

  it('renders both tab labels', () => {
    const TabBar = loadTabBar()
    render(<TabBar />)
    expect(screen.getByText('抽啥吃啥')).toBeInTheDocument()
    expect(screen.getByText('有啥做啥')).toBeInTheDocument()
  })

  it('renders two images for tab icons', () => {
    const TabBar = loadTabBar()
    const { container } = render(<TabBar />)
    const images = container.querySelectorAll('img')
    expect(images.length).toBe(2)
  })

  it('renders a divider element between tabs', () => {
    const TabBar = loadTabBar()
    const { container } = render(<TabBar />)
    // The divider is a View with dividerStyle
    // It should be the second child of the bar
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
    const TabBar = loadTabBar()
    render(<TabBar />)

    fireEvent.click(screen.getByText('有啥做啥'))

    expect(mockSwitchTab).toHaveBeenCalledWith({
      url: '/pages/ingredient/ingredient',
    })
  })

  it('does not call switchTab when clicking the active tab', () => {
    const TabBar = loadTabBar()
    render(<TabBar />)

    fireEvent.click(screen.getByText('抽啥吃啥'))

    expect(mockSwitchTab).not.toHaveBeenCalled()
  })
})

describe('CustomTabBar – useDidShow page detection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('registers useDidShow callback', () => {
    const TabBar = loadTabBar()
    render(<TabBar />)
    expect(mockUseDidShow).toHaveBeenCalled()
  })

  it('sets active to 1 when on ingredient page', () => {
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/ingredient/ingredient' }])
    mockUseDidShow.mockImplementationOnce((cb: () => void) => cb())

    const TabBar = loadTabBar()
    render(<TabBar />)

    // The ingredient tab text should have active color (#f5a623)
    const ingredientText = screen.getByText('有啥做啥')
    expect(ingredientText.style.color).toMatch(/(#f5a623|rgb\(245, 166, 35\))/)
  })

  it('sets active to 0 when on index page', () => {
    mockGetCurrentPages.mockReturnValue([{ route: 'pages/index/index' }])
    mockUseDidShow.mockImplementationOnce((cb: () => void) => cb())

    const TabBar = loadTabBar()
    render(<TabBar />)

    const homeText = screen.getByText('抽啥吃啥')
    expect(homeText.style.color).toMatch(/(#f5a623|rgb\(245, 166, 35\))/)
  })
})
