import { getDateLine, getMealPeriod } from '../../utils/dateLabel'

describe('dateLabel', () => {
  it.each([
    [10, '点心时分'],
    [11, '午膳时分'],
    [14, '午膳时分'],
    [15, '点心时分'],
    [17, '晚膳时分'],
  ])('maps hour %i to %s', (hour, expected) => {
    expect(getMealPeriod(hour)).toBe(expected)
  })

  it('renders the approved Chinese month, day and meal period', () => {
    expect(getDateLine(new Date(2026, 6, 19, 18))).toBe('七月十九 · 晚膳时分')
    expect(getDateLine(new Date(2026, 9, 31, 12))).toBe('十月三十一 · 午膳时分')
  })
})
