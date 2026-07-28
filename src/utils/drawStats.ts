import Taro from '@tarojs/taro'

const TOTAL_KEY = 'drawCountTotal'
const LAST_RESULT_KEY = 'lastDrawResult'
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

// The committed draw result carries its own drawIndex, so a lost count write
// can be reconciled instead of handing out a duplicate index next time.
function committedDrawIndex(): number {
  try {
    const stored = Taro.getStorageSync(LAST_RESULT_KEY) as { drawIndex?: unknown } | undefined
    return validCount(stored?.drawIndex)
  } catch {
    return 0
  }
}

export function getDrawCount(): number {
  let persisted = 0
  try {
    persisted = validCount(Taro.getStorageSync(TOTAL_KEY))
  } catch {
    persisted = 0
  }
  return Math.max(persisted, committedDrawIndex())
}

// Explicit value write: callers that already know the committed index
// must not re-read a possibly stale stored count.
export function setDrawCount(value: number): void {
  Taro.setStorageSync(TOTAL_KEY, validCount(value))
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
