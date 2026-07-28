import { classifyProtein, getFoodEmoji, isMeatDish } from '../../utils/foodMeta'

const NOODLE = String.fromCodePoint(0x1f35c)
const HOTPOT = String.fromCodePoint(0x1f372)
const SKEWER = String.fromCodePoint(0x1f362)
const CHICKEN = String.fromCodePoint(0x1f357)
const FISH = String.fromCodePoint(0x1f41f)
const SHRIMP = String.fromCodePoint(0x1f990)
const RICE = String.fromCodePoint(0x1f35a)
const DUMPLING = String.fromCodePoint(0x1f95f)
const BUBBLE_TEA = String.fromCodePoint(0x1f9cb)
const CAKE = String.fromCodePoint(0x1f370)
const DEFAULT = String.fromCodePoint(0x1f37d)

describe('getFoodEmoji', () => {
  it.each([
    ['热干面', NOODLE],
    ['螺蛳粉', NOODLE],
    ['四川火锅', HOTPOT],
    ['烧烤串', SKEWER],
    ['黄焖鸡', CHICKEN],
    ['酸菜鱼', FISH],
    ['白灶虾', SHRIMP],
    ['煲仔饭', RICE],
    ['猪肉饺子', DUMPLING],
    ['珍珠奶茶', BUBBLE_TEA],
    ['芒果蛋糕', CAKE],
  ])('maps %s to its emoji', (name, expected) => {
    expect(getFoodEmoji(name)).toBe(expected)
  })

  it('falls back to a neutral emoji for unknown dishes', () => {
    expect(getFoodEmoji('不知名神秘菜')).toBe(DEFAULT)
    expect(getFoodEmoji('')).toBe(DEFAULT)
  })

  it('prefers the longest matching keyword', () => {
    expect(getFoodEmoji('奶茶')).toBe(BUBBLE_TEA)
    expect(getFoodEmoji('茶')).not.toBe(DEFAULT)
  })
})

describe('isMeatDish', () => {
  it.each(['番茄炒蛋', '红烧肉', '黄焖鸡', '酸菜鱼', '白灶虾', '糖醋排骨'])(
    'treats %s as meat',
    name => {
      expect(isMeatDish(name)).toBe(true)
    },
  )

  it.each(['清炒西兰花', '凉拌黄瓜', '素炒土豆丝', '白米饭'])(
    'treats %s as vegetarian',
    name => {
      expect(isMeatDish(name)).toBe(false)
    },
  )

  it('handles empty input without throwing', () => {
    expect(isMeatDish('')).toBe(false)
  })
})

describe('classifyProtein', () => {
  it('reports unknown instead of pretending an unnamed dish is vegetarian', () => {
    expect(classifyProtein('')).toBe('unknown')
    expect(classifyProtein('不知名神秘菜')).toBe('unknown')
  })

  it('reports animal protein for obvious meat dishes', () => {
    expect(classifyProtein('红烧肉')).toBe('animal-protein')
    expect(classifyProtein('酸菜鱼')).toBe('animal-protein')
  })

  it('treats dairy as animal protein', () => {
    expect(classifyProtein('芝士焙饭')).toBe('animal-protein')
    expect(classifyProtein('奶油蘑菇汤')).toBe('animal-protein')
  })

  it('reports vegetarian only for explicit vegetarian markers', () => {
    expect(classifyProtein('素鸡')).toBe('vegetarian')
    expect(classifyProtein('植物肉汉堡')).toBe('vegetarian')
    expect(classifyProtein('清炒西兰花')).toBe('vegetarian')
  })

  it('does not let vegetarian imitations count as meat', () => {
    expect(isMeatDish('素鸡')).toBe(false)
    expect(isMeatDish('植物肉汉堡')).toBe(false)
    expect(isMeatDish('鸡腿菇')).toBe(false)
  })
})

describe('classifyProtein mixed and unknown ingredients', () => {
  it('does not let a vegetarian marker hide a separate animal ingredient', () => {
    expect(classifyProtein('素鸡炒牛肉')).toBe('animal-protein')
    expect(classifyProtein('鸡腿菇炒蛋')).toBe('animal-protein')
    expect(classifyProtein('肉桂猪排')).toBe('animal-protein')
  })

  it('still reports vegetarian when only the marker span matches', () => {
    expect(classifyProtein('素鸡')).toBe('vegetarian')
    expect(classifyProtein('鸡腿菇拌黄瓜')).toBe('vegetarian')
    expect(classifyProtein('肉桂卷')).toBe('vegetarian')
  })

  it('reports unknown when a plant word sits next to an unrecognized ingredient', () => {
    expect(classifyProtein('蘑菇炖兔')).toBe('unknown')
    expect(classifyProtein('西兰花配鹿排')).toBe('unknown')
  })
})
