const DEFAULT_EMOJI = String.fromCodePoint(0x1f37d)

// Keyword to emoji. Longest keyword wins so specific dishes beat generic ones.
interface EmojiRule {
  keyword: string
  emoji: string
  // Dish form beats raw ingredient when both keywords are the same length.
  tiePriority: number
}

const DISH_FORM = 2
const INGREDIENT = 1

const EMOJI_KEYWORDS: EmojiRule[] = [
  { keyword: '珍珠奶茶', emoji: String.fromCodePoint(0x1f9cb), tiePriority: DISH_FORM },
  { keyword: '奶茶', emoji: String.fromCodePoint(0x1f9cb), tiePriority: DISH_FORM },
  { keyword: '咖啡', emoji: String.fromCodePoint(0x2615), tiePriority: DISH_FORM },
  { keyword: '拿铁', emoji: String.fromCodePoint(0x2615), tiePriority: DISH_FORM },
  { keyword: '茶', emoji: String.fromCodePoint(0x1f375), tiePriority: INGREDIENT },
  { keyword: '饺子', emoji: String.fromCodePoint(0x1f95f), tiePriority: DISH_FORM },
  { keyword: '馄饨', emoji: String.fromCodePoint(0x1f95f), tiePriority: DISH_FORM },
  { keyword: '包子', emoji: String.fromCodePoint(0x1f95f), tiePriority: DISH_FORM },
  { keyword: '炒饭', emoji: String.fromCodePoint(0x1f35a), tiePriority: DISH_FORM },
  { keyword: '米线', emoji: String.fromCodePoint(0x1f35c), tiePriority: DISH_FORM },
  { keyword: '面包', emoji: String.fromCodePoint(0x1f956), tiePriority: DISH_FORM },
  { keyword: '面', emoji: String.fromCodePoint(0x1f35c), tiePriority: DISH_FORM },
  { keyword: '粉', emoji: String.fromCodePoint(0x1f35c), tiePriority: DISH_FORM },
  { keyword: '麻辣烫', emoji: String.fromCodePoint(0x1f372), tiePriority: DISH_FORM },
  { keyword: '火锅', emoji: String.fromCodePoint(0x1f372), tiePriority: DISH_FORM },
  { keyword: '冒菜', emoji: String.fromCodePoint(0x1f372), tiePriority: DISH_FORM },
  { keyword: '汤', emoji: String.fromCodePoint(0x1f372), tiePriority: DISH_FORM },
  { keyword: '粥', emoji: String.fromCodePoint(0x1f372), tiePriority: DISH_FORM },
  { keyword: '烧烤', emoji: String.fromCodePoint(0x1f362), tiePriority: DISH_FORM },
  { keyword: '串', emoji: String.fromCodePoint(0x1f362), tiePriority: DISH_FORM },
  { keyword: '炸鸡', emoji: String.fromCodePoint(0x1f357), tiePriority: DISH_FORM },
  { keyword: '鸡翅', emoji: String.fromCodePoint(0x1f357), tiePriority: DISH_FORM },
  { keyword: '鸡腿', emoji: String.fromCodePoint(0x1f357), tiePriority: DISH_FORM },
  { keyword: '鸡', emoji: String.fromCodePoint(0x1f357), tiePriority: INGREDIENT },
  { keyword: '鸭', emoji: String.fromCodePoint(0x1f357), tiePriority: INGREDIENT },
  { keyword: '鹅', emoji: String.fromCodePoint(0x1f357), tiePriority: INGREDIENT },
  { keyword: '牛排', emoji: String.fromCodePoint(0x1f969), tiePriority: INGREDIENT },
  { keyword: '牛肉', emoji: String.fromCodePoint(0x1f969), tiePriority: INGREDIENT },
  { keyword: '五花肉', emoji: String.fromCodePoint(0x1f953), tiePriority: INGREDIENT },
  { keyword: '红烧肉', emoji: String.fromCodePoint(0x1f356), tiePriority: INGREDIENT },
  { keyword: '羊肉', emoji: String.fromCodePoint(0x1f356), tiePriority: INGREDIENT },
  { keyword: '排骨', emoji: String.fromCodePoint(0x1f356), tiePriority: INGREDIENT },
  { keyword: '猪肉', emoji: String.fromCodePoint(0x1f356), tiePriority: INGREDIENT },
  { keyword: '肉', emoji: String.fromCodePoint(0x1f356), tiePriority: INGREDIENT },
  { keyword: '鱼', emoji: String.fromCodePoint(0x1f41f), tiePriority: INGREDIENT },
  { keyword: '虾', emoji: String.fromCodePoint(0x1f990), tiePriority: INGREDIENT },
  { keyword: '蟹', emoji: String.fromCodePoint(0x1f980), tiePriority: INGREDIENT },
  { keyword: '贝', emoji: String.fromCodePoint(0x1f9aa), tiePriority: INGREDIENT },
  { keyword: '饭', emoji: String.fromCodePoint(0x1f35a), tiePriority: DISH_FORM },
  { keyword: '寿司', emoji: String.fromCodePoint(0x1f363), tiePriority: DISH_FORM },
  { keyword: '披萨', emoji: String.fromCodePoint(0x1f355), tiePriority: DISH_FORM },
  { keyword: '汉堡', emoji: String.fromCodePoint(0x1f354), tiePriority: DISH_FORM },
  { keyword: '薄饼', emoji: String.fromCodePoint(0x1f32e), tiePriority: DISH_FORM },
  { keyword: '蛋糕', emoji: String.fromCodePoint(0x1f370), tiePriority: DISH_FORM },
  { keyword: '甜品', emoji: String.fromCodePoint(0x1f370), tiePriority: DISH_FORM },
  { keyword: '布丁', emoji: String.fromCodePoint(0x1f36e), tiePriority: DISH_FORM },
  { keyword: '冰淇淋', emoji: String.fromCodePoint(0x1f368), tiePriority: DISH_FORM },
  { keyword: '蛋', emoji: String.fromCodePoint(0x1f373), tiePriority: INGREDIENT },
  { keyword: '豆腐', emoji: String.fromCodePoint(0x1f371), tiePriority: INGREDIENT },
  { keyword: '沙拉', emoji: String.fromCodePoint(0x1f957), tiePriority: DISH_FORM },
  { keyword: '西兰花', emoji: String.fromCodePoint(0x1f966), tiePriority: INGREDIENT },
  { keyword: '黄瓜', emoji: String.fromCodePoint(0x1f952), tiePriority: INGREDIENT },
  { keyword: '土豆', emoji: String.fromCodePoint(0x1f954), tiePriority: INGREDIENT },
  { keyword: '番茄', emoji: String.fromCodePoint(0x1f345), tiePriority: INGREDIENT },
  { keyword: '玉米', emoji: String.fromCodePoint(0x1f33d), tiePriority: INGREDIENT },
  { keyword: '蘑菇', emoji: String.fromCodePoint(0x1f344), tiePriority: INGREDIENT },
]

