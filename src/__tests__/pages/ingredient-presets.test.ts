import { COMMON_INGREDIENTS } from '../../pages/ingredient/ingredient'

const EXPECTED_PRESET_INGREDIENTS = [
  '番茄', '土豆', '白菜', '青椒', '黄瓜', '茄子',
  '西兰花', '胡萝卜', '菠菜', '洋葱', '蘑菇', '豆芽',
  '鸡胸肉', '猪肉', '牛肉', '排骨', '五花肉', '鸡翅',
  '鸡腿', '肉末', '虾', '鱼', '豆腐', '鸡蛋', '牛奶',
  '米饭', '面条', '馒头', '饺子皮', '面粉',
]

describe('ingredient preset contract', () => {
  it('stays synchronized with backend PRESET_INGREDIENTS', () => {
    expect(Object.values(COMMON_INGREDIENTS).flat()).toEqual(
      EXPECTED_PRESET_INGREDIENTS,
    )
  })
})
