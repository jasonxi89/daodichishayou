const DEFAULT_EMOJI = String.fromCodePoint(0x1f37d)

// Keyword to emoji. Longest keyword wins so specific dishes beat generic ones.
const EMOJI_KEYWORDS: Array<[string, string]> = [
  ['珍珠奶茶', String.fromCodePoint(0x1f9cb)],
  ['奶茶', String.fromCodePoint(0x1f9cb)],
  ['咖啡', String.fromCodePoint(0x2615)],
  ['拿铁', String.fromCodePoint(0x2615)],
  ['茶', String.fromCodePoint(0x1f375)],
  ['饺子', String.fromCodePoint(0x1f95f)],
  ['馄饨', String.fromCodePoint(0x1f95f)],
  ['包子', String.fromCodePoint(0x1f95f)],
  ['炒饭', String.fromCodePoint(0x1f35a)],
  ['米线', String.fromCodePoint(0x1f35c)],
  ['面包', String.fromCodePoint(0x1f956)],
  ['面', String.fromCodePoint(0x1f35c)],
  ['粉', String.fromCodePoint(0x1f35c)],
  ['麻辣烫', String.fromCodePoint(0x1f372)],
  ['火锅', String.fromCodePoint(0x1f372)],
  ['冒菜', String.fromCodePoint(0x1f372)],
  ['汤', String.fromCodePoint(0x1f372)],
  ['粥', String.fromCodePoint(0x1f372)],
  ['烧烤', String.fromCodePoint(0x1f362)],
  ['串', String.fromCodePoint(0x1f362)],
  ['炸鸡', String.fromCodePoint(0x1f357)],
  ['鸡翅', String.fromCodePoint(0x1f357)],
  ['鸡腿', String.fromCodePoint(0x1f357)],
  ['鸡', String.fromCodePoint(0x1f357)],
  ['鸭', String.fromCodePoint(0x1f357)],
  ['鹅', String.fromCodePoint(0x1f357)],
  ['牛排', String.fromCodePoint(0x1f969)],
  ['牛肉', String.fromCodePoint(0x1f969)],
  ['五花肉', String.fromCodePoint(0x1f953)],
  ['红烧肉', String.fromCodePoint(0x1f356)],
  ['羊肉', String.fromCodePoint(0x1f356)],
  ['排骨', String.fromCodePoint(0x1f356)],
  ['猪肉', String.fromCodePoint(0x1f356)],
  ['肉', String.fromCodePoint(0x1f356)],
  ['鱼', String.fromCodePoint(0x1f41f)],
  ['虾', String.fromCodePoint(0x1f990)],
  ['蟹', String.fromCodePoint(0x1f980)],
  ['贝', String.fromCodePoint(0x1f9aa)],
  ['饭', String.fromCodePoint(0x1f35a)],
  ['寿司', String.fromCodePoint(0x1f363)],
  ['披萨', String.fromCodePoint(0x1f355)],
  ['汉堡', String.fromCodePoint(0x1f354)],
  ['薄饼', String.fromCodePoint(0x1f32e)],
  ['蛋糕', String.fromCodePoint(0x1f370)],
  ['甜品', String.fromCodePoint(0x1f370)],
  ['布丁', String.fromCodePoint(0x1f36e)],
  ['冰淇淋', String.fromCodePoint(0x1f368)],
  ['蛋', String.fromCodePoint(0x1f373)],
  ['豆腐', String.fromCodePoint(0x1f371)],
  ['沙拉', String.fromCodePoint(0x1f957)],
  ['西兰花', String.fromCodePoint(0x1f966)],
  ['黄瓜', String.fromCodePoint(0x1f952)],
  ['土豆', String.fromCodePoint(0x1f954)],
  ['番茄', String.fromCodePoint(0x1f345)],
  ['玉米', String.fromCodePoint(0x1f33d)],
  ['蘑菇', String.fromCodePoint(0x1f344)],
]

const MEAT_KEYWORDS: string[] = [
  '肉', '鸡', '鸭', '鹅', '牛', '猪', '羊',
  '鱼', '虾', '蟹', '贝', '蛋', '排骨',
  '培根', '火腿', '腊', '鱿', '蛤蜊',
  '蜡肠', '香肠', '五花',
]

const SORTED_KEYWORDS = [...EMOJI_KEYWORDS].sort(
  (left, right) => right[0].length - left[0].length,
)

export function getFoodEmoji(name: string): string {
  if (!name) return DEFAULT_EMOJI
  const match = SORTED_KEYWORDS.find(([keyword]) => name.includes(keyword))
  return match ? match[1] : DEFAULT_EMOJI
}

export function isMeatDish(name: string): boolean {
  if (!name) return false
  return MEAT_KEYWORDS.some(keyword => name.includes(keyword))
}
