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

function getRandomFoods(category: string, n: number): string[] {
  const list = foodList[category] || foodList['随便']
  const count = Math.min(n, list.length)
  const shuffled = [...list].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

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

  useLoad(() => {
    console.log('Page loaded.')
  })

  const handleRefreshItem = useCallback((index: number) => {
    const list = foodList[activeCategory] || foodList['随便']
    const others = resultList.filter((_, i) => i !== index)
    const available = list.filter(f => !others.includes(f))
    if (available.length === 0) return
    const newFood = available[Math.floor(Math.random() * available.length)]
    setResultList(prev => prev.map((f, i) => i === index ? newFood : f))
  }, [activeCategory, resultList])

  const handleStart = useCallback(() => {
    if (isRolling) return
    setIsRolling(true)
    setResultList([])

    let tick = 0
    const maxTick = 15
    const timer = setInterval(() => {
      setCurrentFood(getRandomFood(activeCategory))
      tick++
      if (tick >= maxTick) {
        clearInterval(timer)
        if (count === 1) {
          setCurrentFood(getRandomFood(activeCategory))
        } else {
          setResultList(getRandomFoods(activeCategory, count))
        }
        setIsRolling(false)
      }
    }, 100)
  }, [isRolling, activeCategory, count])

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
          <Text className='link-text'>自定义菜单</Text>
          <Text className='link-text'>菜单下载</Text>
        </View>
      </View>
    </View>
  )
}
