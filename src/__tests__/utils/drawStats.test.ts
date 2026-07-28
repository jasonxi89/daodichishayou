import Taro from '@tarojs/taro'
import {
  commitDrawResult,
  getDrawCount,
  getWeeklyDrawCount,
  incrementWeeklyDrawCount,
} from '../../utils/drawStats'

describe('drawStats', () => {
  let storage: Record<string, unknown>

  beforeEach(() => {
    storage = {}
    jest.spyOn(Taro, 'getStorageSync').mockImplementation(key => storage[key])
    jest.spyOn(Taro, 'setStorageSync').mockImplementation((key, value) => {
      storage[key] = value
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('persists and returns the total draw count', () => {
    expect(getDrawCount()).toBe(0)

    const draw = { foods: ['A菜'], category: '随便', servings: 1, pool: ['A菜'] }
    expect(commitDrawResult(draw)).toBe(1)
    expect(commitDrawResult(draw)).toBe(2)
    expect(getDrawCount()).toBe(2)
  })

  it('sanitizes invalid total count storage', () => {
    storage.drawCountTotal = -4
    expect(getDrawCount()).toBe(0)
  })

  it('persists weekly draws inside one ISO week', () => {
    const monday = new Date('2026-07-20T12:00:00Z')
    const sunday = new Date('2026-07-26T12:00:00Z')

    expect(incrementWeeklyDrawCount(monday)).toBe(1)
    expect(incrementWeeklyDrawCount(sunday)).toBe(2)
    expect(getWeeklyDrawCount(sunday)).toBe(2)
  })

  it('resets weekly draws when ISO week changes', () => {
    expect(incrementWeeklyDrawCount(new Date('2026-07-26T12:00:00Z'))).toBe(1)
    expect(getWeeklyDrawCount(new Date('2026-07-27T12:00:00Z'))).toBe(0)
    expect(incrementWeeklyDrawCount(new Date('2026-07-27T12:00:00Z'))).toBe(1)
  })
})

describe('getDrawCount recovery', () => {
  let storage: Record<string, unknown>

  beforeEach(() => {
    storage = {}
    jest.spyOn(Taro, 'getStorageSync').mockImplementation(key => storage[key])
    jest.spyOn(Taro, 'setStorageSync').mockImplementation((key, value) => {
      storage[key] = value
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('recovers from a committed result when the count write was lost', () => {
    storage.drawCountTotal = 5
    storage.lastDrawResult = { drawIndex: 6 }

    expect(getDrawCount()).toBe(6)
    expect(commitDrawResult({
      foods: ['A菜'],
      category: '随便',
      servings: 1,
      pool: ['A菜'],
    })).toBe(7)
  })

  it('ignores a malformed stored result', () => {
    storage.drawCountTotal = 5
    storage.lastDrawResult = { drawIndex: 'nope' }

    expect(getDrawCount()).toBe(5)
  })

  it('keeps the larger persisted count when the result is older', () => {
    storage.drawCountTotal = 9
    storage.lastDrawResult = { drawIndex: 4 }

    expect(getDrawCount()).toBe(9)
  })
})

describe('commitDrawResult', () => {
  let storage: Record<string, unknown>

  beforeEach(() => {
    storage = { drawCountTotal: 5 }
    jest.spyOn(Taro, 'getStorageSync').mockImplementation(key => storage[key])
    jest.spyOn(Taro, 'setStorageSync').mockImplementation((key, value) => {
      storage[key] = value
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('writes the result first and syncs the count to the same index', () => {
    const order: string[] = []
    ;(Taro.setStorageSync as jest.Mock).mockImplementation((key: string, value: unknown) => {
      order.push(key)
      storage[key] = value
    })

    const index = commitDrawResult({
      foods: ['A菜'],
      category: '随便',
      servings: 1,
      pool: ['A菜', 'B菜'],
    })

    expect(index).toBe(6)
    expect(order).toEqual(['lastDrawResult', 'drawCountTotal'])
    expect(storage.drawCountTotal).toBe(6)
    expect((storage.lastDrawResult as { drawIndex: number }).drawIndex).toBe(6)
    expect(getDrawCount()).toBe(6)
  })

  it('does not skip an index when the count write fails', () => {
    ;(Taro.setStorageSync as jest.Mock).mockImplementation((key: string, value: unknown) => {
      if (key === 'drawCountTotal') throw new Error('quota exceeded')
      storage[key] = value
    })

    const index = commitDrawResult({
      foods: ['A菜'],
      category: '随便',
      servings: 1,
      pool: ['A菜'],
    })

    expect(index).toBe(6)
    expect(storage.drawCountTotal).toBe(5)
    expect(getDrawCount()).toBe(6)
  })

  it('propagates a failed result write so the caller can abort', () => {
    ;(Taro.setStorageSync as jest.Mock).mockImplementation((key: string) => {
      if (key === 'lastDrawResult') throw new Error('quota exceeded')
    })

    expect(() => commitDrawResult({
      foods: ['A菜'],
      category: '随便',
      servings: 1,
      pool: ['A菜'],
    })).toThrow()
  })
})
