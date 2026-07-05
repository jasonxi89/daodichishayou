import { View, Text, Button } from '@tarojs/components'
import Taro, { useLoad, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useCallback, useRef, useMemo } from 'react'
import type { Recipe } from '../../data/recipes'
import { getLocalRecipe, fetchRecipeFromAPI } from '../../data/recipes'
import { defaultFoodList, defaultCategories, AI_CATEGORIES } from '../../data/defaultFoods'
import { fetchTrending, fetchCategories, generateFoodsByCategory, bulkGenerateFoodsByCategory } from '../../services/api'
import useSlotMachine from '../../hooks/useSlotMachine'
import DigestCard from '../../components/DigestCard'
import FoodDecorIcons from '../../components/FoodDecorIcons'
import CustomMenuPopup from '../../components/CustomMenuPopup'
import RecipePopup from '../../components/RecipePopup'
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

  return (
    <View className='index'>
      {/* 主内容 */}
      <View className='content'>
        {/* 食物名称展示 */}
        <View className='food-display'>
          {/* 装饰图标：仅在未显示结果列表时展示 */}
          {resultList.length <= 1 && <FoodDecorIcons />}
          {resultList.length > 1 ? (
            <View className={`result-list ${resultList.length > 3 ? 'grid' : ''}`}>
              {resultList.map((food, i) => (
                <View key={i} className={`result-row ${showResult ? 'animate-in' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
                  <View className='result-item'>
                    <Text className='result-index'>{i + 1}</Text>
                    <Text className='result-food'>{food}</Text>
                  </View>
                  <View className='result-refresh' onClick={() => handleRefreshItem(i)}>
                    <Text className='result-refresh-text'>换</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className={`food-name ${isRolling ? 'rolling' : ''} ${isLanded ? 'landed' : ''}`}>{currentFood}</Text>
          )}
        </View>

        {/* 今日风向快报 */}
        <DigestCard />

        {/* 分类标签 */}
        <View className='categories'>
          {allCategories.map((cat) => (
            <Text
              key={cat}
              className={`category-tag ${activeCategory === cat ? 'active' : ''} ${cat === '热门推荐' ? 'hot' : ''} ${categoryLoading === cat ? 'loading' : ''}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {cat}
            </Text>
          ))}
          <Text className='category-tag edit-tag' onClick={() => setShowCustomMenu(true)}>✏️ 自定义</Text>
        </View>

        {/* 数量选择器 */}
        <View className='count-selector'>
          <Text className='count-label'>份数</Text>
          <View
            className={`count-btn ${count <= 1 ? 'disabled' : ''}`}
            onClick={() => count > 1 && setCount(c => c - 1)}
          >
            <Text className='count-btn-text'>-</Text>
          </View>
          <View className='count-num'>
            <Text className='count-value'>{count}</Text>
          </View>
          <View
            className={`count-btn ${count >= 10 ? 'disabled' : ''}`}
            onClick={() => count < 10 && setCount(c => c + 1)}
          >
            <Text className='count-btn-text'>+</Text>
          </View>
        </View>

        {/* 开始按钮 */}
        <View className='start-btn-wrapper'>
          <View className={`start-btn ${isRolling || categoryLoading !== null ? 'disabled' : ''}`} onClick={handleStart}>
            <Text className='start-btn-text'>{isRolling ? '选择中...' : '开始'}</Text>
          </View>
        </View>

        {/* 结果操作按钮 — 选出食物后才显示 */}
        {(resultList.length > 0 || currentFood !== '今天吃啥？') && (
          <View className='actions'>
            <View className='action-item' onClick={handleRecipeClick}>
              <Text className='action-icon'>📋</Text>
              <Text className='action-text'>查看菜谱</Text>
            </View>
            <Button className='share-btn' openType='share'>
              <View className='action-item'>
                <Text className='action-icon'>🔗</Text>
                <Text className='action-text'>分享美食</Text>
              </View>
            </Button>
          </View>
        )}

        {/* 意见反馈悬浮按钮 */}
        <Button className='feedback-fab' openType='feedback'>
          <Text className='feedback-fab-text'>反馈</Text>
        </Button>

        {/* TabBar占位 */}
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
