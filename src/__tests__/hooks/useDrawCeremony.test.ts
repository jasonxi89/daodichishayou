import Taro from '@tarojs/taro'
import { act, renderHook } from '@testing-library/react'
import useDrawCeremony, { type DrawCeremonyOptions } from '../../hooks/useDrawCeremony'

const POOL = ['A菜', 'B菜', 'C菜', 'D菜', 'E菜']
const SHAKE_MS = 2000
const RISE_MS = 500

function setup(overrides: Partial<DrawCeremonyOptions> = {}) {
  const onDone = jest.fn()
  const options: DrawCeremonyOptions = {
    count: 3,
    isBlocked: false,
    getPool: () => POOL,
    onDone,
    ...overrides,
  }
  const view = renderHook(
    (props: DrawCeremonyOptions) => useDrawCeremony(props),
    { initialProps: options },
  )
  return { ...view, onDone }
}

function finishCeremony() {
  act(() => { jest.advanceTimersByTime(SHAKE_MS + RISE_MS) })
}

describe('useDrawCeremony', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('walks idle to shaking to rising to done with unique results', () => {
    const { result, onDone } = setup()

    expect(result.current.phase).toBe('idle')

    act(() => result.current.startDraw())
    expect(result.current.phase).toBe('shaking')

    act(() => { jest.advanceTimersByTime(SHAKE_MS) })
    expect(result.current.phase).toBe('rising')

    act(() => { jest.advanceTimersByTime(RISE_MS) })
    expect(result.current.phase).toBe('done')

    expect(onDone).toHaveBeenCalledTimes(1)
    const results = onDone.mock.calls[0][0] as string[]
    expect(results).toHaveLength(3)
    expect(new Set(results).size).toBe(3)
    results.forEach(name => expect(POOL).toContain(name))
    expect(result.current.results).toEqual(results)
    expect(result.current.mainResult).toBe(results[0])
  })

  it('caps the result count at the pool size', () => {
    const pool = ['A菜', 'B菜']
    const { result, onDone } = setup({ count: 5, getPool: () => pool })

    act(() => result.current.startDraw())
    finishCeremony()

    expect(result.current.phase).toBe('done')
    expect(onDone).toHaveBeenCalledTimes(1)
    const drawn = onDone.mock.calls[0][0] as string[]
    expect(drawn).toHaveLength(pool.length)
    expect(new Set(drawn).size).toBe(pool.length)
    expect(drawn).toEqual(expect.arrayContaining(pool))
    expect(result.current.results).toEqual(drawn)
  })

  it('skip finishes immediately and fires onDone once', () => {
    const { result, onDone } = setup()

    act(() => result.current.startDraw())
    act(() => { jest.advanceTimersByTime(300) })
    act(() => result.current.skip())

    expect(result.current.phase).toBe('done')
    expect(onDone).toHaveBeenCalledTimes(1)

    act(() => { jest.advanceTimersByTime(5000) })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('ignores startDraw while blocked', () => {
    const { result, onDone } = setup({ isBlocked: true })

    act(() => result.current.startDraw())

    expect(result.current.phase).toBe('idle')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('ignores a second startDraw during the ceremony', () => {
    const { result, onDone } = setup()

    act(() => result.current.startDraw())
    act(() => { jest.advanceTimersByTime(300) })
    act(() => result.current.startDraw())
    finishCeremony()

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('toasts and stays idle when the pool is empty', () => {
    const showToast = Taro.showToast as jest.Mock
    const { result, onDone } = setup({ getPool: () => [] })

    act(() => result.current.startDraw())

    expect(result.current.phase).toBe('idle')
    expect(onDone).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '该分类正在加载中，请稍后' }),
    )
  })

  it('refreshItem swaps one dish without duplicating the others', () => {
    const { result } = setup()

    act(() => result.current.startDraw())
    finishCeremony()

    const before = [...result.current.results]
    let replacement: string | null = null
    act(() => { replacement = result.current.refreshItem(1) })

    expect(replacement).not.toBeNull()
    expect(replacement).not.toBe(before[1])
    expect(result.current.results[1]).toBe(replacement)
    expect(new Set(result.current.results).size).toBe(result.current.results.length)
  })

  it('refreshItem returns null when the pool has no spare dish', () => {
    const { result } = setup({ count: 2, getPool: () => ['A菜', 'B菜'] })

    act(() => result.current.startDraw())
    finishCeremony()

    let replacement: string | null = '占位'
    act(() => { replacement = result.current.refreshItem(0) })

    expect(replacement).toBeNull()
  })

  it('reset returns to idle and allows a fresh ceremony', () => {
    const { result, onDone } = setup()

    act(() => result.current.startDraw())
    finishCeremony()
    act(() => result.current.reset())

    expect(result.current.phase).toBe('idle')
    expect(result.current.results).toEqual([])
    expect(result.current.mainResult).toBe('')

    act(() => result.current.startDraw())
    finishCeremony()
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('stays idle for an invalid count instead of hanging mid-phase', () => {
    const invalid = [0, -1, 2.5, Number.NaN]

    invalid.forEach(count => {
      const { result, onDone, unmount } = setup({ count })

      act(() => result.current.startDraw())

      expect(result.current.phase).toBe('idle')
      expect(jest.getTimerCount()).toBe(0)

      finishCeremony()
      expect(result.current.phase).toBe('idle')
      expect(onDone).not.toHaveBeenCalled()
      unmount()
    })
  })

  it('deduplicates a pool that repeats the same dish', () => {
    const { result, onDone } = setup({
      count: 3,
      getPool: () => ['A菜', 'A菜', 'B菜'],
    })

    act(() => result.current.startDraw())
    finishCeremony()

    const drawn = onDone.mock.calls[0][0] as string[]
    expect(drawn).toHaveLength(2)
    expect(new Set(drawn).size).toBe(2)
    expect(result.current.results).toEqual(drawn)
  })

  it('keeps results unique when two refreshes batch in one act', () => {
    const { result } = setup({ count: 2, getPool: () => ['A菜', 'B菜', 'C菜'] })

    act(() => result.current.startDraw())
    finishCeremony()

    act(() => {
      result.current.refreshItem(0)
      result.current.refreshItem(1)
    })

    expect(result.current.results).toHaveLength(2)
    expect(new Set(result.current.results).size).toBe(2)
  })

  it('ignores a duplicate startDraw batched in the same act', () => {
    const getPool = jest.fn(() => ['A菜', 'B菜', 'C菜'])
    const { result, onDone } = setup({ getPool })

    act(() => {
      result.current.startDraw()
      result.current.startDraw()
    })

    expect(getPool).toHaveBeenCalledTimes(1)
    finishCeremony()
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('skip works when batched right after startDraw', () => {
    const { result, onDone } = setup()

    act(() => {
      result.current.startDraw()
      result.current.skip()
    })

    expect(result.current.phase).toBe('done')
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('clears timers on unmount and never completes afterwards', () => {
    const { result, unmount, onDone } = setup()

    act(() => result.current.startDraw())
    act(() => { jest.advanceTimersByTime(300) })
    unmount()

    expect(jest.getTimerCount()).toBe(0)

    act(() => { jest.advanceTimersByTime(5000) })
    expect(onDone).not.toHaveBeenCalled()
  })
})
