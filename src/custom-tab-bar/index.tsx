import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'

import './index.scss'
import tabHome from '../assets/tab-home.png'
import tabHomeActive from '../assets/tab-home-active.png'
import tabIngredient from '../assets/tab-ingredient.png'
import tabIngredientActive from '../assets/tab-ingredient-active.png'

const barStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
  height: '80rpx',
  background: '#fff',
  borderTop: '1rpx solid #e5e5e5',
  paddingBottom: 'env(safe-area-inset-bottom)',
  boxSizing: 'content-box',
}

const itemStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
}

const dividerStyle: React.CSSProperties = {
  width: '1rpx',
  height: '36rpx',
  background: '#d9d9d9',
  flexShrink: 0,
}

const iconStyle: React.CSSProperties = {
  width: '48rpx',
  height: '48rpx',
  marginBottom: '6rpx',
}

function detectPage(): number {
  try {
    const pages = Taro.getCurrentPages()
    const current = pages[pages.length - 1]
    const route = (current && current.route) || ''
    return route.includes('ingredient') ? 1 : 0
  } catch {
    return 0
  }
}

// Module-level variable shared across all instances to track the intended tab.
// When switchTab is called, we store the target index here so the new
// custom-tab-bar instance on the destination page can read it immediately.
export let _pendingTabIndex: number | null = null

export default function CustomTabBar() {
  const initial = _pendingTabIndex !== null ? _pendingTabIndex : detectPage()
  const [active, setActive] = useState(initial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // On mount: use _pendingTabIndex if set by switchTo, otherwise detect from route
    if (_pendingTabIndex !== null) {
      setActive(_pendingTabIndex)
      _pendingTabIndex = null
    } else {
      setActive(detectPage())
    }
    const handler = (index: number) => setActive(index)
    Taro.eventCenter.on('switchTab', handler)
    return () => {
      Taro.eventCenter.off('switchTab', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  Taro.useDidShow(() => {
    // Delay to ensure getCurrentPages() reflects the new page after switchTab
    timerRef.current = setTimeout(() => {
      setActive(detectPage())
    }, 50)
  })

  const switchTo = (index: number, url: string) => {
    if (index === active) return
    setActive(index)
    // Store intended index for the destination page's tab-bar instance
    _pendingTabIndex = index
    Taro.eventCenter.trigger('switchTab', index)
    Taro.switchTab({ url })
  }

  return (
    <View style={barStyle}>
      <View style={itemStyle} onClick={() => switchTo(0, '/pages/index/index')}>
        <Image style={iconStyle} src={active === 0 ? tabHomeActive : tabHome} mode='aspectFit' />
        <Text style={{ fontSize: '22rpx', color: active === 0 ? '#f5a623' : '#999', fontWeight: active === 0 ? 600 : 400 }}>
          抽啥吃啥
        </Text>
      </View>
      <View style={dividerStyle} />
      <View style={itemStyle} onClick={() => switchTo(1, '/pages/ingredient/ingredient')}>
        <Image style={iconStyle} src={active === 1 ? tabIngredientActive : tabIngredient} mode='aspectFit' />
        <Text style={{ fontSize: '22rpx', color: active === 1 ? '#f5a623' : '#999', fontWeight: active === 1 ? 600 : 400 }}>
          有啥做啥
        </Text>
      </View>
    </View>
  )
}
