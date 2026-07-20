import {
  MENU_PRIMARY,
  getCategoryDisplay,
} from '../../data/categoryMeta'

describe('categoryMeta', () => {
  it('keeps the eight approved primary categories in order', () => {
    expect(MENU_PRIMARY).toEqual([
      '随便',
      '热门推荐',
      '家常下饭',
      '嗦粉吃面',
      '火锅烫涮',
      '烧烤撸串',
      '奶茶续命',
      '深夜食堂',
    ])
  })

  it.each([
    ['随便', { label: '随便', note: '大厨看着办' }],
    ['热门推荐', { label: '热门', note: '今日爆款' }],
    ['异国风味', { label: '异国风味', note: '环游味蕾' }],
    ['轻食减脂', { label: '轻食减脂', note: '清爽无负担' }],
  ])('maps %s to its display metadata', (category, expected) => {
    expect(getCategoryDisplay(category)).toEqual(expected)
  })

  it('uses a stable fallback for new backend categories', () => {
    expect(getCategoryDisplay('季节限定')).toEqual({
      label: '季节限定',
      note: '私房甄选',
    })
  })
})
