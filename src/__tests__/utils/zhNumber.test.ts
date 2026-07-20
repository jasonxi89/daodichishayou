import { toZhNumber } from '../../utils/zhNumber'

describe('toZhNumber', () => {
  it.each([
    [1, '壹'],
    [2, '贰'],
    [9, '玖'],
    [10, '拾'],
  ])('renders %i as %s', (value, expected) => {
    expect(toZhNumber(value)).toBe(expected)
  })

  it.each([0, -1, 11, 99])('falls back for out-of-range value %i', value => {
    expect(toZhNumber(value)).toBe(String(value))
  })
})
