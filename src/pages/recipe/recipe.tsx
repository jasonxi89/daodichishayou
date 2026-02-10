import { View, Text } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { getLocalRecipe, fetchRecipeFromAPI, type Recipe } from '../../data/recipes'
import './recipe.scss'

export default function RecipePage() {
  const router = useRouter()
  const name = decodeURIComponent(router.params.name || '')
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // 优先本地
      let r = getLocalRecipe(name)
      if (!r) {
        r = await fetchRecipeFromAPI(name)
      }
      setRecipe(r)
      setLoading(false)
    }
    if (name) load()
    else setLoading(false)
  }, [name])

  if (loading) {
    return (
      <View className='recipe-page'>
        <View className='recipe-header'>
          <Text className='recipe-title'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!recipe) {
    return (
      <View className='recipe-page'>
        <View className='recipe-header'>
          <Text className='recipe-title'>暂无菜谱</Text>
          <Text className='recipe-summary'>「{name}」的菜谱暂未收录</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='recipe-page'>
      <View className='recipe-header'>
        <Text className='recipe-title'>{recipe.name}</Text>
        <Text className='recipe-summary'>{recipe.summary}</Text>
      </View>

      <View className='recipe-section'>
        <Text className='section-title'>食材准备</Text>
        <View className='ingredient-list'>
          {recipe.ingredients.map((item, i) => (
            <Text key={i} className='ingredient-tag'>{item}</Text>
          ))}
        </View>
      </View>

      <View className='recipe-section'>
        <Text className='section-title'>做法步骤</Text>
        <View className='step-list'>
          {recipe.steps.map((step, i) => (
            <View key={i} className='step-item'>
              <View className='step-number'>
                <Text>{i + 1}</Text>
              </View>
              <Text className='step-text'>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='recipe-footer'>
        <Text className='footer-text'>祝你做出美味佳肴 🍳</Text>
      </View>
    </View>
  )
}
