import { Button, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { fetchDigest, type FoodDigest } from '../../services/api'
import './index.scss'

const DIGEST_STORAGE_KEY = 'digestCache'

function getTodayKey(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// 同日缓存：同一天只请求一次（参考 aiCategoryCache 模式）
function readTodayCachedDigest(): FoodDigest | null {
  try {
    const cached = Taro.getStorageSync(DIGEST_STORAGE_KEY)
    if (cached && typeof cached === 'object' && cached.date === getTodayKey() && cached.digest) {
      return cached.digest as FoodDigest
    }
  } catch {
    // 存储读取异常按无缓存处理
  }
  return null
}

export default function DigestCard() {
  const [digest, setDigest] = useState<FoodDigest | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const cached = readTodayCachedDigest()
    if (cached) {
      setDigest(cached)
      return
    }
    fetchDigest()
      .then((data) => {
        if (!data) return
        setDigest(data)
        Taro.setStorageSync(DIGEST_STORAGE_KEY, { date: getTodayKey(), digest: data })
      })
      .catch(() => {
        // 静默降级：请求失败整个卡片不渲染，不占位、不弹错误
      })
  }, [])

  if (!digest) return null

  return (
    <Button
      className='digest-card digest-card--quote'
      aria-label={`今日风向：${digest.summary}`}
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded(prev => !prev)}
    >
      <Text className='digest-title'>《今日风向》</Text>
      <Text className={`digest-summary ${isExpanded ? 'expanded' : ''}`}>
        {digest.summary}
      </Text>
    </Button>
  )
}
