import {
  MENU_PRIMARY,
  CUSTOM_CATEGORY_NOTE,
  FALLBACK_CATEGORY_NOTE,
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
      note: FALLBACK_CATEGORY_NOTE,
    })
  })

  it('prefers a backend note over the repetitive fallback', () => {
    expect(getCategoryDisplay('东南亚', { 东南亚: '一口入南洋' })).toEqual({
      label: '东南亚',
      note: '一口入南洋',
    })
  })

  it('lets a backend note override the local hand-written note', () => {
    expect(getCategoryDisplay('火锅烫涮', { 火锅烫涮: '围炉咕嘟' })).toEqual({
      label: '火锅烫涮',
      note: '围炉咕嘟',
    })
  })

  it('keeps the local label when the backend only supplies a note', () => {
    expect(getCategoryDisplay('热门推荐', { 热门推荐: '今日爆款' }).label).toBe('热门')
  })

  it('falls back when the override map has no entry or an empty note', () => {
    expect(getCategoryDisplay('季节限定', {}).note).toBe(FALLBACK_CATEGORY_NOTE)
    expect(getCategoryDisplay('季节限定', { 季节限定: '' }).note).toBe(FALLBACK_CATEGORY_NOTE)
    expect(getCategoryDisplay('随便', { 随便: '' }).note).toBe('大厨看着办')
  })

  it('exposes the fixed note used for user-defined categories', () => {
    expect(CUSTOM_CATEGORY_NOTE).toBe('你的地盘听你的')
    expect(getCategoryDisplay('我的私藏', { 我的私藏: CUSTOM_CATEGORY_NOTE }).note).toBe(
      '你的地盘听你的',
    )
  })
})
