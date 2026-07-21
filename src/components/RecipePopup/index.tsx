import { View, Text, ScrollView } from '@tarojs/components'
import type { Recipe } from '../../data/recipes'
import './index.scss'

interface RecipePopupProps {
  foods: string[]
  activeIndex: number
  recipes: Record<string, Recipe | null>
  isLoading: boolean
  onSwitchFood: (index: number) => void
  onViewDetail: () => void
  onClose: () => void
}

// 菜谱预览弹窗：多菜切换 + 摘要/食材预览 + 跳转详情
export default function RecipePopup(props: RecipePopupProps) {
  const { foods, activeIndex, recipes, isLoading, onSwitchFood, onViewDetail, onClose } = props
  const activeFoodName = foods[activeIndex]
  const activeRecipe = recipes[activeFoodName]

  return (
    <View className='recipe-overlay' onClick={onClose}>
      <View className='recipe-popup' onClick={(e) => e.stopPropagation()}>
        {/* 多菜切换标签 */}
        {foods.length > 1 && (
          <ScrollView scrollX className='recipe-tab-scroll'>
            <View className='recipe-tabs'>
              {foods.map((food, i) => (
                <View
                  key={i}
                  className={`recipe-tab ${i === activeIndex ? 'active' : ''}`}
                  onClick={() => onSwitchFood(i)}
                >
                  <Text className={`recipe-tab-text ${i === activeIndex ? 'active' : ''}`}>{food}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* 内容区 */}
        {isLoading && activeRecipe === undefined ? (
          <View className='recipe-popup-loading'>
            <Text className='recipe-popup-loading-text'>搜索菜谱中...</Text>
          </View>
        ) : !activeRecipe ? (
          <View className='recipe-popup-empty'>
            <Text className='recipe-popup-empty-icon'>🤷</Text>
            <Text className='recipe-popup-empty-text'>暂无「{activeFoodName}」的菜谱</Text>
            <View className='recipe-popup-close-btn' onClick={onClose}>
              <Text className='recipe-popup-close-btn-text'>知道了</Text>
            </View>
          </View>
        ) : (
          <View className='recipe-popup-content'>
            {foods.length <= 1 && (
              <Text className='recipe-popup-title'>{activeRecipe.name}</Text>
            )}
            <Text className='recipe-popup-summary'>{activeRecipe.summary}</Text>
            <View className='recipe-popup-ingredients'>
              <Text className='recipe-popup-label'>食材</Text>
              <View className='recipe-popup-tags'>
                {activeRecipe.ingredients.slice(0, 6).map((item, i) => (
                  <Text key={i} className='recipe-popup-tag'>{item}</Text>
                ))}
                {activeRecipe.ingredients.length > 6 && (
                  <Text className='recipe-popup-tag more'>+{activeRecipe.ingredients.length - 6}</Text>
                )}
              </View>
            </View>
            <View className='recipe-popup-actions'>
              <View className='recipe-popup-detail-btn' onClick={onViewDetail}>
                <Text className='recipe-popup-detail-btn-text'>查看详细做法</Text>
              </View>
              <View className='recipe-popup-dismiss' onClick={onClose}>
                <Text className='recipe-popup-dismiss-text'>关闭</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
