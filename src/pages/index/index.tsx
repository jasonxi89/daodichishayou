import { View, Text, Button } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultFoodList, defaultCategories, AI_CATEGORIES } from '../../data/defaultFoods'
import { fetchTrending, fetchCategories, generateFoodsByCategory, bulkGenerateFoodsByCategory } from '../../services/api'
import useDrawCeremony from '../../hooks/useDrawCeremony'
import DrawCeremony from '../../components/DrawCeremony'
import DigestCard from '../../components/DigestCard'
import MenuGrid from '../../components/MenuGrid'
import CountStepper from '../../components/CountStepper'
import CustomMenuPopup from '../../components/CustomMenuPopup'
import { getDrawCount, incrementDrawCount } from '../../utils/drawStats'
import { getDateLine } from '../../utils/dateLabel'
import { getFoodEmoji } from '../../utils/foodMeta'
import './index.scss'

const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 1 day
const RESULT_PAGE = '/pages/result/result'
const DRAW_RESULT_KEY = 'lastDrawResult'
const REDRAW_EVENT = 'ddcsy:redraw'

interface DrawContext {
  category: string
  servings: number
  pool: string[]
}

export default function Index() {
  const [activeCategory, _setActiveCategory] = useState('随便')
  const activeCategoryRef = useRef(activeCategory)
  const setActiveCategory = useCallback((cat: string) => {
    activeCategoryRef.current = cat
    _setActiveCategory(cat)
  }, [])
  const [count, setCount] = useState(1)
  const [drawCount, setDrawCount] = useState(() => getDrawCount())

  // 后端热门数据
  const [trendingFoods, setTrendingFoods] = useState<string[]>([])
  const [trendingByCategory, setTrendingByCategory] = useState<Record<string, string[]>>({})
  const [backendCategories, setBackendCategories] = useState<string[]>([])

  // AI 分类缓存
  const [aiCategoryCache, setAiCategoryCache] = useState<Record<string, { foods: string[], expiresAt: number }>>({})
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null)

  // 自定义菜单状态
  const [customFoodList, setCustomFoodList] = useState<Record<string, string[]>>({})
  const [showCustomMenu, setShowCustomMenu] = useState(false)
  const dateLine = useMemo(() => getDateLine(), [])
  const navStyle = useMemo(() => {
    try {
      const menu = Taro.getMenuButtonBoundingClientRect()
      const system = Taro.getSystemInfoSync()
      const sideInset = Math.max(24, system.windowWidth - menu.left + 8)
      return {
        minHeight: `${menu.bottom + 8}px`,
        paddingLeft: `${sideInset}px`,
        paddingRight: `${sideInset}px`,
      }
    } catch {
      return { minHeight: '48px', paddingLeft: '24px', paddingRight: '24px' }
    }
  }, [])

  // 合并默认 + 热门 + 后端分类 + AI缓存 + 自定义
  // 优先级: AI缓存 > 自定义 > 默认硬编码 > 热门趋势
  // AI缓存是用户主动点击分类后按需生成的，最精准，优先级最高
  const mergedFoodList = useMemo(() => {
    const merged = { ...defaultFoodList, ...customFoodList }
    if (trendingFoods.length > 0) {
      merged['热门推荐'] = trendingFoods
    }
    for (const [cat, foods] of Object.entries(trendingByCategory)) {
      if (!merged[cat] && foods.length >= 5) {
        merged[cat] = foods
      }
    }
    // AI缓存优先级最高：覆盖 trendingByCategory 的粗略分组
    for (const [cat, entry] of Object.entries(aiCategoryCache)) {
      if (entry.foods.length > 0) {
        merged[cat] = entry.foods
      }
    }
    return merged
  }, [customFoodList, trendingFoods, trendingByCategory, aiCategoryCache])
  const allCategories = useMemo(() => {
    const base = [...defaultCategories]
    for (const cat of backendCategories) {
      if (!base.includes(cat)) base.push(cat)
    }
    // 自定义分类放最后
    for (const cat of Object.keys(customFoodList)) {
      if (!base.includes(cat)) base.push(cat)
    }
    return base
  }, [customFoodList, backendCategories])

  // 抽取仪式：结果不再留在首页，交给结果页
  const countRef = useRef(count)
  countRef.current = count

  // Freeze category, servings and pool when the draw is accepted so the
  // handoff payload can never mix start-time foods with finish-time state.
  const drawContextRef = useRef<DrawContext | null>(null)

  const getPool = useCallback(() => {
    const category = activeCategoryRef.current
    const pool = mergedFoodList[category]
    drawContextRef.current = {
      category,
      servings: countRef.current,
      pool: pool ? [...pool] : [],
    }
    return pool
  }, [mergedFoodList])

  const resetCeremonyRef = useRef<(() => void) | null>(null)

  const [pendingResult, setPendingResult] = useState(false)

  const openResultPage = useCallback(() => {
    // Optimistic: only re-arm the recovery button if navigation actually fails.
    setPendingResult(false)
    Taro.navigateTo({
      url: RESULT_PAGE,
      fail: () => {
        // The draw is already persisted; offer to reopen it instead of
        // leaving a fresh-draw button that would overwrite the saved result.
        setPendingResult(true)
        Taro.showToast({ title: '结果页打开失败，请重试', icon: 'none' })
      },
    })
  }, [])

  const handleDrawDone = useCallback((foods: string[]) => {
    const context = drawContextRef.current ?? {
      category: activeCategoryRef.current,
      servings: countRef.current,
      pool: [],
    }
    drawContextRef.current = null
    resetCeremonyRef.current?.()

    const nextIndex = getDrawCount() + 1
    try {
      // The stored result is the commit record: it carries drawIndex, so a
      // failed count write can be reconciled from it instead of stranding it.
      Taro.setStorageSync(DRAW_RESULT_KEY, {
        foods,
        category: context.category,
        servings: context.servings,
        pool: context.pool,
        drawIndex: nextIndex,
        ts: Date.now(),
      })
    } catch {
      Taro.showToast({ title: '结果没存下来，再试一次', icon: 'none' })
      return
    }

    try {
      Taro.setStorageSync('drawCountTotal', nextIndex)
    } catch {
      // Count is derivable from the stored result; never block the user here.
    }
    setDrawCount(nextIndex)

    openResultPage()
  }, [openResultPage])

  const { phase, mainResult, startDraw, skip, reset } = useDrawCeremony({
    count,
    isBlocked: categoryLoading !== null,
    getPool,
    onDone: handleDrawDone,
  })

  resetCeremonyRef.current = reset

  const ceremonyActive = phase !== 'idle'

  // Subscribe once; dispatch through a ref so a redraw event that lands between
  // commit and effect flush still uses the latest startDraw.
  const startDrawRef = useRef(startDraw)
  startDrawRef.current = startDraw

  useEffect(() => {
    const handleRedraw = () => startDrawRef.current()
    Taro.eventCenter.on(REDRAW_EVENT, handleRedraw)
    return () => {
      Taro.eventCenter.off(REDRAW_EVENT, handleRedraw)
    }
  }, [])

  useLoad(() => {
    console.log('Page loaded.')
    const stored = Taro.getStorageSync('customFoodList')
    if (stored && typeof stored === 'object') {
      setCustomFoodList(stored)
    }
    let validAiCache: Record<string, { foods: string[], expiresAt: number }> = {}
    const cachedAi = Taro.getStorageSync('aiCategoryCache')
    if (cachedAi && typeof cachedAi === 'object') {
      const now = Date.now()
      for (const [k, v] of Object.entries(cachedAi)) {
        if (v && typeof v === 'object' && (v as any).expiresAt > now) {
          validAiCache[k] = v as { foods: string[], expiresAt: number }
        }
      }
      setAiCategoryCache(validAiCache)
    }
    // Bulk fetch uncached AI categories (静默后台刷新，不阻塞用户)
    const uncached = AI_CATEGORIES.filter(cat => !validAiCache[cat] || validAiCache[cat].expiresAt <= Date.now())
    if (uncached.length > 0) {
      bulkGenerateFoodsByCategory(uncached)
        .then(res => {
          setAiCategoryCache(prev => {
            const next = { ...prev }
            for (const [cat, foods] of Object.entries(res.results)) {
              next[cat] = { foods, expiresAt: Date.now() + AI_CACHE_TTL_MS }
            }
            Taro.setStorageSync('aiCategoryCache', next)
            return next
          })
        })
        .catch(() => {})
    }
    // 从后端获取热门食物和分类（失败时静默降级到硬编码）
    fetchTrending(200).then(res => {
      setTrendingFoods(res.items.map(item => item.food_name))
      const grouped: Record<string, string[]> = {}
      res.items.forEach(item => {
        if (item.category) {
          if (!grouped[item.category]) grouped[item.category] = []
          if (!grouped[item.category].includes(item.food_name)) {
            grouped[item.category].push(item.food_name)
          }
        }
      })
      setTrendingByCategory(grouped)
    }).catch(() => {})
    fetchCategories().then(cats => {
      setBackendCategories(cats)
    }).catch(() => {})
  })

  // 点击分类标签：切换分类 + 按需触发 AI 生成
  // 对于没有默认/自定义食物列表的分类，用 AI 生成精准的分类食物
  const handleCategoryClick = useCallback((cat: string) => {
    setActiveCategory(cat)
    const hasFoods = !!(mergedFoodList[cat] && mergedFoodList[cat].length > 0)
    if (
      !hasFoods &&
      categoryLoading === null &&
      (!aiCategoryCache[cat] || aiCategoryCache[cat].expiresAt <= Date.now())
    ) {
      setCategoryLoading(cat)
      generateFoodsByCategory(cat)
        .then(res => {
          const entry = { foods: res.foods, expiresAt: Date.now() + AI_CACHE_TTL_MS }
          setAiCategoryCache(prev => {
            const next = { ...prev, [cat]: entry }
            Taro.setStorageSync('aiCategoryCache', next)
            return next
          })
        })
        .catch(() => {
          Taro.showToast({ title: `"${cat}"分类生成失败`, icon: 'none' })
        })
        .finally(() => {
          setCategoryLoading(null)
        })
    }
  }, [mergedFoodList, categoryLoading, aiCategoryCache, setActiveCategory])

  // ===== 自定义菜单操作 =====
  const saveCustomList = useCallback((newList: Record<string, string[]>) => {
    setCustomFoodList(newList)
    Taro.setStorageSync('customFoodList', newList)
  }, [])

  const handleCategoryDeleted = useCallback((name: string) => {
    if (activeCategoryRef.current === name) {
      setActiveCategory('随便')
    }
  }, [setActiveCategory])

  if (ceremonyActive) {
    return (
      <View className="index paper-texture index--single-screen">
        <DrawCeremony
          phase={phase}
          mainResult={mainResult}
          emoji={getFoodEmoji(mainResult)}
          category={activeCategory}
          servings={count}
          drawIndex={drawCount + 1}
          onSkip={skip}
        />
      </View>
    )
  }

  return (
    <View className="index paper-texture index--single-screen">
      <View className='custom-navigation' style={navStyle}>
        <Text className='custom-navigation__title'>到底吃啥哟</Text>
      </View>

      <View className='content' role='main'>
        <View className='date-row'>
          <Text className='date-row__label'>{dateLine}</Text>
          <Text className='date-row__count'>第 {drawCount} 次帮你定夺</Text>
        </View>

        <View className='hero'>
          <View className='hero__eyebrow'>
            <View className='hero__gold-dot' />
            <Text>今日一问</Text>
          </View>
          <Text className='hero__title'>今晚食何</Text>
          <Text className='hero__subtitle'>三十道候选 · 把纠结交给大厨</Text>
        </View>

        <DigestCard />

        <MenuGrid
          categories={allCategories}
          active={activeCategory}
          loadingCategory={categoryLoading}
          onSelect={handleCategoryClick}
          onCustomize={() => setShowCustomMenu(true)}
        />

        <View className='draw-controls'>
          <CountStepper value={count} onChange={setCount} />
          <Button
            className='decree-btn'
            aria-label={pendingResult ? '重新打开结果' : '为我定夺'}
            disabled={categoryLoading !== null}
            onClick={pendingResult ? openResultPage : startDraw}
          >
            <View className='decree-btn__line' />
            <Text className='decree-btn__label'>
              {pendingResult ? '重新打开结果' : '为我定夺'}
            </Text>
            <View className='decree-btn__line' />
          </Button>
        </View>

        <Button className='feedback-fab' openType='feedback'>反馈</Button>
      </View>

      {/* 自定义菜单弹窗 */}
      {showCustomMenu && (
        <CustomMenuPopup
          customFoodList={customFoodList}
          onSave={saveCustomList}
          onClose={() => setShowCustomMenu(false)}
          onCategoryAdded={setActiveCategory}
          onCategoryDeleted={handleCategoryDeleted}
        />
      )}

    </View>
  )
}
