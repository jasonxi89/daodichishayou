import { Text, View } from '@tarojs/components'

export interface RecommendedDish {
  name: string
  summary: string
  ingredients: string[]
  steps: string[]
  difficulty?: string
  cook_time?: string
  extra_ingredients?: string[]
}

const EXTRA_MARKER = String.fromCodePoint(0x1f6d2)

interface DishCardProps {
  dish: RecommendedDish
  expanded: boolean
  onToggle: () => void
}

export default function DishCard({ dish, expanded, onToggle }: DishCardProps) {
  return (
    <View className='dish-card' onClick={onToggle}>
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
        {expanded ? '收起详情 ▲' : '查看详情 ▼'}
      </Text>
      {expanded && (
        <View className='dish-detail'>
          <View className='dish-ingredients'>
            <Text className='dish-detail-label'>食材清单</Text>
            <View className='dish-ingredient-tags'>
              {dish.ingredients.map((item, index) => {
                const isExtra = dish.extra_ingredients?.some(extra => item.includes(extra))
                return (
                  <Text key={index} className={`dish-ingredient-tag ${isExtra ? 'extra' : ''}`}>
                    {isExtra ? `${EXTRA_MARKER} ${item}` : item}
                  </Text>
                )
              })}
            </View>
            {dish.extra_ingredients && dish.extra_ingredients.length > 0 && (
              <Text className='extra-hint'>{EXTRA_MARKER} = 需额外购买</Text>
            )}
          </View>
          <View className='dish-steps'>
            <Text className='dish-detail-label'>做法步骤</Text>
            {dish.steps.map((step, index) => (
              <View key={index} className='dish-step'>
                <Text className='dish-step-num'>{index + 1}</Text>
                <Text className='dish-step-text'>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}
