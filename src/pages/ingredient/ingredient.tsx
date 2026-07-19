import { View, Text, ScrollView, Input, Canvas, Button } from '@tarojs/components'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useCallback, useRef, useEffect } from 'react'
import { findLocalRecipesByIngredients } from '../../data/recipes'
import {
  fetchDishStepsStreaming,
  fetchQuickRecommendations,
  type QuickRecommendResponse,
} from '../../services/api'
import DishCard, { type DisplayDish } from './DishCard'
import RecommendationLoading from './RecommendationLoading'
import { CATEGORIES, COMMON_INGREDIENTS, LOADING_MESSAGES, PREFERENCES,
  makePrefetchKey, makeQuickPayload } from './recommendationConfig'
import './ingredient.scss'

export { COMMON_INGREDIENTS } from './recommendationConfig'

export default function Ingredient() {
  const [selected, setSelected] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('蔬菜')
  const [inputValue, setInputValue] = useState('')
  const [preference, setPreference] = useState('不限')
  const [loading, setLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [dishes, setDishes] = useState<DisplayDish[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [allowExtra, setAllowExtra] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingStepIndex, setLoadingStepIndex] = useState<number | null>(null)
  const [usingLocalFallback, setUsingLocalFallback] = useState(false)
  const shareImagePath = useRef('')
  const prefetchRef = useRef<{
    key: string
    promise: Promise<QuickRecommendResponse | null>
  } | null>(null)
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recommendationRequestRef = useRef(0)
  const resultGenerationRef = useRef(0)
  const detailRequestCounterRef = useRef(0)
  const activeDetailRequestsRef = useRef(new Map<string, number>())
  const loadMoreInFlightRef = useRef(false)
  const loadMoreRequestRef = useRef(0)
  const currentCriteriaKey = makePrefetchKey(selected, preference, allowExtra)
  const currentCriteriaKeyRef = useRef(currentCriteriaKey)
  currentCriteriaKeyRef.current = currentCriteriaKey

  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0)
      return
    }
    const timer = setInterval(() => {
      setLoadingMessageIndex(index => (index + 1) % LOADING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [loading])

  useEffect(() => {
    recommendationRequestRef.current += 1
    loadMoreRequestRef.current += 1
    loadMoreInFlightRef.current = false
    resultGenerationRef.current += 1
    activeDetailRequestsRef.current.clear()
    setLoading(false)
    setLoadingMore(false)
    setLoadingStepIndex(null)
    setExpandedIndex(null)
    setDishes([])
    setUsingLocalFallback(false)
  }, [currentCriteriaKey])

  useEffect(() => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current)
      prefetchTimerRef.current = null
    }
    prefetchRef.current = null
    if (selected.length === 0) return

    const key = makePrefetchKey(selected, preference, allowExtra)
    prefetchTimerRef.current = setTimeout(() => {
      const promise = fetchQuickRecommendations(
        makeQuickPayload(selected, preference, allowExtra),
      ).catch(() => null)
      prefetchRef.current = { key, promise }
      prefetchTimerRef.current = null
    }, 1000)

    return () => {
      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current)
        prefetchTimerRef.current = null
      }
    }
  }, [selected, preference, allowExtra])

  // 当菜品结果变化时，绘制分享卡片
  useEffect(() => {
    if (dishes.length === 0) {
      shareImagePath.current = ''
      return
    }
    const query = Taro.createSelectorQuery()
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]?.node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const dpr = Taro.getSystemInfoSync().pixelRatio || 2
      const W = 500, H = 400
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)

      const pad = 20 // 外边距

      // 背景 — 暖白色
      ctx.fillStyle = '#faf7f2'
      ctx.fillRect(0, 0, W, H)

      // 内容卡片 — 白色圆角矩形
      const cardX = pad, cardY = pad, cardW = W - pad * 2, cardH = H - pad * 2
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(cardX + 12, cardY)
      ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, 12)
      ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, 12)
      ctx.arcTo(cardX, cardY + cardH, cardX, cardY, 12)
      ctx.arcTo(cardX, cardY, cardX + cardW, cardY, 12)
      ctx.closePath()
      ctx.fill()
      // 卡片阴影边框
      ctx.strokeStyle = '#f0ebe4'
      ctx.lineWidth = 1
      ctx.stroke()

      // 顶部装饰线
      ctx.fillStyle = '#f5a623'
      ctx.fillRect(cardX, cardY, cardW, 5)
      // 修圆角
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cardX, cardY + 5, cardW, 2)

      // 标题区
      ctx.textAlign = 'center'
      ctx.fillStyle = '#f5a623'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText('- - -  御 厨 推 荐  - - -', W / 2, cardY + 32)

      // 食材标签
      ctx.fillStyle = '#666'
      ctx.font = '13px sans-serif'
      const ingredientLine = selected.slice(0, 5).join(' / ') + (selected.length > 5 ? ' ...' : '')
      ctx.fillText(ingredientLine, W / 2, cardY + 54)

      // 分隔线
      ctx.strokeStyle = '#f0ebe4'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cardX + 20, cardY + 66)
      ctx.lineTo(cardX + cardW - 20, cardY + 66)
      ctx.stroke()

      // 菜品列表
      const startY = cardY + 90
      const maxDishes = Math.min(dishes.length, 4)
      dishes.slice(0, maxDishes).forEach((dish, i) => {
        const y = startY + i * 56
        // 序号圆点
        ctx.fillStyle = '#f5a623'
        ctx.beginPath()
        ctx.arc(cardX + 30, y, 13, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(i + 1), cardX + 30, y + 5)
        // 菜名
        ctx.fillStyle = '#333'
        ctx.font = 'bold 19px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(dish.name, cardX + 52, y + 5)
        // 简介
        if (dish.summary) {
          ctx.fillStyle = '#aaa'
          ctx.font = '12px sans-serif'
          ctx.fillText(dish.summary.slice(0, 15), cardX + 52, y + 24)
        }
      })

      // 红色印章 "大厨认证"
      ctx.save()
      const stampX = cardX + cardW - 70, stampY = cardY + cardH - 70
      ctx.translate(stampX, stampY)
      ctx.rotate(-0.18)
      // 外圈
      ctx.strokeStyle = 'rgba(211, 47, 47, 0.85)'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.arc(0, 0, 48, 0, Math.PI * 2)
      ctx.stroke()
      // 内圈
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(0, 0, 40, 0, Math.PI * 2)
      ctx.stroke()
      // 星形装饰点（上下左右）
      ctx.fillStyle = 'rgba(211, 47, 47, 0.85)'
      for (let a = 0; a < 4; a++) {
        const angle = a * Math.PI / 2
        ctx.beginPath()
        ctx.arc(Math.cos(angle) * 44, Math.sin(angle) * 44, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      // 文字
      ctx.fillStyle = 'rgba(211, 47, 47, 0.9)'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('大厨', 0, -8)
      ctx.fillText('认证', 0, 22)
      ctx.restore()

      // 底部水印
      ctx.fillStyle = '#c8c0b6'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('到底吃啥哟 · 专业智能推荐', W / 2, H - 8)

      // 导出图片
      Taro.canvasToTempFilePath({
        canvas,
        width: W * dpr,
        height: H * dpr,
        destWidth: W * dpr,
        destHeight: H * dpr,
        success: (r) => { shareImagePath.current = r.tempFilePath },
        fail: () => { shareImagePath.current = '' },
      })
    })
  }, [dishes, selected])

  useShareAppMessage(() => {
    const foodNames = dishes.length > 0 ? dishes.map(d => d.name).join('、') : ''
    const ingredientText = selected.length > 0 ? selected.join('、') : ''
    const result: any = {
      title: foodNames ? `用${ingredientText}做了：${foodNames}` : '有材料不知道做什么？到底吃啥哟，专业智能推荐！',
      path: '/pages/ingredient/ingredient',
    }
    if (shareImagePath.current) result.imageUrl = shareImagePath.current
    return result
  })

  useShareTimeline(() => {
    const foodNames = dishes.length > 0 ? dishes.map(d => d.name).join('、') : ''
    const result: any = {
      title: foodNames ? `御厨推荐：${foodNames}` : '有材料不知道做什么？到底吃啥哟，专业智能推荐！',
    }
    if (shareImagePath.current) result.imageUrl = shareImagePath.current
    return result
  })

  const addIngredient = useCallback((name: string) => {
    if (!name.trim()) return
    setSelected(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }, [])

  const removeIngredient = useCallback((name: string) => {
    setSelected(prev => prev.filter(s => s !== name))
  }, [])

  const handleInputConfirm = useCallback(() => {
    const val = inputValue.trim()
    if (val && !selected.includes(val)) {
      setSelected(prev => [...prev, val])
    }
    setInputValue('')
  }, [inputValue, selected])

  const handleRecommend = useCallback(async () => {
    if (selected.length === 0) {
      Taro.showToast({ title: '请先选择食材', icon: 'none' })
      return
    }
    loadMoreRequestRef.current += 1
    loadMoreInFlightRef.current = false
    setLoadingMore(false)
    const requestId = recommendationRequestRef.current + 1
    recommendationRequestRef.current = requestId
    const criteriaKey = makePrefetchKey(selected, preference, allowExtra)
    resultGenerationRef.current += 1
    activeDetailRequestsRef.current.clear()
    setLoading(true)
    setDishes([])
    setExpandedIndex(null)
    setUsingLocalFallback(false)

    try {
      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current)
        prefetchTimerRef.current = null
      }
      const matchingPrefetch = prefetchRef.current?.key === criteriaKey
        ? prefetchRef.current.promise
        : null
      prefetchRef.current = null

      const prefetched = matchingPrefetch ? await matchingPrefetch : null
      const response = prefetched ?? await fetchQuickRecommendations(
        makeQuickPayload(selected, preference, allowExtra),
      )
      if (
        requestId !== recommendationRequestRef.current
        || criteriaKey !== currentCriteriaKeyRef.current
      ) return
      if (response.dishes.length === 0) {
        throw new Error('Empty quick recommendation')
      }
      setDishes(response.dishes.map(dish => ({
        ...dish,
        detailStatus: 'idle' as const,
      })))
    } catch {
      if (
        requestId !== recommendationRequestRef.current
        || criteriaKey !== currentCriteriaKeyRef.current
      ) return
      setDishes(findLocalRecipesByIngredients(selected, 3).map(dish => ({
        ...dish,
        detailStatus: 'complete' as const,
      })))
      setUsingLocalFallback(true)
    } finally {
      if (requestId === recommendationRequestRef.current) {
        setLoading(false)
      }
    }
  }, [selected, preference, allowExtra])

  const handleLoadMore = useCallback(async () => {
    if (loadMoreInFlightRef.current || usingLocalFallback) return
    loadMoreInFlightRef.current = true
    const requestId = loadMoreRequestRef.current + 1
    loadMoreRequestRef.current = requestId
    const criteriaKey = currentCriteriaKeyRef.current
    const listGeneration = resultGenerationRef.current
    setLoadingMore(true)
    try {
      const response = await fetchQuickRecommendations(
        makeQuickPayload(
          selected,
          preference,
          allowExtra,
          dishes.map(dish => dish.name),
        ),
      )
      if (
        requestId !== loadMoreRequestRef.current
        || criteriaKey !== currentCriteriaKeyRef.current
        || listGeneration !== resultGenerationRef.current
      ) return
      setDishes(prev => {
        const existingNames = new Set(prev.map(dish => dish.name))
        const additions = response.dishes
          .filter(dish => !existingNames.has(dish.name))
          .map(dish => ({ ...dish, detailStatus: 'idle' as const }))
        return [...prev, ...additions]
      })
    } catch {
      // Existing cards remain usable; load-more failure is intentionally silent.
    } finally {
      if (requestId === loadMoreRequestRef.current) {
        loadMoreInFlightRef.current = false
        setLoadingMore(false)
      }
    }
  }, [selected, preference, allowExtra, dishes, usingLocalFallback])

  const toggleExpand = useCallback(async (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null)
      return
    }

    const dish = dishes[index]
    if (!dish) return
    setExpandedIndex(index)
    if (dish.detailStatus === 'complete') return

    const listGeneration = resultGenerationRef.current
    const detailKey = `${listGeneration}:${dish.name}:${index}`
    if (activeDetailRequestsRef.current.has(detailKey)) return
    const requestId = detailRequestCounterRef.current + 1
    detailRequestCounterRef.current = requestId
    activeDetailRequestsRef.current.set(detailKey, requestId)
    setLoadingStepIndex(index)
    setDishes(prev => prev.map((item, dishIndex) => (
      dishIndex === index
        ? { ...item, detailStatus: 'streaming' as const }
        : item
    )))

    const ownsRequest = () => (
      listGeneration === resultGenerationRef.current
      && activeDetailRequestsRef.current.get(detailKey) === requestId
    )
    try {
      const fullDish = await fetchDishStepsStreaming(
        dish.name,
        selected,
        streamedSteps => {
          if (!ownsRequest()) return
          setDishes(prev => prev.map((item, dishIndex) => (
            dishIndex === index && item.name === dish.name
              ? {
                  ...item,
                  steps: streamedSteps,
                  detailStatus: 'streaming' as const,
                }
              : item
          )))
        },
        3000,
        3000,
        {
          preferences: preference === '不限' ? null : preference,
          allowExtra,
        },
      )
      if (!ownsRequest()) return
      setDishes(prev => prev.map((item, dishIndex) => (
        dishIndex === index && item.name === dish.name
          ? { ...item, ...fullDish, detailStatus: 'complete' as const }
          : item
      )))
    } catch {
      if (!ownsRequest()) return
      setDishes(prev => prev.map((item, dishIndex) => (
        dishIndex === index && item.name === dish.name
          ? { ...item, steps: undefined, detailStatus: 'error' as const }
          : item
      )))
      Taro.showToast({ title: '做法加载失败，请重试', icon: 'none' })
    } finally {
      if (activeDetailRequestsRef.current.get(detailKey) === requestId) {
        activeDetailRequestsRef.current.delete(detailKey)
        setLoadingStepIndex(current => current === index ? null : current)
      }
    }
  }, [dishes, expandedIndex, selected, preference, allowExtra])

  return (
    <View className='ingredient'>
      {/* 隐藏的分享卡片画布 */}
      <Canvas type='2d' id='shareCanvas' style={{ position: 'fixed', left: '-9999px', width: '500px', height: '400px' }} />
      <ScrollView scrollY className='ingredient-scroll'>
        {/* 已选食材 */}
        {selected.length > 0 && (
          <View className='section'>
            <Text className='section-title'>已选食材</Text>
            <View className='selected-tags'>
              {selected.map(name => (
                <View key={name} className='selected-tag'>
                  <Text className='selected-tag-text'>{name}</Text>
                  <Text className='selected-tag-x' onClick={() => removeIngredient(name)}>✕</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 文字输入 */}
        <View className='section'>
          <Text className='section-title'>输入食材</Text>
          <View className='input-row'>
            <Input
              className='ingredient-input'
              placeholder='输入食材名，如：鸡蛋'
              value={inputValue}
              onInput={e => setInputValue(e.detail.value)}
              onConfirm={handleInputConfirm}
            />
            <View className='input-add-btn' onClick={handleInputConfirm}>
              <Text className='input-add-btn-text'>添加</Text>
            </View>
          </View>
        </View>

        {/* 常用食材分类 */}
        <View className='section'>
          <Text className='section-title'>常用食材</Text>
          <ScrollView scrollX className='category-scroll'>
            <View className='category-tabs'>
              {CATEGORIES.map(cat => (
                <Text
                  key={cat}
                  className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </Text>
              ))}
            </View>
          </ScrollView>
          <View className='ingredient-grid'>
            {COMMON_INGREDIENTS[activeCategory].map(name => (
              <View
                key={name}
                className={`ingredient-chip ${selected.includes(name) ? 'selected' : ''}`}
                onClick={() => addIngredient(name)}
              >
                <Text className='ingredient-chip-text'>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 偏好选择 */}
        <View className='section'>
          <Text className='section-title'>口味偏好</Text>
          <View className='pref-tags'>
            {PREFERENCES.map(p => (
              <Text
                key={p}
                className={`pref-tag ${preference === p ? 'active' : ''}`}
                onClick={() => setPreference(p)}
              >
                {p}
              </Text>
            ))}
          </View>
        </View>

        {/* 额外买菜开关 */}
        <View className='toggle-section'>
          <View className='toggle-row'>
            <View className='toggle-label'>
              <Text className='toggle-title'>允许额外买菜</Text>
              <Text className='toggle-subtitle'>可推荐需额外购买1-2种食材的菜</Text>
            </View>
            <View className={`toggle-switch ${allowExtra ? 'active' : ''}`} onClick={() => setAllowExtra(prev => !prev)}>
              <View className='toggle-knob' />
            </View>
          </View>
        </View>

        {/* 推荐按钮 / Loading 动画 */}
        {loading ? (
          <RecommendationLoading message={LOADING_MESSAGES[loadingMessageIndex]} />
        ) : (
          <View className='recommend-btn-wrapper'>
            <View
              className={`recommend-btn ${selected.length === 0 ? 'disabled' : ''}`}
              onClick={handleRecommend}
            >
              <Text className='recommend-btn-text'>开始推荐</Text>
            </View>
          </View>
        )}

        {/* 结果展示 */}
        {dishes.length > 0 && (
          <View className='results'>
            {usingLocalFallback && (
              <View className='section'>
                <Text className='dish-summary'>网络开小差，先看看这些经典搭配</Text>
                <View className='load-more-btn' onClick={handleRecommend}>
                  <Text className='load-more-btn-text'>重试</Text>
                </View>
              </View>
            )}
            <Text className='results-title'>为你推荐</Text>
            {dishes.map((dish, index) => (
              <DishCard
                key={`${resultGenerationRef.current}:${dish.name}:${index}`}
                dish={dish}
                expanded={expandedIndex === index}
                onToggle={() => toggleExpand(index)}
                loadingSteps={loadingStepIndex === index}
              />
            ))}
            {!usingLocalFallback && (
              <View className={`load-more-btn ${loadingMore ? 'loading' : ''}`} onClick={handleLoadMore}>
                <Text className='load-more-btn-text'>
                  {loadingMore ? '加载中...' : '加载更多 ▼'}
                </Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* 意见反馈悬浮按钮 */}
      <Button className='feedback-fab' openType='feedback'>
        <Text className='feedback-fab-text'>反馈</Text>
      </Button>
    </View>
  )
}