export type ProteinClassification = 'animal-protein' | 'vegetarian' | 'unknown'

// Imitation-meat and explicit vegetarian markers win over animal keywords.
const VEGETARIAN_MARKERS: string[] = [
  '素鸡', '素鸭', '素肉', '素丸', '植物肉', '人造肉', '仿荤',
  '鸡腿菇', '鸡枞', '猴头菇', '肉桂',
  '全素', '斋菜', '素炒', '素食',
]

const PLANT_ONLY_KEYWORDS: string[] = [
  '西兰花', '黄瓜', '土豆', '番茄', '玉米', '蘑菇', '青菜',
  '白菜', '菠菜', '豆腐', '茄子', '南瓜', '萝卜', '沙拉',
]

const ANIMAL_KEYWORDS: string[] = [
  '肉', '鸡', '鸭', '鹅', '牛', '猪', '羊',
  '鱼', '虾', '蟹', '贝', '蛋', '排骨',
  '培根', '火腿', '腊', '鱿', '蛤蜊',
  '香肠', '五花', '奶油', '芝士', '乳酪', '黄油',
]

// Total ordering: longer keyword first, then dish form over ingredient,
// then declaration order. Never relies on Array.prototype.sort stability.
const SORTED_KEYWORDS = EMOJI_KEYWORDS
  .map((rule, ordinal) => ({ ...rule, ordinal }))
  .sort(
    (left, right) =>
      right.keyword.length - left.keyword.length
      || right.tiePriority - left.tiePriority
      || left.ordinal - right.ordinal,
  )

function includesAny(name: string, keywords: string[]): boolean {
  return keywords.some(keyword => name.includes(keyword))
}

export function getFoodEmoji(name: string): string {
  if (!name) return DEFAULT_EMOJI
  const match = SORTED_KEYWORDS.find(rule => name.includes(rule.keyword))
  return match ? match.emoji : DEFAULT_EMOJI
}

// Three states on purpose: "not matched as meat" is not proof of vegetarian.
export function classifyProtein(name: string): ProteinClassification {
  if (!name) return 'unknown'
  if (includesAny(name, VEGETARIAN_MARKERS)) return 'vegetarian'
  if (includesAny(name, ANIMAL_KEYWORDS)) return 'animal-protein'
  if (includesAny(name, PLANT_ONLY_KEYWORDS)) return 'vegetarian'
  return 'unknown'
}

export function isMeatDish(name: string): boolean {
  return classifyProtein(name) === 'animal-protein'
}
