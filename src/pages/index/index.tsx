import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import Taro, { useLoad, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useCallback, useRef, useMemo } from 'react'
import { getLocalRecipe, fetchRecipeFromAPI, type Recipe } from '../../data/recipes'
import './index.scss'

const defaultFoodList: Record<string, string[]> = {
  随便: ['自制豆腐', '红烧肉', '番茄炒蛋', '宫保鸡丁', '麻婆豆腐', '糖醋排骨', '鱼香肉丝', '回锅肉', '水煮鱼', '酸菜鱼', '蛋炒饭', '兰州拉面', '黄焖鸡', '螺蛳粉', '沙县小吃', '烤鸭', '火锅', '串串香', '小龙虾', '炸鸡'],
  奶茶类: ['珍珠奶茶', '杨枝甘露', '芋泥波波', '椰椰芒芒', '草莓摇摇乐', '多肉葡萄', '生椰拿铁', '柠檬茶', '芝芝莓莓', '烧仙草'],
  瘦身餐: ['鸡胸肉沙拉', '藜麦饭', '蒸西兰花', '全麦三明治', '牛油果吐司', '水煮虾仁', '清蒸鱼', '凉拌黄瓜', '紫薯燕麦粥', '低脂酸奶碗'],
  任性餐: ['芝士炸鸡', '奶油意面', '双层芝士汉堡', '烤肉拼盘', '披萨', '日式炸猪排', '冰淇淋火锅', '芝士焗龙虾', '甜甜圈', '提拉米苏'],
  附近: ['沙县小吃', '兰州拉面', '黄焖鸡米饭', '麻辣烫', '炸酱面', '煎饼果子', '肉夹馍', '烧烤', '麻辣香锅', '米粉'],
}

const defaultCategories = ['随便', '奶茶类', '瘦身餐', '任性餐', '附近']

// 食物图标沿问号路径排列（坐标为相对中心点的偏移，间距x1.2）
const questionMarkIcons = [
  // "?" 顶部弧线
  { dx: -137, dy: -114, icon: '🍕', rotate: -15 },
  { dx: -89,  dy: -150, icon: '🍜', rotate: 10 },
  { dx: -35,  dy: -165, icon: '🍔', rotate: -5 },
  { dx: 19,   dy: -160, icon: '🧋', rotate: 12 },
  { dx: 67,   dy: -132, icon: '🍰', rotate: -8 },
  { dx: 89,   dy: -90,  icon: '🍣', rotate: 15 },
  { dx: 79,   dy: -42,  icon: '🥗', rotate: -10 },
  { dx: 49,   dy: -6,   icon: '🍳', rotate: 5 },
  // 问号中间竖线
  { dx: 13,   dy: 30,   icon: '🍩', rotate: -12 },
  { dx: -11,  dy: 66,   icon: '🍟', rotate: 8 },
  { dx: -23,  dy: 108,  icon: '🥤', rotate: -5 },
  // 问号底部的点
  { dx: -23,  dy: 174,  icon: '🍱', rotate: 10 },
]

// 食物图标拼成正方形边框（半边长 270rpx，中心与问号重合）
const S = 270
const squareIcons = [
  // 上边（左→右）
  { dx: -S,   dy: -S,   icon: '🌮', rotate: -10 },
  { dx: -S/2, dy: -S,   icon: '🥘', rotate: 15 },
  { dx: 0,    dy: -S,   icon: '🍝', rotate: -5 },
  { dx: S/2,  dy: -S,   icon: '🥐', rotate: 8 },
  { dx: S,    dy: -S,   icon: '🍤', rotate: -12 },
  // 右边（上→下，跳过角）
  { dx: S,    dy: -S/2, icon: '🍡', rotate: 10 },
  { dx: S,    dy: 0,    icon: '🥧', rotate: -8 },
  { dx: S,    dy: S/2,  icon: '🧁', rotate: 5 },
  // 下边（右→左）
  { dx: S,    dy: S,    icon: '🍿', rotate: -15 },
  { dx: S/2,  dy: S,    icon: '🥨', rotate: 12 },
  { dx: 0,    dy: S,    icon: '🌯', rotate: -5 },
  { dx: -S/2, dy: S,    icon: '🍘', rotate: 8 },
  { dx: -S,   dy: S,    icon: '🥮', rotate: -10 },
  // 左边（下→上，跳过角）
  { dx: -S,   dy: S/2,  icon: '🍙', rotate: 15 },
  { dx: -S,   dy: 0,    icon: '🥟', rotate: -8 },
  { dx: -S,   dy: -S/2, icon: '🧆', rotate: 5 },
]

