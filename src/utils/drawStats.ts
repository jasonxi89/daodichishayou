import Taro from '@tarojs/taro'

const TOTAL_KEY = 'drawCountTotal'
const WEEKLY_KEY = 'drawCountWeekly'

interface WeeklyDrawCount {
  weekKey: string
  count: number
}

function validCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0
}

function isoWeekKey(date: Date): string {
  const target = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const isoYear = target.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  )
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export function getDrawCount(): number {
  try {
    return validCount(Taro.getStorageSync(TOTAL_KEY))
  } catch {
    return 0
  }
}

export function incrementDrawCount(): number {
  const next = getDrawCount() + 1
  Taro.setStorageSync(TOTAL_KEY, next)
  return next
}

export function getWeeklyDrawCount(date = new Date()): number {
  try {
    const stored = Taro.getStorageSync(WEEKLY_KEY) as WeeklyDrawCount | undefined
    if (!stored || stored.weekKey !== isoWeekKey(date)) return 0
    return validCount(stored.count)
  } catch {
    return 0
  }
}

export function incrementWeeklyDrawCount(date = new Date()): number {
  const next = getWeeklyDrawCount(date) + 1
  Taro.setStorageSync(WEEKLY_KEY, { weekKey: isoWeekKey(date), count: next })
  return next
}
