import Taro from '@tarojs/taro'
import {
  getDrawCount,
  getWeeklyDrawCount,
  incrementDrawCount,
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
    expect(incrementDrawCount()).toBe(1)
    expect(incrementDrawCount()).toBe(2)
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
