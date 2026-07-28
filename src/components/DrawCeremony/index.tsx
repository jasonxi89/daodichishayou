import { Button, Text, View } from '@tarojs/components'
import type { DrawPhase } from '../../hooks/useDrawCeremony'
import { toZhNumber } from '../../utils/zhNumber'
import './index.scss'

export interface DrawCeremonyProps {
  phase: DrawPhase
  mainResult: string
  emoji: string
  category: string
  servings: number
  drawIndex: number
  onSkip: () => void
}

export default function DrawCeremony({
  phase,
  mainResult,
  emoji,
  category,
  servings,
  drawIndex,
  onSkip,
}: DrawCeremonyProps) {
  const revealed = phase === 'rising' || phase === 'done'

  return (
    <View className={`ceremony ceremony--${phase}`}>
      <View className="ceremony__divider" />
      <Text className="ceremony__eyebrow">御签摇动中</Text>

      <View className="ceremony__stage">
        <View className="stick stick--left" />
        <View className="stick stick--right" />

        <Button
          className="tube"
          aria-label="跳过摇签，立即揭晓"
          onClick={onSkip}
        >
          <Text className="tube__label">食签</Text>
        </Button>

        <View className="main-stick" aria-hidden={!revealed}>
          {revealed && (
            <>
              <Text className="main-stick__emoji" aria-hidden>{emoji}</Text>
              <Text className="main-stick__name">{mainResult}</Text>
            </>
          )}
        </View>

        {revealed && (
          <View className="badge">
            <Text className="badge__text">手感不错！</Text>
          </View>
        )}
      </View>

      <Text className="ceremony__motto">心诚则灵 · 摇签三下</Text>
      <Text className="ceremony__caption">
        {`${category} · ${toZhNumber(servings)}份 · 第 ${drawIndex} 抽`}
      </Text>
      <Text className="ceremony__hint">等不及？轻点签筒直接揭晓</Text>

      <Button className="ceremony__pending" disabled aria-label="签落即定">
        签落即定 ···
      </Button>
    </View>
  )
}
