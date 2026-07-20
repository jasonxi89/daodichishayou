export const MENU_PRIMARY = [
  '随便',
  '热门推荐',
  '家常下饭',
  '嗦粉吃面',
  '火锅烫涮',
  '烧烤撸串',
  '奶茶续命',
  '深夜食堂',
]

interface CategoryDisplay {
  label: string
  note: string
}

const CATEGORY_META: Record<string, CategoryDisplay> = {
  随便: { label: '随便', note: '大厨看着办' },
  热门推荐: { label: '热门', note: '今日爆款' },
  家常下饭: { label: '家常下饭', note: '妈妈味道' },
  嗦粉吃面: { label: '嗦粉吃面', note: '一碗入魂' },
  火锅烫涮: { label: '火锅烫涮', note: '咕嘟咕嘟' },
  烧烤撸串: { label: '烧烤撸串', note: '滋滋冒油' },
  奶茶续命: { label: '奶茶续命', note: '快乐水源' },
  深夜食堂: { label: '深夜食堂', note: '灯火可亲' },
  街头小吃: { label: '街头小吃', note: '烟火气息' },
  异国风味: { label: '异国风味', note: '环游味蕾' },
  甜品诱惑: { label: '甜品诱惑', note: '就要甜一口' },
  轻食减脂: { label: '轻食减脂', note: '清爽无负担' },
}

export function getCategoryDisplay(category: string): CategoryDisplay {
  return CATEGORY_META[category] ?? { label: category, note: '私房甄选' }
}
