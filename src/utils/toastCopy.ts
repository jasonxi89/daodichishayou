export const CHEF_ERROR = '厨房走神了，再试一次'
export const EMPTY_MENU = '这道菜单还空着，先添两样吧'

export function getCategoryGenerationError(category: string): string {
  return `「${category}」这一味没备下，再试一次`
}