export default function Index() {
  const [activeCategory, setActiveCategory] = useState('随便')
  const [currentFood, setCurrentFood] = useState('今天吃啥？')
  const [isRolling, setIsRolling] = useState(false)
  const [count, setCount] = useState(1)
  const [resultList, setResultList] = useState<string[]>([])
  const [showRecipe, setShowRecipe] = useState(false)
  const [popupFoods, setPopupFoods] = useState<string[]>([])
  const [activePopupIndex, setActivePopupIndex] = useState(0)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const recipeCacheRef = useRef<Record<string, Recipe | null>>({})

  // 自定义菜单状态
  const [customFoodList, setCustomFoodList] = useState<Record<string, string[]>>({})
  const [showCustomMenu, setShowCustomMenu] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newFoodInputs, setNewFoodInputs] = useState<Record<string, string>>({})

  // 合并默认 + 自定义
  const mergedFoodList = useMemo(() => ({ ...defaultFoodList, ...customFoodList }), [customFoodList])
  const allCategories = useMemo(() => [...defaultCategories, ...Object.keys(customFoodList)], [customFoodList])

  useLoad(() => {
    console.log('Page loaded.')
    const stored = Taro.getStorageSync('customFoodList')
    if (stored && typeof stored === 'object') {
      setCustomFoodList(stored)
    }
  })

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

  const handleRefreshItem = useCallback((index: number) => {
    const list = mergedFoodList[activeCategory] || mergedFoodList['随便']
    const others = resultList.filter((_, i) => i !== index)
    const available = list.filter(f => !others.includes(f))
    if (available.length === 0) return
    const newFood = available[Math.floor(Math.random() * available.length)]
    setResultList(prev => prev.map((f, i) => i === index ? newFood : f))
  }, [activeCategory, resultList, mergedFoodList])

  const handleStart = useCallback(() => {
    if (isRolling) return
    setIsRolling(true)
    setResultList([])

    const list = mergedFoodList[activeCategory] || mergedFoodList['随便']
    let tick = 0
    const maxTick = 15
    const timer = setInterval(() => {
      setCurrentFood(list[Math.floor(Math.random() * list.length)])
      tick++
      if (tick >= maxTick) {
        clearInterval(timer)
        if (count === 1) {
          setCurrentFood(list[Math.floor(Math.random() * list.length)])
        } else {
          const n = Math.min(count, list.length)
          const shuffled = [...list].sort(() => Math.random() - 0.5)
          setResultList(shuffled.slice(0, n))
        }
        setIsRolling(false)
      }
    }, 100)
  }, [isRolling, activeCategory, count, mergedFoodList])

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
    Taro.navigateTo({
      url: `/pages/recipe/recipe?name=${encodeURIComponent(recipe.name)}`,
    })
  }, [popupFoods, activePopupIndex])

  // ===== 自定义菜单操作 =====
  const saveCustomList = useCallback((newList: Record<string, string[]>) => {
    setCustomFoodList(newList)
    Taro.setStorageSync('customFoodList', newList)
  }, [])

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
    saveCustomList({ ...customFoodList, [name]: [] })
    setNewCategoryName('')
    setShowAddCategory(false)
  }, [newCategoryName, customFoodList, saveCustomList])

  const handleDeleteCategory = useCallback((name: string) => {
    Taro.showModal({
      title: '删除分类',
      content: `确定删除「${name}」及其所有食物？`,
      success: (res) => {
        if (res.confirm) {
          const newList = { ...customFoodList }
          delete newList[name]
          saveCustomList(newList)
          if (activeCategory === name) {
            setActiveCategory('随便')
          }
        }
      },
    })
  }, [customFoodList, saveCustomList, activeCategory])

  const handleAddFood = useCallback((category: string) => {
    const food = (newFoodInputs[category] || '').trim()
    if (!food) return
    if (customFoodList[category]?.includes(food)) {
      Taro.showToast({ title: '食物已存在', icon: 'none' })
      return
    }
    saveCustomList({
      ...customFoodList,
      [category]: [...(customFoodList[category] || []), food],
    })
    setNewFoodInputs(prev => ({ ...prev, [category]: '' }))
  }, [newFoodInputs, customFoodList, saveCustomList])

  const handleDeleteFood = useCallback((category: string, food: string) => {
    saveCustomList({
      ...customFoodList,
      [category]: customFoodList[category].filter(f => f !== food),
    })
  }, [customFoodList, saveCustomList])

  return (
    <View className='index'>
      {/* 主内容 */}
      <View className='content'>
        {/* 食物名称展示 */}
        <View className='food-display'>
          {/* 正方形边框食物图标 */}
          {squareIcons.map((item, i) => (
            <Text
              key={`sq-${i}`}
              className='qm-icon'
              style={{
                left: '50%',
                top: '50%',
                marginLeft: `${item.dx}rpx`,
                marginTop: `${item.dy}rpx`,
                transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
              }}
            >
              {item.icon}
            </Text>
          ))}
          {/* 问号形状的食物图标 */}
          {questionMarkIcons.map((item, i) => (
            <Text
              key={i}
              className='qm-icon'
              style={{
                left: '50%',
                top: '50%',
                marginLeft: `${item.dx}rpx`,
                marginTop: `${item.dy}rpx`,
                transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
              }}
            >
              {item.icon}
            </Text>
          ))}
          {resultList.length > 1 ? (
            <View className='result-list'>
              {resultList.map((food, i) => (
                <View key={i} className='result-row'>
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
            <Text className={`food-name ${isRolling ? 'rolling' : ''}`}>{currentFood}</Text>
          )}
        </View>

        {/* 功能按钮 */}
        <View className='actions'>
          <View className='action-row'>
            <View className='action-item disabled'>
              <Text className='action-icon'>🛵</Text>
              <Text className='action-text'>去点外卖</Text>
            </View>
            <Button className='share-btn' openType='share'>
              <View className='action-item'>
                <Text className='action-icon'>🔗</Text>
                <Text className='action-text'>分享美食</Text>
              </View>
            </Button>
          </View>
          <View className='action-row center'>
            <View className='action-item' onClick={handleRecipeClick}>
              <Text className='action-icon'>📋</Text>
              <Text className='action-text'>查看菜谱</Text>
            </View>
          </View>
        </View>

        {/* 分类标签 */}
        <ScrollView scrollX className='categories-scroll'>
          <View className='categories'>
            {allCategories.map((cat) => (
              <Text
                key={cat}
                className={`category-tag ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Text>
            ))}
          </View>
        </ScrollView>

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
          <View className={`start-btn ${isRolling ? 'disabled' : ''}`} onClick={handleStart}>
            <Text className='start-btn-text'>{isRolling ? '选择中...' : '开始'}</Text>
          </View>
        </View>

        {/* 底部链接 */}
        <View className='bottom-links'>
          <Text className='link-text' onClick={() => setShowCustomMenu(true)}>自定义菜单</Text>
          <Text className='link-text'>菜单下载</Text>
        </View>
      </View>

      {/* 自定义菜单弹窗 */}
      {showCustomMenu && (
        <View className='recipe-overlay' onClick={() => setShowCustomMenu(false)}>
          <View className='recipe-popup custom-menu-popup' onClick={(e) => e.stopPropagation()}>
            {/* 标题栏 */}
            <View className='custom-menu-header'>
              <Text className='custom-menu-title'>我的菜单</Text>
              <View className='custom-menu-close' onClick={() => setShowCustomMenu(false)}>
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
      )}

      {/* 菜谱弹窗 */}
      {showRecipe && (
        <View className='recipe-overlay' onClick={() => setShowRecipe(false)}>
          <View className='recipe-popup' onClick={(e) => e.stopPropagation()}>
            {/* 多菜切换标签 */}
            {popupFoods.length > 1 && (
              <ScrollView scrollX className='recipe-tab-scroll'>
                <View className='recipe-tabs'>
                  {popupFoods.map((food, i) => (
                    <View
                      key={i}
                      className={`recipe-tab ${i === activePopupIndex ? 'active' : ''}`}
                      onClick={() => handleSwitchFood(i)}
                    >
                      <Text className={`recipe-tab-text ${i === activePopupIndex ? 'active' : ''}`}>{food}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* 内容区 */}
            {(() => {
              const activeFoodName = popupFoods[activePopupIndex]
              const activeRecipe = recipeCacheRef.current[activeFoodName]

              if (recipeLoading && activeRecipe === undefined) {
                return (
                  <View className='recipe-popup-loading'>
                    <Text className='recipe-popup-loading-text'>搜索菜谱中...</Text>
                  </View>
                )
              }

              if (!activeRecipe) {
                return (
                  <View className='recipe-popup-empty'>
                    <Text className='recipe-popup-empty-icon'>🤷</Text>
                    <Text className='recipe-popup-empty-text'>暂无「{activeFoodName}」的菜谱</Text>
                    <View className='recipe-popup-close-btn' onClick={() => setShowRecipe(false)}>
                      <Text className='recipe-popup-close-btn-text'>知道了</Text>
                    </View>
                  </View>
                )
              }

              return (
                <View className='recipe-popup-content'>
                  {popupFoods.length <= 1 && (
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
                    <View className='recipe-popup-detail-btn' onClick={handleViewDetail}>
                      <Text className='recipe-popup-detail-btn-text'>查看详细做法</Text>
                    </View>
                    <View className='recipe-popup-dismiss' onClick={() => setShowRecipe(false)}>
                      <Text className='recipe-popup-dismiss-text'>关闭</Text>
                    </View>
                  </View>
                </View>
              )
            })()}
          </View>
        </View>
      )}
    </View>
  )
}
