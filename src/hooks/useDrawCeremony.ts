import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'

export type DrawPhase = 'idle' | 'shaking' | 'rising' | 'done'

export interface DrawCeremonyOptions {
  count: number
  isBlocked: boolean
  getPool: () => string[] | undefined
  onDone: (results: string[]) => void
}

export interface DrawCeremonyReturn {
  phase: DrawPhase
  mainResult: string
  results: string[]
  startDraw: () => void
  skip: () => void
  refreshItem: (index: number) => string | null
  reset: () => void
}

const SHAKE_MS = 2000
const RISE_MS = 500

function pickUnique(pool: string[], count: number): string[] {
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export default function useDrawCeremony({
  count,
  isBlocked,
  getPool,
  onDone,
}: DrawCeremonyOptions): DrawCeremonyReturn {
  const [phase, setPhase] = useState<DrawPhase>('idle')
  const [results, setResults] = useState<string[]>([])
  const phaseRef = useRef<DrawPhase>('idle')
  const resultsRef = useRef<string[]>([])
  const pendingRef = useRef<string[]>([])
  const poolRef = useRef<string[]>([])
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const mountedRef = useRef(true)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const commitPhase = useCallback((next: DrawPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const commitResults = useCallback((next: string[]) => {
    resultsRef.current = next
    setResults(next)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimers()
    }
  }, [clearTimers])

  const finish = useCallback(() => {
    if (!mountedRef.current) return
    if (phaseRef.current !== 'shaking' && phaseRef.current !== 'rising') return

    clearTimers()
    const drawn = pendingRef.current
    pendingRef.current = []
    commitResults(drawn)
    commitPhase('done')
    onDone(drawn)
  }, [clearTimers, commitPhase, commitResults, onDone])

  const startDraw = useCallback(() => {
    if (isBlocked || phaseRef.current !== 'idle') return
    if (!Number.isInteger(count) || count <= 0) return

    const pool = getPool()
    const uniquePool = Array.from(new Set(pool ?? []))
    if (uniquePool.length === 0) {
      Taro.showToast({ title: '该分类正在加载中，请稍后', icon: 'none' })
      return
    }

    poolRef.current = uniquePool
    pendingRef.current = pickUnique(uniquePool, count)
    commitResults([])
    commitPhase('shaking')

    timersRef.current.push(setTimeout(() => {
      if (!mountedRef.current || phaseRef.current !== 'shaking') return
      commitPhase('rising')
      timersRef.current.push(setTimeout(finish, RISE_MS))
    }, SHAKE_MS))
  }, [commitPhase, commitResults, count, finish, getPool, isBlocked])

  const skip = useCallback(() => {
    finish()
  }, [finish])

  const refreshItem = useCallback((index: number): string | null => {
    const current = resultsRef.current
    if (index < 0 || index >= current.length) return null

    const taken = new Set(current)
    const available = poolRef.current.filter(name => !taken.has(name))
    if (available.length === 0) return null

    const replacement = available[Math.floor(Math.random() * available.length)]
    commitResults(current.map((name, i) => (i === index ? replacement : name)))
    return replacement
  }, [commitResults])

  const reset = useCallback(() => {
    clearTimers()
    pendingRef.current = []
    commitResults([])
    commitPhase('idle')
  }, [clearTimers, commitPhase, commitResults])

  return {
    phase,
    mainResult: results[0] ?? '',
    results,
    startDraw,
    skip,
    refreshItem,
    reset,
  }
}
