import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { defaultCategories } from '../../data/defaultFoods'

interface CustomMenuPopupProps {
  customFoodList: Record<string, string[]>
  onSave: (newList: Record<string, string[]>) => void
  onClose: () => void
  onCategoryAdded: (name: string) => void
  onCategoryDeleted: (name: string) => void
}

// 自定义菜单弹窗：管理用户自建分类和食物
export default function CustomMenuPopup(props: CustomMenuPopupProps) {
  const { customFoodList, onSave, onClose, onCategoryAdded, onCategoryDeleted } = props
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newFoodInputs, setNewFoodInputs] = useState<Record<string, string>>({})

  const handleAddCategory = useCallback(() => {
    const name = newCategoryName.trim()
    if (!name) {
      Taro.showToast({ title: '分类名不能为空', icon: 'none' })
      return
    }
    if (defaultCategories.includes(name) || customFoodList[name] !== undefined) {
      Taro.showToast({ title: '分类已存在', icon: 'none' })
      return
    }
    onSave({ ...customFoodList, [name]: [] })
    setNewCategoryName('')
    setShowAddCategory(false)
    onCategoryAdded(name)
  }, [newCategoryName, customFoodList, onSave, onCategoryAdded])

  const handleDeleteCategory = useCallback((name: string) => {
    Taro.showModal({
      title: '删除分类',
      content: `确定删除「${name}」及其所有食物？`,
      success: (res) => {
        if (res.confirm) {
          const newList = { ...customFoodList }
          delete newList[name]
          onSave(newList)
          onCategoryDeleted(name)
        }
      },
    })
  }, [customFoodList, onSave, onCategoryDeleted])

  const handleAddFood = useCallback((category: string) => {
    const food = (newFoodInputs[category] || '').trim()
    if (!food) return
    if (customFoodList[category] && customFoodList[category].includes(food)) {
      Taro.showToast({ title: '食物已存在', icon: 'none' })
      return
    }
    onSave({
      ...customFoodList,
      [category]: [...(customFoodList[category] || []), food],
    })
    setNewFoodInputs(prev => ({ ...prev, [category]: '' }))
  }, [newFoodInputs, customFoodList, onSave])

  const handleDeleteFood = useCallback((category: string, food: string) => {
    onSave({
      ...customFoodList,
      [category]: customFoodList[category].filter(f => f !== food),
    })
  }, [customFoodList, onSave])

  return (
    <View className='recipe-overlay' onClick={onClose}>
      <View className='recipe-popup custom-menu-popup' onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <View className='custom-menu-header'>
          <Text className='custom-menu-title'>我的菜单</Text>
          <View className='custom-menu-close' onClick={onClose}>
            <Text className='custom-menu-close-text'>✕</Text>
          </View>
        </View>

        <ScrollView scrollY className='custom-menu-body'>
          {/* 自定义分类列表 */}
          {Object.keys(customFoodList).length === 0 && !showAddCategory && (
            <View className='custom-menu-empty'>
              <Text className='custom-menu-empty-text'>还没有自定义分类，点击下方添加</Text>
            </View>
          )}

          {Object.entries(customFoodList).map(([catName, foods]) => (
            <View key={catName} className='custom-cat-section'>
              <View className='custom-cat-header'>
                <View className='custom-cat-info'>
                  <Text className='custom-cat-name'>{catName}</Text>
                  <Text className='custom-cat-count'>{foods.length}个食物</Text>
                </View>
                <View className='custom-cat-delete' onClick={() => handleDeleteCategory(catName)}>
                  <Text className='custom-cat-delete-text'>删除</Text>
                </View>
              </View>

              {/* 食物标签 */}
              <View className='custom-food-tags'>
                {foods.map((food) => (
                  <View key={food} className='custom-food-tag'>
                    <Text className='custom-food-tag-text'>{food}</Text>
                    <Text className='custom-food-tag-x' onClick={() => handleDeleteFood(catName, food)}>✕</Text>
                  </View>
                ))}
              </View>

              {/* 添加食物输入 */}
              <View className='custom-add-food'>
                <Input
                  className='custom-add-food-input'
                  placeholder='添加食物...'
                  value={newFoodInputs[catName] || ''}
                  onInput={(e) => setNewFoodInputs(prev => ({ ...prev, [catName]: e.detail.value }))}
                  onConfirm={() => handleAddFood(catName)}
                />
                <View className='custom-add-food-btn' onClick={() => handleAddFood(catName)}>
                  <Text className='custom-add-food-btn-text'>+</Text>
                </View>
              </View>
            </View>
          ))}

          {/* 添加新分类 */}
          {showAddCategory ? (
            <View className='custom-new-cat'>
              <Input
                className='custom-new-cat-input'
                placeholder='输入分类名...'
                value={newCategoryName}
                onInput={(e) => setNewCategoryName(e.detail.value)}
                onConfirm={handleAddCategory}
                focus
              />
              <View className='custom-new-cat-actions'>
                <View className='custom-new-cat-confirm' onClick={handleAddCategory}>
                  <Text className='custom-new-cat-confirm-text'>确定</Text>
                </View>
                <View className='custom-new-cat-cancel' onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}>
                  <Text className='custom-new-cat-cancel-text'>取消</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className='custom-add-cat-btn' onClick={() => setShowAddCategory(true)}>
              <Text className='custom-add-cat-btn-text'>+ 添加新分类</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  )
}
