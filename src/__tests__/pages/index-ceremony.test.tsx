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
const mockNavigateTo = taroMock.navigateTo as jest.Mock
const mockEventCenter = taroMock.eventCenter as unknown as {
  on: jest.Mock
  off: jest.Mock
  trigger: jest.Mock
}

function loadIndexPage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../pages/index/index').default as React.ComponentType
}

function startCeremony() {
  fireEvent.click(screen.getByRole('button', { name: '为我定夺' }))
}

function finishCeremony() {
  act(() => { jest.advanceTimersByTime(2500) })
}

describe('Index draw ceremony wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'drawCountTotal') return 7
      return {}
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('enters the ceremony and hides the regular home content', () => {
    const IndexPage = loadIndexPage()
    const { container } = render(<IndexPage />)

    startCeremony()

    expect(container.querySelector('.ceremony')).toBeInTheDocument()
    expect(screen.queryByText('菜单 · 择一挂')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '为我定夺' })).not.toBeInTheDocument()
  })

  it('hands the draw to the result page and returns to idle', () => {
    const IndexPage = loadIndexPage()
    const { container } = render(<IndexPage />)

    startCeremony()
    finishCeremony()

    const handoff = mockSetStorageSync.mock.calls.find(([key]) => key === 'lastDrawResult')
    expect(handoff).toBeDefined()

    const payload = handoff![1]
    expect(Array.isArray(payload.foods)).toBe(true)
    expect(payload.foods.length).toBeGreaterThan(0)
    expect(payload.category).toBe('随便')
    expect(payload.servings).toBe(1)
    expect(Array.isArray(payload.pool)).toBe(true)
    expect(payload.drawIndex).toBe(8)
    expect(typeof payload.ts).toBe('number')

    expect(mockNavigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/result/result' }))
    expect(container.querySelector('.ceremony')).not.toBeInTheDocument()

    // The draw CTA only comes back once navigation confirms success.
    const navigateArgs = mockNavigateTo.mock.calls[0][0]
    act(() => { navigateArgs.success?.() })
    expect(screen.getByRole('button', { name: '为我定夺' })).toBeInTheDocument()
  })

  it('subscribes to the redraw event and cleans up on unmount', () => {
    const IndexPage = loadIndexPage()
    const { unmount } = render(<IndexPage />)

    expect(mockEventCenter.on).toHaveBeenCalledWith('ddcsy:redraw', expect.any(Function))

    const handler = mockEventCenter.on.mock.calls.find(([event]) => event === 'ddcsy:redraw')![1]

    unmount()
    expect(mockEventCenter.off).toHaveBeenCalledWith('ddcsy:redraw', handler)
  })

  it('starts a fresh ceremony when the result page asks for a redraw', () => {
    const IndexPage = loadIndexPage()
    const { container } = render(<IndexPage />)

    const handler = mockEventCenter.on.mock.calls.find(([event]) => event === 'ddcsy:redraw')![1]

    act(() => { handler() })

    expect(container.querySelector('.ceremony')).toBeInTheDocument()

    finishCeremony()
    expect(mockNavigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/result/result' }))
  })

  it('does not keep result state on the home page anymore', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    startCeremony()
    finishCeremony()

    expect(screen.queryByRole('button', { name: '查看菜谱' })).not.toBeInTheDocument()
    expect(screen.getByText('今晚食何')).toBeInTheDocument()
  })
})

describe('Index draw handoff robustness', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'drawCountTotal') return 7
      return {}
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('persists the result before advancing the global draw count', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    startCeremony()
    finishCeremony()

    const keys = mockSetStorageSync.mock.calls.map(([key]) => key)
    expect(keys.indexOf('lastDrawResult')).toBeLessThan(keys.indexOf('drawCountTotal'))
  })

  it('keeps the ceremony recoverable when navigation fails', () => {
    const toast = taroMock.showToast as jest.Mock
    const navigateTo = taroMock.navigateTo as jest.Mock
    navigateTo.mockImplementationOnce(({ fail }: { fail?: (err: unknown) => void }) => {
      fail?.({ errMsg: 'navigateTo:fail page not found' })
    })

    const IndexPage = loadIndexPage()
    const { container } = render(<IndexPage />)

    startCeremony()
    finishCeremony()

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '结果页打开失败，请重试' }),
    )
    expect(container.querySelector('.ceremony')).not.toBeInTheDocument()
    // The saved draw must be reopenable instead of being overwritten by a new one.
    expect(screen.getByRole('button', { name: '重新打开结果' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '为我定夺' })).not.toBeInTheDocument()
  })

  it('only completes once when the tube is tapped and timers still run', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    startCeremony()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '跳过摇签，立即揭晓' }))
    })
    finishCeremony()

    const handoffs = mockSetStorageSync.mock.calls.filter(([key]) => key === 'lastDrawResult')
    const counts = mockSetStorageSync.mock.calls.filter(([key]) => key === 'drawCountTotal')
    expect(handoffs).toHaveLength(1)
    expect(counts).toHaveLength(1)
    expect(mockNavigateTo).toHaveBeenCalledTimes(1)
  })
})

