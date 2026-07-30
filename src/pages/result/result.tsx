import { Button, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad, useShareAppMessage } from '@tarojs/taro'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { DrawResult } from '../../utils/drawContract'
import { HOME_PAGE, LAST_RESULT_KEY, REDRAW_EVENT } from '../../utils/drawContract'
import { incrementWeeklyDrawCount } from '../../utils/drawStats'
import { classifyProtein, getFoodEmoji } from '../../utils/foodMeta'
import { toZhNumber } from '../../utils/zhNumber'
import { getDateLine } from '../../utils/dateLabel'
import { CHEF_ERROR } from '../../utils/toastCopy'
import './result.scss'

const LUCKY_THRESHOLD = 5

const PROTEIN_CLASS = {
  'animal-protein': 'meat',
  vegetarian: 'vegetarian',
  unknown: 'unknown',
} as const

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string')

// Storage survives app upgrades, so the stored shape is untrusted input.
// A TypeScript cast alone would let a stale payload crash the swap handler.
function readDraw(): DrawResult | null {
  try {
    const stored = Taro.getStorageSync(LAST_RESULT_KEY) as Partial<DrawResult> | undefined
    if (!stored || typeof stored !== 'object') return null
    if (!isStringList(stored.foods) || stored.foods.length === 0) return null
    if (!isStringList(stored.pool)) return null
    if (!Number.isFinite(stored.ts)) return null
    if (!Number.isInteger(stored.drawIndex)) return null
    return stored as DrawResult
  } catch {
    return null
  }
}

export default function Result() {
  const [draw, setDraw] = useState<DrawResult | null>(null)
  const [foods, setFoods] = useState<string[]>([])
  const [weeklyCount, setWeeklyCount] = useState(0)

  // useLoad must run its side effects once even if the host re-invokes it.
  const loadedRef = useRef(false)

  useLoad(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    const stored = readDraw()
    if (!stored) {
      Taro.showToast({ title: CHEF_ERROR, icon: 'none' })
      // Scene-code or restored entry can make this the only page on the stack.
      Taro.navigateBack({ fail: () => Taro.reLaunch({ url: HOME_PAGE }) })
      return
    }
    setDraw(stored)
    setFoods(stored.foods)
    setWeeklyCount(incrementWeeklyDrawCount())
  })

  // Deduplicated so an accidentally repeated pool entry does not get double odds.
  const uniquePool = useMemo(() => [...new Set(draw?.pool ?? [])], [draw])
  const hasSpare = uniquePool.some(name => !foods.includes(name))

  const refreshDish = useCallback((index: number) => {
    setFoods(current => {
      const taken = new Set(current)
      const available = uniquePool.filter(name => !taken.has(name))
      if (available.length === 0) return current
      const replacement = available[Math.floor(Math.random() * available.length)]
      return current.map((name, i) => (i === index ? replacement : name))
    })
  }, [uniquePool])

  const handleRedraw = useCallback(() => {
    Taro.eventCenter.trigger(REDRAW_EVENT)
    Taro.navigateBack()
  }, [])

  useShareAppMessage(() => ({
    title: foods.length > 0 ? `今晚吃：${foods.join('、')}` : '不知道吃啥？来抽一签',
    path: HOME_PAGE,
  }))

  if (!draw) return null

  return (
    <View className='result paper-texture'>
      <View className='result__divider' />
      <Text className='result__eyebrow'>今晚菜单已定</Text>

      <View className='scroll-card'>
        <View className='scroll-card__gold' />
        <View className='scroll-card__badge'>
          <Text className='scroll-card__badge-text'>天意如此！</Text>
        </View>
        <Text className='scroll-card__date'>{`─ ${getDateLine(new Date(draw.ts))} ─`}</Text>

        <ScrollView scrollY className='dish-list'>
          {foods.map((food, index) => (
            <View className='dish-row' key={`${draw.drawIndex}-${index}`}>
              <Text className='dish-row__index'>{toZhNumber(index + 1)}</Text>
              <Text className={`dish-chip dish-chip--${PROTEIN_CLASS[classifyProtein(food)]}`} aria-hidden>
                {getFoodEmoji(food)}
              </Text>
              <Text className='dish-row__name'>{food}</Text>
              <Button
                className='dish-row__refresh'
                aria-label={`换掉${food}`}
                disabled={!hasSpare}
                onClick={() => refreshDish(index)}
              >
                换一换
              </Button>
            </View>
          ))}
        </ScrollView>

        <View className='scroll-card__footer'>
          <Text className='scroll-card__note'>荤素得当 · 御厨手谕</Text>
          <View className='seal'>
            <Text className='seal__text'>大厨认证</Text>
          </View>
        </View>
      </View>

      <Text className='result__easter-egg'>
        {`本周第 ${weeklyCount} 次听天由命${weeklyCount >= LUCKY_THRESHOLD ? ' · 已解锁「干饭锦鲤」' : ''}`}
      </Text>

      <View className='result__actions'>
        <Button className='result__secondary' aria-label='再抽' onClick={handleRedraw}>
          再抽
        </Button>
        <Button className='result__primary' openType='share' aria-label='就它了，分享这份菜单'>
          就它了！
        </Button>
      </View>
    </View>
  )
}
