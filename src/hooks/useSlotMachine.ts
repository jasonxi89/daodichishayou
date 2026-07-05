import Taro from '@tarojs/taro'
import { useState, useCallback, useRef, useEffect } from 'react'

// 变速减速滚动：模拟老虎机效果
const ROLL_DELAYS = [60, 60, 60, 60, 60, 60, 120, 120, 120, 120, 250, 250, 250, 400, 400]

interface SlotMachineOptions {
  count: number
  isBlocked: boolean
  getRollList: () => string[] | undefined
}

// 老虎机滚动：随机滚动食物名，减速后定格单个结果或产出多份结果列表
export default function useSlotMachine({ count, isBlocked, getRollList }: SlotMachineOptions) {
  const [currentFood, setCurrentFood] = useState('今天吃啥？')
  const [isRolling, setIsRolling] = useState(false)
  const [resultList, setResultList] = useState<string[]>([])
  const [isLanded, setIsLanded] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollListRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current)
    }
  }, [])

  const handleRefreshItem = useCallback((index: number) => {
    const list = rollListRef.current
    if (list.length === 0) return
    const others = resultList.filter((_, i) => i !== index)
    const available = list.filter(f => !others.includes(f))
    if (available.length === 0) return
    const newFood = available[Math.floor(Math.random() * available.length)]
    setResultList(prev => prev.map((f, i) => i === index ? newFood : f))
  }, [resultList])

  const handleStart = useCallback(() => {
    if (isRolling || isBlocked) return
    const list = getRollList()
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
  }, [isRolling, isBlocked, count, getRollList])

  return { currentFood, isRolling, isLanded, resultList, showResult, handleStart, handleRefreshItem }
}