describe('Index draw context and recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'drawCountTotal') return 7
      return {}
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('persists the context frozen at draw time, not at finish time', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))
    startCeremony()

    const handler = mockEventCenter.on.mock.calls.find(([event]) => event === 'ddcsy:redraw')![1]
    act(() => { handler() })

    finishCeremony()

    const handoffs = mockSetStorageSync.mock.calls.filter(([key]) => key === 'lastDrawResult')
    expect(handoffs).toHaveLength(1)
    expect(handoffs[0][1].servings).toBe(2)
    expect(handoffs[0][1].foods).toHaveLength(2)
    expect(handoffs[0][1].category).toBe('随便')
  })

  it('keeps the saved result reachable when the count write fails', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    mockSetStorageSync.mockImplementation((key: string) => {
      if (key === 'drawCountTotal') throw new Error('quota exceeded')
      return undefined
    })

    startCeremony()
    finishCeremony()

    expect(mockNavigateTo).toHaveBeenCalledTimes(1)
    expect(screen.getByText('第 8 次帮你定夺')).toBeInTheDocument()
  })

  it('offers a retry that reopens the same result without drawing again', () => {
    const navigateTo = taroMock.navigateTo as jest.Mock
    navigateTo.mockImplementationOnce(({ fail }: { fail?: (err: unknown) => void }) => {
      fail?.({ errMsg: 'navigateTo:fail' })
    })

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    startCeremony()
    finishCeremony()

    expect(screen.queryByRole('button', { name: '为我定夺' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新打开结果' }))

    expect(navigateTo).toHaveBeenCalledTimes(2)
    expect(mockSetStorageSync.mock.calls.filter(([key]) => key === 'lastDrawResult')).toHaveLength(1)
    expect(mockSetStorageSync.mock.calls.filter(([key]) => key === 'drawCountTotal')).toHaveLength(1)

    act(() => { navigateTo.mock.calls[1][0].success?.() })
    expect(screen.getByRole('button', { name: '为我定夺' })).toBeInTheDocument()
  })
})

describe('Index navigation state machine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'drawCountTotal') return 7
      return {}
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('never exposes a fresh-draw button while navigation is in flight', () => {
    const navigateTo = taroMock.navigateTo as jest.Mock
    navigateTo.mockImplementation(() => undefined)

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    startCeremony()
    finishCeremony()

    expect(navigateTo).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: '为我定夺' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '正在打开结果' })).toBeDisabled()
  })

  it('returns to the draw CTA only after navigation reports success', () => {
    const navigateTo = taroMock.navigateTo as jest.Mock
    let succeed: (() => void) | undefined
    navigateTo.mockImplementation(({ success }: { success?: () => void }) => {
      succeed = success
    })

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    startCeremony()
    finishCeremony()

    expect(screen.queryByRole('button', { name: '为我定夺' })).not.toBeInTheDocument()

    act(() => { succeed?.() })

    expect(screen.getByRole('button', { name: '为我定夺' })).toBeInTheDocument()
  })

  it('does not fire a second navigation while one is pending', () => {
    const navigateTo = taroMock.navigateTo as jest.Mock
    navigateTo.mockImplementation(() => undefined)

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    startCeremony()
    finishCeremony()

    fireEvent.click(screen.getByRole('button', { name: '正在打开结果' }))
    fireEvent.click(screen.getByRole('button', { name: '正在打开结果' }))

    expect(navigateTo).toHaveBeenCalledTimes(1)
  })
})
