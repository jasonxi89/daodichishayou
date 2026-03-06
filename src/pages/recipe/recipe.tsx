import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { getLocalRecipe, fetchRecipeFromAPI, type Recipe } from '../../data/recipes'
import './recipe.scss'

export default function RecipePage() {
  const router = useRouter()
  const name = decodeURIComponent(router.params.name || '')
  const difficulty = decodeURIComponent(router.params.difficulty || '')
  const cookTime = decodeURIComponent(router.params.cook_time || '')
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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

  useShareAppMessage(() => ({
    title: recipe ? `跟我一起做${recipe.name}` : '到底吃啥哟 - 美食菜谱',
    path: `/pages/recipe/recipe?name=${encodeURIComponent(name)}`,
  }))

  if (loading) {
    return (
      <View className='recipe-page'>
        <View className='recipe-top-bar' />
        <View className='recipe-header'>
          <Text className='recipe-title'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!recipe) {
    return (
      <View className='recipe-page'>
        <View className='recipe-top-bar' />
        <View className='recipe-header'>
          <Text className='recipe-title'>暂无菜谱</Text>
          <Text className='recipe-summary'>「{name}」的菜谱暂未收录</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='recipe-page'>
      <View className='recipe-top-bar' />

      <View className='recipe-header-card'>
        <Text className='recipe-title'>{recipe.name}</Text>
        <Text className='recipe-summary'>{recipe.summary}</Text>
        {(difficulty || cookTime) && (
          <View className='recipe-meta'>
            {difficulty && <Text className='meta-tag'>{difficulty}</Text>}
            {cookTime && <Text className='meta-tag'>{cookTime}</Text>}
          </View>
        )}
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
            <View key={i} className='step-card'>
              <View className='step-card-accent' />
              <View className='step-card-body'>
                <View className='step-number'>
                  <Text>{i + 1}</Text>
                </View>
                <Text className='step-text'>{step}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='recipe-footer'>
        <Button className='share-recipe-btn' openType='share'>
          <Text className='share-recipe-btn-text'>分享菜谱给朋友</Text>
        </Button>
        <Text className='footer-text'>开始动手吧，你一定能做好!</Text>
      </View>
    </View>
  )
}
