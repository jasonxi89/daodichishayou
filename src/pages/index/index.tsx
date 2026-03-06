import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import Taro, { useLoad, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { Recipe } from '../../data/recipes'
import { getLocalRecipe, fetchRecipeFromAPI } from '../../data/recipes'
import { fetchTrending, fetchCategories, generateFoodsByCategory, bulkGenerateFoodsByCategory } from '../../services/api'
import './index.scss'

const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 1 day

const AI_CATEGORIES = ['家常下饭', '嗦粉吃面', '火锅烫涮', '烧烤撸串', '街头小吃', '异国风味', '奶茶续命', '甜品诱惑', '轻食减脂', '深夜食堂']

const defaultFoodList: Record<string, string[]> = {
  随便: ['红烧肉', '番茄炒蛋', '火锅', '螺蛳粉', '烤肉', '麻辣烫', '黄焖鸡', '酸菜鱼', '烤鸭', '炸鸡', '披萨', '寿司', '煲仔饭', '兰州拉面', '小龙虾', '奶茶', '汉堡', '水煮鱼', '串串香', '肉夹馍', '咖喱饭', '生椰拿铁', '锅包肉', '热干面', '烤串', '卤味拼盘', '冒菜', '蛋糕', '砂锅粥', '鸡公煲'],
  家常下饭: ['红烧肉', '糖醋排骨', '麻婆豆腐', '宫保鸡丁', '鱼香肉丝', '回锅肉', '青椒肉丝', '酸菜鱼', '水煮肉片', '蚂蚁上树', '家常豆腐', '土豆丝', '番茄炒蛋', '韭菜炒蛋', '白切鸡', '红烧鸡翅', '糖醋里脊', '红烧茄子', '干煸豆角', '蒜苔炒肉', '尖椒炒蛋', '肉末茄子', '口水鸡', '白灼菜心', '清蒸鲈鱼', '红烧带鱼', '干锅花菜', '孜然羊肉', '爆炒腰花', '蒜蓉生菜'],
  嗦粉吃面: ['兰州拉面', '重庆小面', '螺蛳粉', '桂林米粉', '云南过桥米线', '炸酱面', '刀削面', '担担面', '热干面', '阳春面', '牛肉面', '酸辣粉', '河粉', '肠粉', '凉皮', '擀面皮', '臊子面', '油泼面', '炒河粉', '炒米粉', '意大利面', '乌冬面', '荞麦面', '挂面', '方便面', '粉丝', '宽粉', '细粉', '粗粉', '米线'],
  火锅烫涮: ['四川火锅', '重庆火锅', '北京涮羊肉', '海底捞', '麻辣烫', '关东煮', '冒菜', '串串香', '钵钵鸡', '鸳鸯锅', '清汤锅', '番茄锅', '菌汤锅', '酸菜鱼火锅', '牛油火锅', '鱼火锅', '羊蝎子', '潮汕牛肉火锅', '东北酸菜白肉锅', '韩式部队锅', '日式寿喜烧', '泰式火锅', '椰子鸡火锅', '猪肚鸡火锅', '羊肉火锅', '鱼头火锅', '三鲜火锅', '野菌火锅', '豆捞火锅', '小肥羊'],
  烧烤撸串: ['羊肉串', '烤鸡翅', '烤茄子', '烤韭菜', '烤玉米', '烤土豆', '烤鱿鱼', '烤鸡腿', '烤牛肉', '烤猪肉', '烤香肠', '烤豆腐', '烤蘑菇', '烤青椒', '烤洋葱', '烤金针菇', '烤秋刀鱼', '烤扇贝', '烤生蚝', '烤虾', '烤鸡胗', '烤鸡心', '烤板筋', '烤里脊', '烤五花肉', '烤羊腰', '烤羊排', '烤牛舌', '烤鸡皮', '烤年糕'],
  街头小吃: ['煎饼果子', '肉夹馍', '烧饼', '包子', '饺子', '馄饨', '豆浆', '油条', '麻花', '糖葫芦', '臭豆腐', '烤红薯', '煮玉米', '鸡蛋灌饼', '手抓饼', '锅贴', '生煎包', '小笼包', '豆腐脑', '胡辣汤', '凉粉', '凉面', '烤冷面', '铁板鱿鱼', '章鱼小丸子', '炸鸡柳', '炸串', '爆米花', '棉花糖', '烤肠'],
  异国风味: ['披萨', '汉堡', '意大利面', '牛排', '炸鸡', '寿司', '拉面', '天妇罗', '烤肉', '泡菜', '咖喱', '印度飞饼', '墨西哥卷饼', '法式焗蜗牛', '德式香肠', '俄式红菜汤', '越南河粉', '泰式冬阴功', '新加坡炒河粉', '马来炒饭', '土耳其烤肉', '希腊沙拉', '西班牙海鲜饭', '英式炸鱼薯条', '美式热狗', '三明治', '沙拉', '芝士蛋糕', '提拉米苏', '马卡龙'],
  奶茶续命: ['珍珠奶茶', '红茶', '绿茶', '乌龙茶', '茉莉花茶', '柠檬茶', '蜂蜜柚子茶', '芝士茶', '水果茶', '抹茶拿铁', '焦糖玛奇朵', '卡布奇诺', '美式咖啡', '拿铁', '摩卡', '奶昔', '果汁', '柠檬水', '气泡水', '可乐', '雪碧', '芬达', '王老吉', '加多宝', '椰汁', '豆浆', '酸梅汤', '绿豆汤', '银耳汤', '红糖水'],
  甜品诱惑: ['蛋糕', '马卡龙', '泡芙', '慕斯', '布丁', '果冻', '冰淇淋', '雪糕', '刨冰', '双皮奶', '龟苓膏', '豆腐花', '芝麻糊', '红豆沙', '绿豆糕', '月饼', '蛋挞', '司康饼', '玛德琳', '舒芙蕾', '千层蛋糕', '芝士蛋糕', '提拉米苏', '班戟', '麻薯', '大福', '和果子', '糯米糍', '汤圆', '桂花糕'],
  轻食减脂: ['沙拉', '水煮蛋', '蒸蛋', '水煮鸡胸肉', '蒸鸡胸肉', '水煮虾', '蒸虾', '水煮西兰花', '蒸西兰花', '水煮菠菜', '蒸胡萝卜', '黄瓜', '番茄', '生菜', '苦瓜', '冬瓜', '丝瓜', '豆腐', '豆浆', '燕麦', '藜麦', '玉米', '红薯', '紫薯', '魔芋', '海带', '紫菜', '白萝卜', '芹菜'],
  深夜食堂: ['泡面', '炒饭', '蛋炒饭', '炒年糕', '关东煮', '麻辣烫', '烧烤', '炸鸡', '汉堡', '披萨', '小龙虾', '花甲', '田螺', '毛豆', '花生米', '凉菜', '卤味', '酱菜', '泡菜', '咸菜', '粥', '白粥', '小馄饨', '煎蛋', '火腿肠', '方便面', '速冻饺子', '汤圆', '年糕', '豆腐干'],
}

const defaultCategories = ['随便', '热门推荐', '家常下饭', '嗦粉吃面', '火锅烫涮', '烧烤撸串', '街头小吃', '异国风味', '奶茶续命', '甜品诱惑', '轻食减脂', '深夜食堂']

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
  const [activeCategory, _setActiveCategory] = useState('随便')
  const activeCategoryRef = useRef(activeCategory)
  const setActiveCategory = useCallback((cat: string) => {
    activeCategoryRef.current = cat
    _setActiveCategory(cat)
  }, [])
  const [currentFood, setCurrentFood] = useState('今天吃啥？')
  const [isRolling, setIsRolling] = useState(false)
  const [count, setCount] = useState(1)
  const [resultList, setResultList] = useState<string[]>([])
  const [showRecipe, setShowRecipe] = useState(false)
  const [popupFoods, setPopupFoods] = useState<string[]>([])
  const [activePopupIndex, setActivePopupIndex] = useState(0)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const recipeCacheRef = useRef<Record<string, Recipe | null>>({})
  const [isLanded, setIsLanded] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current)
    }
  }, [])

  // 后端热门数据
  const [trendingFoods, setTrendingFoods] = useState<string[]>([])
  const [trendingByCategory, setTrendingByCategory] = useState<Record<string, string[]>>({})
  const [backendCategories, setBackendCategories] = useState<string[]>([])

  // AI 分类缓存
  const [aiCategoryCache, setAiCategoryCache] = useState<Record<string, { foods: string[], expiresAt: number }>>({})
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null)

  // 自定义菜单状态
  const [customFoodList, setCustomFoodList] = useState<Record<string, string[]>>({})
  const rollListRef = useRef<string[]>([])
  const [showCustomMenu, setShowCustomMenu] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newFoodInputs, setNewFoodInputs] = useState<Record<string, string>>({})

  // 合并默认 + 热门 + 后端分类 + AI缓存 + 自定义
  // 优先级: AI缓存 > 自定义 > 默认硬编码 > 热门趋势
  // AI缓存是用户主动点击分类后按需生成的，最精准，优先级最高
  const mergedFoodList = useMemo(() => {
    const merged = { ...defaultFoodList, ...customFoodList }
    if (trendingFoods.length > 0) {
      merged['热门推荐'] = trendingFoods
    }
    for (const [cat, foods] of Object.entries(trendingByCategory)) {
      if (!merged[cat] && foods.length >= 5) {
        merged[cat] = foods
      }
    }
    // AI缓存优先级最高：覆盖 trendingByCategory 的粗略分组
    for (const [cat, entry] of Object.entries(aiCategoryCache)) {
      if (entry.foods.length > 0) {
        merged[cat] = entry.foods
      }
    }
    return merged
  }, [customFoodList, trendingFoods, trendingByCategory, aiCategoryCache])
  const allCategories = useMemo(() => {
    const base = [...defaultCategories]
    for (const cat of backendCategories) {
      if (!base.includes(cat)) base.push(cat)
    }
    // 自定义分类放最后
    for (const cat of Object.keys(customFoodList)) {
      if (!base.includes(cat)) base.push(cat)
    }
    return base
  }, [customFoodList, backendCategories])

  useLoad(() => {
    console.log('Page loaded.')
    const stored = Taro.getStorageSync('customFoodList')
    if (stored && typeof stored === 'object') {
      setCustomFoodList(stored)
    }
    let validAiCache: Record<string, { foods: string[], expiresAt: number }> = {}
    const cachedAi = Taro.getStorageSync('aiCategoryCache')
    if (cachedAi && typeof cachedAi === 'object') {
      const now = Date.now()
      for (const [k, v] of Object.entries(cachedAi)) {
        if (v && typeof v === 'object' && (v as any).expiresAt > now) {
          validAiCache[k] = v as { foods: string[], expiresAt: number }
        }
      }
      setAiCategoryCache(validAiCache)
    }
    // Bulk fetch uncached AI categories (静默后台刷新，不阻塞用户)
    const uncached = AI_CATEGORIES.filter(cat => !validAiCache[cat] || validAiCache[cat].expiresAt <= Date.now())
    if (uncached.length > 0) {
      bulkGenerateFoodsByCategory(uncached)
        .then(res => {
          setAiCategoryCache(prev => {
            const next = { ...prev }
            for (const [cat, foods] of Object.entries(res.results)) {
              next[cat] = { foods, expiresAt: Date.now() + AI_CACHE_TTL_MS }
            }
            Taro.setStorageSync('aiCategoryCache', next)
            return next
          })
        })
        .catch(() => {})
    }
    // 从后端获取热门食物和分类（失败时静默降级到硬编码）
    fetchTrending(200).then(res => {
      setTrendingFoods(res.items.map(item => item.food_name))
      const grouped: Record<string, string[]> = {}
      res.items.forEach(item => {
        if (item.category) {
          if (!grouped[item.category]) grouped[item.category] = []
          if (!grouped[item.category].includes(item.food_name)) {
            grouped[item.category].push(item.food_name)
          }
        }
      })
      setTrendingByCategory(grouped)
    }).catch(() => {})
    fetchCategories().then(cats => {
      setBackendCategories(cats)
    }).catch(() => {})
  })

  // 点击分类标签：切换分类 + 按需触发 AI 生成
  // 对于没有默认/自定义食物列表的分类，用 AI 生成精准的分类食物
  const handleCategoryClick = useCallback((cat: string) => {
    setActiveCategory(cat)
    const hasFoods = !!(mergedFoodList[cat] && mergedFoodList[cat].length > 0)
    if (
      !hasFoods &&
      categoryLoading === null &&
      (!aiCategoryCache[cat] || aiCategoryCache[cat].expiresAt <= Date.now())
    ) {
      setCategoryLoading(cat)
      generateFoodsByCategory(cat)
        .then(res => {
          const entry = { foods: res.foods, expiresAt: Date.now() + AI_CACHE_TTL_MS }
          setAiCategoryCache(prev => {
            const next = { ...prev, [cat]: entry }
            Taro.setStorageSync('aiCategoryCache', next)
            return next
          })
        })
        .catch(() => {
          Taro.showToast({ title: `"${cat}"分类生成失败`, icon: 'none' })
        })
        .finally(() => {
          setCategoryLoading(null)
        })
    }
  }, [mergedFoodList, categoryLoading, aiCategoryCache, setActiveCategory])

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
    const list = rollListRef.current
    if (list.length === 0) return
    const others = resultList.filter((_, i) => i !== index)
    const available = list.filter(f => !others.includes(f))
    if (available.length === 0) return
    const newFood = available[Math.floor(Math.random() * available.length)]
    setResultList(prev => prev.map((f, i) => i === index ? newFood : f))
  }, [resultList])

  // 变速减速滚动：模拟老虎机效果
  const ROLL_DELAYS = [60, 60, 60, 60, 60, 60, 120, 120, 120, 120, 250, 250, 250, 400, 400]

  const handleStart = useCallback(() => {
    if (isRolling || categoryLoading) return
    const currentCat = activeCategoryRef.current
    const list = mergedFoodList[currentCat]
    if (!list || list.length === 0) {
      Taro.showToast({ title: '该分类正在加载中，请稍后', icon: 'none' })
      return
    }
    setIsRolling(true)
    setIsLanded(false)
    setShowResult(false)
    setResultList([])
    rollListRef.current = list

    let tick = 0
    const rollTick = () => {
      setCurrentFood(list[Math.floor(Math.random() * list.length)])
      tick++
      if (tick >= ROLL_DELAYS.length) {
        if (count === 1) {
          setCurrentFood(list[Math.floor(Math.random() * list.length)])
          setIsLanded(true)
          setTimeout(() => setIsLanded(false), 400)
        } else {
          const n = Math.min(count, list.length)
          const shuffled = [...list].sort(() => Math.random() - 0.5)
          setResultList(shuffled.slice(0, n))
          setShowResult(true)
        }
        setIsRolling(false)
        rollTimerRef.current = null
      } else {
        rollTimerRef.current = setTimeout(rollTick, ROLL_DELAYS[tick])
      }
    }
    rollTimerRef.current = setTimeout(rollTick, ROLL_DELAYS[0])
  }, [isRolling, activeCategory, count, mergedFoodList, categoryLoading])

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
    const difficulty = (recipe as any).difficulty || ''
    const cookTime = (recipe as any).cook_time || ''
    Taro.navigateTo({
      url: `/pages/recipe/recipe?name=${encodeURIComponent(recipe.name)}&difficulty=${encodeURIComponent(difficulty)}&cook_time=${encodeURIComponent(cookTime)}`,
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
    setActiveCategory(name)
  }, [newCategoryName, customFoodList, saveCustomList, setActiveCategory])

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
    if (customFoodList[category] && customFoodList[category].includes(food)) {
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
          {/* 装饰图标：仅在未显示结果列表时展示 */}
          {resultList.length <= 1 && (
            <>
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
            </>
          )}
          {resultList.length > 1 ? (
            <View className={`result-list ${resultList.length > 3 ? 'grid' : ''}`}>
              {resultList.map((food, i) => (
                <View key={i} className={`result-row ${showResult ? 'animate-in' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
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
            <Text className={`food-name ${isRolling ? 'rolling' : ''} ${isLanded ? 'landed' : ''}`}>{currentFood}</Text>
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
        <View className='categories'>
          {allCategories.map((cat) => (
            <Text
              key={cat}
              className={`category-tag ${activeCategory === cat ? 'active' : ''} ${cat === '热门推荐' ? 'hot' : ''} ${categoryLoading === cat ? 'loading' : ''}`}
              onClick={() => handleCategoryClick(cat)}
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
          <View className={`start-btn ${isRolling || categoryLoading !== null ? 'disabled' : ''}`} onClick={handleStart}>
            <Text className='start-btn-text'>{isRolling ? '选择中...' : '开始'}</Text>
          </View>
        </View>

        {/* 底部链接 */}
        <View className='bottom-links'>
          <Text className='link-text' onClick={() => setShowCustomMenu(true)}>自定义菜单</Text>
        </View>

        {/* 意见反馈悬浮按钮 */}
        <Button className='feedback-fab' openType='feedback'>
          <Text className='feedback-fab-text'>反馈</Text>
        </Button>

        {/* TabBar占位 */}
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
