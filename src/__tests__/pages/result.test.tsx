import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

jest.mock('../../data/recipes', () => ({
  __esModule: true,
  getLocalRecipe: jest.fn().mockReturnValue(null),
  fetchRecipeFromAPI: jest.fn().mockResolvedValue(null),
  default: {},
}))

// The ISO week key belongs to drawStats and is tested there; the page only
// renders whatever count it is handed.
jest.mock('../../utils/drawStats', () => ({
  __esModule: true,
  incrementWeeklyDrawCount: jest.fn(() => 1),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockIncrementWeekly = require('../../utils/drawStats').incrementWeeklyDrawCount as jest.Mock

const mockGetStorageSync = taroMock.getStorageSync as jest.Mock
const mockNavigateBack = taroMock.navigateBack as jest.Mock
const mockReLaunch = taroMock.reLaunch as jest.Mock
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

  // Spies must not survive a failing assertion and poison later tests.
  afterEach(() => {
    jest.restoreAllMocks()
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

  it('relaunches home when there is no page to go back to', () => {
    // Scoped to this test: clearAllMocks keeps implementations, resetting is explicit.
    mockNavigateBack.mockImplementationOnce((opts?: { fail?: () => void }) => opts?.fail?.())

    mountResult(null)

    expect(mockReLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/index/index' }),
    )
  })

  const MALFORMED: [string, unknown][] = [
    ['pool is not an array', { ...DRAW, pool: {} }],
    ['pool holds non-strings', { ...DRAW, pool: [1, 2, 3] }],
    ['foods hold non-strings', { ...DRAW, foods: [1, 2, 3] }],
    ['foods are empty', { ...DRAW, foods: [] }],
    ['ts is not finite', { ...DRAW, ts: NaN }],
    ['drawIndex is fractional', { ...DRAW, drawIndex: 1.5 }],
  ]

  it.each(MALFORMED)('rejects a stored draw where %s', (_label, payload) => {
    mountResult(payload)

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '厨房走神了，再试一次' }),
    )
    expect(mockNavigateBack).toHaveBeenCalled()
    // A rejected payload is not a draw, so it must never be counted.
    expect(mockIncrementWeekly).not.toHaveBeenCalled()
  })

  it('counts exactly one weekly draw on entry', () => {
    mountResult()

    expect(mockIncrementWeekly).toHaveBeenCalledTimes(1)
  })

  it('counts the draw once even if the host replays the load callback', () => {
    let loadCallback: (() => void) | undefined
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'lastDrawResult') return DRAW
      return {}
    })
    mockUseLoad.mockImplementationOnce((cb: () => void) => {
      loadCallback = cb
      cb()
    })
    const ResultPage = loadResultPage()
    render(<ResultPage />)

    act(() => { loadCallback?.() })

    expect(mockIncrementWeekly).toHaveBeenCalledTimes(1)
  })

  it('swaps one slot with a pool dish and leaves the rest untouched', () => {
    // Deterministic pick: first candidate not already on the menu.
    const random = jest.spyOn(Math, 'random').mockReturnValue(0)
    const { container } = mountResult()

    fireEvent.click(screen.getByRole('button', { name: '换掉清炒西兰花' }))

    const names = Array.from(container.querySelectorAll('.dish-row__name')).map(n => n.textContent)
    expect(names).toEqual(['红烧肉', '糖醋排骨', '番茄蛋汤'])
    expect(new Set(names).size).toBe(names.length)
    names.forEach(name => expect(DRAW.pool).toContain(name))
    expect(container.querySelectorAll('.dish-row')).toHaveLength(3)

    random.mockRestore()
  })

  it('keeps the menu intact when the pool is exhausted', () => {
    const { container } = mountResult({ ...DRAW, pool: DRAW.foods })

    fireEvent.click(screen.getByRole('button', { name: '换掉清炒西兰花' }))

    const names = Array.from(container.querySelectorAll('.dish-row__name')).map(n => n.textContent)
    expect(names).toEqual(DRAW.foods)
  })

  it('disables every swap button when no replacement exists', () => {
    mountResult({ ...DRAW, pool: DRAW.foods })

    DRAW.foods.forEach(food => {
      expect(screen.getByRole('button', { name: `换掉${food}` })).toBeDisabled()
    })
  })

  it('still swaps in a real dish when the pool has duplicate entries', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0)
    const { container } = mountResult({
      ...DRAW,
      pool: ['红烧肉', '红烧肉', '清炒西兰花', '番茄蛋汤', '糖醋排骨'],
    })

    fireEvent.click(screen.getByRole('button', { name: '换掉清炒西兰花' }))

    const names = Array.from(container.querySelectorAll('.dish-row__name')).map(n => n.textContent)
    // Dedup must not degrade into a no-op: the only spare dish has to land.
    expect(names).toEqual(['红烧肉', '糖醋排骨', '番茄蛋汤'])
    expect(screen.queryByText('清炒西兰花')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.dish-row')).toHaveLength(3)
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
    // Presentation only: the ISO week key is the util's job, tested there.
    mockIncrementWeekly.mockReturnValueOnce(5)
    mountResult()

    expect(screen.getByText(/本周第 5 次听天由命 · 已解锁「干饭锦鲤」/)).toBeInTheDocument()
  })

  it('renders every dish inside a vertically scrollable dish-list', () => {
    const many = ['红烧肉', '清炒西兰花', '番茄蛋汤', '糖醋排骨', '蒜蓉生菜']
    const { container } = mountResult({ ...DRAW, foods: many, servings: many.length })

    expect(container.querySelectorAll('.dish-row')).toHaveLength(5)
    // jsdom cannot prove scrolling; assert the ScrollView opted into vertical scroll.
    const list = container.querySelector('.dish-list')
    expect(list).toBeInTheDocument()
    expect(list).toHaveAttribute('scroll-y')
  })
})
