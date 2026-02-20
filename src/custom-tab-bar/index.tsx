import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'

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
    const route = pages[pages.length - 1]?.route || ''
    return route.includes('ingredient') ? 1 : 0
  } catch {
    return 0
  }
}

export default function CustomTabBar() {
  const [active, setActive] = useState(detectPage)

  useEffect(() => {
    // Detect on mount
    setActive(detectPage())
    // Listen for tab switch events from other instances
    const handler = (index: number) => setActive(index)
    Taro.eventCenter.on('switchTab', handler)
    return () => { Taro.eventCenter.off('switchTab', handler) }
  }, [])

  Taro.useDidShow(() => {
    setActive(detectPage())
  })

  const switchTo = (index: number, url: string) => {
    if (index === active) return
    setActive(index)
    // Notify ALL tab bar instances (including the one on the destination page)
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
