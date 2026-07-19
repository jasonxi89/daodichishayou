export const COMMON_INGREDIENTS: Record<string, string[]> = {
  '蔬菜': ['番茄', '土豆', '白菜', '青椒', '黄瓜', '茄子', '西兰花', '胡萝卜', '菠菜', '洋葱', '蘑菇', '豆芽'],
  '肉类': ['鸡胸肉', '猪肉', '牛肉', '排骨', '五花肉', '鸡翅', '鸡腿', '肉末'],
  '水产蛋奶': ['虾', '鱼', '豆腐', '鸡蛋', '牛奶'],
  '主食': ['米饭', '面条', '馒头', '饺子皮', '面粉'],
}

export const CATEGORIES = Object.keys(COMMON_INGREDIENTS)
export const PREFERENCES = ['不限', '清淡', '家常', '快手菜', '下饭菜', '减脂']
export const LOADING_MESSAGES = [
  '正在翻 2 万本菜谱...',
  '大厨思考中...',
  '快好了快好了...',
]

export function makePrefetchKey(
  ingredients: string[],
  preference: string,
  allowExtra: boolean,
) {
  return JSON.stringify([
    [...ingredients].sort(),
    preference === '不限' ? null : preference,
    allowExtra,
  ])
}

export function makeQuickPayload(
  ingredients: string[],
  preference: string,
  allowExtra: boolean,
  excludeDishes?: string[],
) {
  return {
    ingredients,
    count: 3,
    preferences: preference === '不限' ? null : preference,
    allow_extra: allowExtra,
    ...(excludeDishes ? { exclude_dishes: excludeDishes } : {}),
  }
}
