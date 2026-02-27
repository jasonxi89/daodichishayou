import { View, Text, ScrollView, Input, Canvas } from '@tarojs/components'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useCallback, useRef, useEffect } from 'react'
import './ingredient.scss'

const COMMON_INGREDIENTS: Record<string, string[]> = {
  '蔬菜': ['番茄', '土豆', '白菜', '青椒', '黄瓜', '茄子', '西兰花', '胡萝卜', '菠菜', '洋葱', '蘑菇', '豆芽'],
  '肉类': ['鸡胸肉', '猪肉', '牛肉', '排骨', '五花肉', '鸡翅', '鸡腿', '肉末'],
  '水产蛋奶': ['虾', '鱼', '豆腐', '鸡蛋', '牛奶'],
  '主食': ['米饭', '面条', '馒头', '饺子皮', '面粉'],
}

const CATEGORIES = Object.keys(COMMON_INGREDIENTS)

const PREFERENCES = ['不限', '清淡', '家常', '快手菜', '下饭菜', '减脂']

interface RecommendedDish {
  name: string
  summary: string
  ingredients: string[]
  steps: string[]
  difficulty?: string
  cook_time?: string
  extra_ingredients?: string[]
}

export default function Ingredient() {
  const [selected, setSelected] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('蔬菜')
  const [inputValue, setInputValue] = useState('')
  const [preference, setPreference] = useState('不限')
  const [loading, setLoading] = useState(false)
  const [dishes, setDishes] = useState<RecommendedDish[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [allowExtra, setAllowExtra] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const shareImagePath = useRef('')

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
    setLoading(true)
    setDishes([])
    setExpandedIndex(null)

    try {
      const res = await Taro.request({
        url: `${API_BASE}/api/recommend`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: {
          ingredients: selected,
          count: 3,
          preferences: preference === '不限' ? null : preference,
          allow_extra: allowExtra,
        },
        timeout: 30000,
      })

      if (res.statusCode === 200 && res.data.dishes) {
        setDishes(res.data.dishes)
      } else {
        Taro.showToast({ title: '推荐失败，请重试', icon: 'none' })
      }
    } catch {
      Taro.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [selected, preference, allowExtra])

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const res = await Taro.request({
        url: `${API_BASE}/api/recommend`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: {
          ingredients: selected,
          count: 3,
          preferences: preference === '不限' ? null : preference,
          allow_extra: allowExtra,
          exclude_dishes: dishes.map(d => d.name),
        },
        timeout: 30000,
      })
      if (res.statusCode === 200 && res.data.dishes) {
        setDishes(prev => [...prev, ...res.data.dishes])
      } else {
        Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
      }
    } catch {
      Taro.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      setLoadingMore(false)
    }
  }, [selected, preference, allowExtra, dishes])

  const toggleExpand = useCallback((index: number) => {
    setExpandedIndex(prev => prev === index ? null : index)
  }, [])

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
          <View className='thinking-box'>
            <Text className='thinking-emoji'>🤔</Text>
            <View className='thinking-dots'>
              <Text className='thinking-text'>我想想</Text>
              <Text className='dot dot1'>.</Text>
              <Text className='dot dot2'>.</Text>
              <Text className='dot dot3'>.</Text>
              <Text className='dot dot4'>.</Text>
            </View>
          </View>
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
            <Text className='results-title'>为你推荐</Text>
            {dishes.map((dish, index) => (
              <View key={index} className='dish-card' onClick={() => toggleExpand(index)}>
                <View className='dish-header'>
                  <View className='dish-info'>
                    <Text className='dish-name'>{dish.name}</Text>
                    <Text className='dish-summary'>{dish.summary}</Text>
                  </View>
                  <View className='dish-meta'>
                    {dish.difficulty && <Text className='dish-badge'>{dish.difficulty}</Text>}
                    {dish.cook_time && <Text className='dish-time'>{dish.cook_time}</Text>}
                  </View>
                </View>
                <Text className='dish-expand-hint'>
                  {expandedIndex === index ? '收起详情 ▲' : '查看详情 ▼'}
                </Text>
                {expandedIndex === index && (
                  <View className='dish-detail'>
                    <View className='dish-ingredients'>
                      <Text className='dish-detail-label'>食材清单</Text>
                      <View className='dish-ingredient-tags'>
                        {dish.ingredients.map((item, i) => {
                          const isExtra = dish.extra_ingredients?.some(extra => item.includes(extra))
                          return (
                            <Text key={i} className={`dish-ingredient-tag ${isExtra ? 'extra' : ''}`}>
                              {isExtra ? `🛒 ${item}` : item}
                            </Text>
                          )
                        })}
                      </View>
                      {dish.extra_ingredients && dish.extra_ingredients.length > 0 && (
                        <Text className='extra-hint'>🛒 = 需额外购买</Text>
                      )}
                    </View>
                    <View className='dish-steps'>
                      <Text className='dish-detail-label'>做法步骤</Text>
                      {dish.steps.map((step, i) => (
                        <View key={i} className='dish-step'>
                          <Text className='dish-step-num'>{i + 1}</Text>
                          <Text className='dish-step-text'>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
            <View className={`load-more-btn ${loadingMore ? 'loading' : ''}`} onClick={handleLoadMore}>
              <Text className='load-more-btn-text'>
                {loadingMore ? '加载中...' : '加载更多 ▼'}
              </Text>
            </View>
          </View>
        )}

        {/* 底部留白 */}
      </ScrollView>
    </View>
  )
}
