const MONTHS = [
  '一', '二', '三', '四', '五', '六',
  '七', '八', '九', '十', '十一', '十二',
]
const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function chineseDay(day: number): string {
  if (day <= 10) return day === 10 ? '十' : DIGITS[day]
  if (day < 20) return `十${DIGITS[day - 10]}`
  if (day === 20) return '二十'
  if (day < 30) return `二十${DIGITS[day - 20]}`
  return day === 30 ? '三十' : '三十一'
}

export function getMealPeriod(hour: number): string {
  if (hour >= 17) return '晚膳时分'
  if (hour >= 11 && hour <= 14) return '午膳时分'
  return '点心时分'
}

export function getDateShort(date = new Date()): string {
  const month = MONTHS[date.getMonth()] ?? String(date.getMonth() + 1)
  return `${month}月${chineseDay(date.getDate())}`
}

export function getDateLine(date = new Date()): string {
  return `${getDateShort(date)} · ${getMealPeriod(date.getHours())}`
}
