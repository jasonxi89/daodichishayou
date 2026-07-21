import { Button, Text, View } from '@tarojs/components'
import { useMemo, useState } from 'react'
import { MENU_PRIMARY, getCategoryDisplay } from '../../data/categoryMeta'
import './index.scss'

export interface MenuGridProps {
  categories: string[]
  active: string
  loadingCategory: string | null
  onSelect: (category: string) => void
  onCustomize: () => void
}

export default function MenuGrid({
  categories,
  active,
  loadingCategory,
  onSelect,
  onCustomize,
}: MenuGridProps) {
  const [expanded, setExpanded] = useState(false)
  const available = useMemo(() => new Set(categories), [categories])
  const primary = MENU_PRIMARY.filter(category => available.has(category))
  const remaining = categories.filter(category => !MENU_PRIMARY.includes(category))
  const visible = expanded ? [...primary, ...remaining] : primary

  return (
    <View className='menu-grid-section'>
      <View className='menu-grid-header'>
        <View className='menu-grid-heading'>
          <Text className='menu-grid-title'>菜单 · 择一挂</Text>
          <Text className='menu-grid-english'>MENU</Text>
        </View>
        <Button
          className='menu-customize'
          aria-label='自定义菜单'
          onClick={onCustomize}
        >
          ＋ 自定义
        </Button>
      </View>
      <View className='menu-grid'>
        {visible.map(category => {
          const display = getCategoryDisplay(category)
          const isLoading = loadingCategory === category
          return (
            <Button
              key={category}
              className={[
                'menu-cell',
                active === category ? 'menu-cell--active' : '',
                isLoading ? 'menu-cell--loading' : '',
                category === '热门推荐' ? 'menu-cell--hot' : '',
              ].filter(Boolean).join(' ')}
              aria-label={`${display.label}，${display.note}`}
              aria-pressed={active === category}
              aria-busy={isLoading}
              onClick={() => onSelect(category)}
            >
              <Text className='menu-cell__name'>{display.label}</Text>
              <Text className='menu-cell__note'>
                {isLoading ? '正在备菜' : display.note}
              </Text>
            </Button>
          )
        })}
        {remaining.length > 0 && (
          <Button
            className={`menu-cell menu-more ${expanded ? 'menu-more--expanded' : ''}`}
            aria-label={expanded ? '收起更多分类' : '展开更多分类'}
            aria-expanded={expanded}
            onClick={() => setExpanded(value => !value)}
          >
            <Text className='menu-cell__name'>更多</Text>
            <Text className='menu-cell__note menu-more__arrow'>⌄</Text>
          </Button>
        )}
      </View>
    </View>
  )
}
