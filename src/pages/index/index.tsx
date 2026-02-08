import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import './index.scss'

const foodList: Record<string, string[]> = {
  随便: ['自制豆腐', '红烧肉', '番茄炒蛋', '宫保鸡丁', '麻婆豆腐', '糖醋排骨', '鱼香肉丝', '回锅肉', '水煮鱼', '酸菜鱼', '蛋炒饭', '兰州拉面', '黄焖鸡', '螺蛳粉', '沙县小吃', '烤鸭', '火锅', '串串香', '小龙虾', '炸鸡'],
  奶茶类: ['珍珠奶茶', '杨枝甘露', '芋泥波波', '椰椰芒芒', '草莓摇摇乐', '多肉葡萄', '生椰拿铁', '柠檬茶', '芝芝莓莓', '烧仙草'],
  瘦身餐: ['鸡胸肉沙拉', '藜麦饭', '蒸西兰花', '全麦三明治', '牛油果吐司', '水煮虾仁', '清蒸鱼', '凉拌黄瓜', '紫薯燕麦粥', '低脂酸奶碗'],
  任性餐: ['芝士炸鸡', '奶油意面', '双层芝士汉堡', '烤肉拼盘', '披萨', '日式炸猪排', '冰淇淋火锅', '芝士焗龙虾', '甜甜圈', '提拉米苏'],
  附近: ['沙县小吃', '兰州拉面', '黄焖鸡米饭', '麻辣烫', '炸酱面', '煎饼果子', '肉夹馍', '烧烤', '麻辣香锅', '米粉'],
}

const categories = ['随便', '奶茶类', '瘦身餐', '任性餐', '附近']

function getRandomFood(category: string): string {
  const list = foodList[category] || foodList['随便']
  return list[Math.floor(Math.random() * list.length)]
}

export default function Index() {
  const [activeCategory, setActiveCategory] = useState('随便')
  const [currentFood, setCurrentFood] = useState('今天吃啥？')
  const [isRolling, setIsRolling] = useState(false)

  useLoad(() => {
    console.log('Page loaded.')
  })

  const handleStart = useCallback(() => {
    if (isRolling) return
    setIsRolling(true)

    let count = 0
    const maxCount = 15
    const timer = setInterval(() => {
      setCurrentFood(getRandomFood(activeCategory))
      count++
      if (count >= maxCount) {
        clearInterval(timer)
        setIsRolling(false)
      }
    }, 100)
  }, [isRolling, activeCategory])

  return (
    <View className='index'>
      {/* 主内容 */}
      <View className='content'>
        {/* 食物名称展示 */}
        <View className='food-display'>
          <Text className={`food-name ${isRolling ? 'rolling' : ''}`}>{currentFood}</Text>
        </View>

        {/* 功能按钮 */}
        <View className='actions'>
          <View className='action-row'>
            <View className='action-item'>
              <Text className='action-icon'>🛵</Text>
              <Text className='action-text'>去点外卖</Text>
            </View>
            <View className='action-item'>
              <Text className='action-icon'>🔗</Text>
              <Text className='action-text'>分享美食</Text>
            </View>
          </View>
          <View className='action-row center'>
            <View className='action-item'>
              <Text className='action-icon'>📋</Text>
              <Text className='action-text'>万能炒菜公式</Text>
            </View>
          </View>
        </View>

        {/* 分类标签 */}
        <View className='categories'>
          {categories.map((cat) => (
            <Text
              key={cat}
              className={`category-tag ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Text>
          ))}
        </View>

        {/* 开始按钮 */}
        <View className='start-btn-wrapper'>
          <View className={`start-btn ${isRolling ? 'disabled' : ''}`} onClick={handleStart}>
            <Text className='start-btn-text'>{isRolling ? '选择中...' : '开始'}</Text>
          </View>
        </View>

        {/* 底部链接 */}
        <View className='bottom-links'>
          <Text className='link-text'>自定义菜单</Text>
          <Text className='link-text'>菜单下载</Text>
        </View>
      </View>
    </View>
  )
}
