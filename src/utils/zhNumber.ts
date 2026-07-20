const ZH_NUMBERS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾']

export function toZhNumber(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > ZH_NUMBERS.length) {
    return String(value)
  }
  return ZH_NUMBERS[value - 1]
}
