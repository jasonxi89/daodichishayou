import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useCallback } from 'react'
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
}

export default function Ingredient() {
  const [selected, setSelected] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('蔬菜')
  const [inputValue, setInputValue] = useState('')
  const [preference, setPreference] = useState('不限')
  const [loading, setLoading] = useState(false)
  const [dishes, setDishes] = useState<RecommendedDish[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

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
  }, [selected, preference])

  const toggleExpand = useCallback((index: number) => {
    setExpandedIndex(prev => prev === index ? null : index)
  }, [])

  return (
    <View className='ingredient'>
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
                        {dish.ingredients.map((item, i) => (
                          <Text key={i} className='dish-ingredient-tag'>{item}</Text>
                        ))}
                      </View>
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
          </View>
        )}

        {/* 底部留白 */}
        <View className='bottom-spacer' />
      </ScrollView>
    </View>
  )
}
