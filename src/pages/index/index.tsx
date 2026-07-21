import { View, Text, Button } from '@tarojs/components'
import Taro, { useLoad, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useCallback, useRef, useMemo } from 'react'
import type { Recipe } from '../../data/recipes'
import { getLocalRecipe, fetchRecipeFromAPI } from '../../data/recipes'
import { defaultFoodList, defaultCategories, AI_CATEGORIES } from '../../data/defaultFoods'
import { fetchTrending, fetchCategories, generateFoodsByCategory, bulkGenerateFoodsByCategory } from '../../services/api'
import useSlotMachine from '../../hooks/useSlotMachine'
import DigestCard from '../../components/DigestCard'
import MenuGrid from '../../components/MenuGrid'
import CountStepper from '../../components/CountStepper'
import CustomMenuPopup from '../../components/CustomMenuPopup'
import RecipePopup from '../../components/RecipePopup'
import { getDrawCount, incrementDrawCount } from '../../utils/drawStats'
import { getDateLine } from '../../utils/dateLabel'
import './index.scss'

const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 1 day

export default function Index() {
  const [activeCategory, _setActiveCategory] = useState('随便')
  const activeCategoryRef = useRef(activeCategory)
  const setActiveCategory = useCallback((cat: string) => {
    activeCategoryRef.current = cat
    _setActiveCategory(cat)
  }, [])
  const [count, setCount] = useState(1)
  const [drawCount, setDrawCount] = useState(() => getDrawCount())
  const [showRecipe, setShowRecipe] = useState(false)
  const [popupFoods, setPopupFoods] = useState<string[]>([])
  const [activePopupIndex, setActivePopupIndex] = useState(0)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const recipeCacheRef = useRef<Record<string, Recipe | null>>({})

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

  // 老虎机滚动
  const getRollList = useCallback(() => mergedFoodList[activeCategoryRef.current], [mergedFoodList])
  const {
    currentFood, isRolling, isLanded, resultList, showResult, handleStart, handleRefreshItem,
  } = useSlotMachine({ count, isBlocked: categoryLoading !== null, getRollList })

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

  // 分享到聊天
  useShareAppMessage(() => {
    const food = resultList.length > 0 ? resultList.join('、') : currentFood
    return {
      title: food !== '今天吃啥？' ? `今天吃：${food}` : '不知道吃啥？来随机一个！',
      path: '/pages/index/index',
    }
  })

  // 分享到朋友圈
  useShareTimeline(() => {
    const food = resultList.length > 0 ? resultList.join('、') : currentFood
    return {
      title: food !== '今天吃啥？' ? `今天吃：${food}` : '不知道吃啥？来随机一个！',
    }
  })

  // 加载某个食物的菜谱
  const loadRecipe = useCallback(async (food: string) => {
    if (recipeCacheRef.current[food] !== undefined) {
      setRecipeLoading(false)
      return
    }
    setRecipeLoading(true)
    let recipe = getLocalRecipe(food)
    if (!recipe) {
      recipe = await fetchRecipeFromAPI(food)
    }
    recipeCacheRef.current[food] = recipe
    setRecipeLoading(false)
  }, [])

  const handleRecipeClick = useCallback(async () => {
    // 收集所有已选食物
    let foods: string[]
    if (resultList.length > 0) {
      foods = [...resultList]
    } else if (currentFood !== '今天吃啥？') {
      foods = [currentFood]
    } else {
      Taro.showToast({ title: '先选一个食物吧', icon: 'none' })
      return
    }

    recipeCacheRef.current = {}
    setPopupFoods(foods)
    setActivePopupIndex(0)
    setShowRecipe(true)
    await loadRecipe(foods[0])
  }, [resultList, currentFood, loadRecipe])

  const handleSwitchFood = useCallback(async (index: number) => {
    setActivePopupIndex(index)
    await loadRecipe(popupFoods[index])
  }, [popupFoods, loadRecipe])

  const handleViewDetail = useCallback(() => {
    const food = popupFoods[activePopupIndex]
    const recipe = recipeCacheRef.current[food]
    if (!recipe) return
    setShowRecipe(false)
    const difficulty = (recipe as any).difficulty || ''
    const cookTime = (recipe as any).cook_time || ''
    Taro.navigateTo({
      url: `/pages/recipe/recipe?name=${encodeURIComponent(recipe.name)}&difficulty=${encodeURIComponent(difficulty)}&cook_time=${encodeURIComponent(cookTime)}`,
    })
  }, [popupFoods, activePopupIndex])

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

  const handleDecree = useCallback(() => {
    if (isRolling || categoryLoading !== null) return
    const pool = getRollList()
    if (!pool || pool.length === 0) {
      handleStart()
      return
    }
    setDrawCount(incrementDrawCount())
    handleStart()
  }, [categoryLoading, getRollList, handleStart, isRolling])

  const hasResult = resultList.length > 0 || currentFood !== '今天吃啥？'

  const singleScreen = resultList.length <= 3

  return (
    <View className={[
      'index',
      'paper-texture',
      singleScreen ? 'index--single-screen' : '',
      hasResult ? 'index--has-result' : '',
    ].filter(Boolean).join(' ')}>
      <View className='custom-navigation' style={navStyle}>
        <Text className='custom-navigation__title'>到底吃啥哟</Text>
      </View>

      <View className='content' role='main'>
        <View className='date-row'>
          <Text className='date-row__label'>{dateLine}</Text>
          <Text className='date-row__count'>第 {drawCount} 次帮你定夺</Text>
        </View>

        <View className='hero' aria-live='polite'>
          {!hasResult ? (
            <>
              <View className='hero__eyebrow'>
                <View className='hero__gold-dot' />
                <Text>今日一问</Text>
              </View>
              <Text className='hero__title'>今晚食何</Text>
              <Text className='hero__subtitle'>三十道候选 · 把纠结交给大厨</Text>
            </>
          ) : resultList.length > 1 ? (
            <View className={`result-list ${resultList.length > 3 ? 'result-list--grid' : ''}`}>
              {resultList.map((food, index) => (
                <View
                  key={`${food}-${index}`}
                  className={`result-row ${showResult ? 'result-row--visible' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Text className='result-index'>{index + 1}</Text>
                  <Text className='result-food'>{food}</Text>
                  <Button
                    className='result-refresh'
                    aria-label={`换掉${food}`}
                    onClick={() => handleRefreshItem(index)}
                  >
                    换
                  </Button>
                </View>
              ))}
            </View>
          ) : (
            <Text className={`hero__result ${isRolling ? 'hero__result--rolling' : ''} ${isLanded ? 'hero__result--landed' : ''}`}>
              {currentFood}
            </Text>
          )}
        </View>

        {!hasResult && <DigestCard />}

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
            aria-label={isRolling ? '正在定夺' : '为我定夺'}
            disabled={isRolling || categoryLoading !== null}
            onClick={handleDecree}
          >
            <View className='decree-btn__line' />
            <Text className='decree-btn__label'>
              {isRolling ? '选择中...' : '为我定夺'}
            </Text>
            <View className='decree-btn__line' />
          </Button>
        </View>

        {hasResult && (
          <View className='result-actions'>
            <Button className='result-action' onClick={handleRecipeClick}>
              查看菜谱
            </Button>
            <Button className='result-action' openType='share'>
              分享美食
            </Button>
          </View>
        )}

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

      {/* 菜谱弹窗 */}
      {showRecipe && (
        <RecipePopup
          foods={popupFoods}
          activeIndex={activePopupIndex}
          recipes={recipeCacheRef.current}
          isLoading={recipeLoading}
          onSwitchFood={handleSwitchFood}
          onViewDetail={handleViewDetail}
          onClose={() => setShowRecipe(false)}
        />
      )}

    </View>
  )
}
