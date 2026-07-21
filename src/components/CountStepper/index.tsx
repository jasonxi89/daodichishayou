import { Button, Text, View } from '@tarojs/components'
import { toZhNumber } from '../../utils/zhNumber'
import './index.scss'

export interface CountStepperProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export default function CountStepper({
  value,
  min = 1,
  max = 10,
  onChange,
}: CountStepperProps) {
  const atMin = value <= min
  const atMax = value >= max

  return (
    <View className='count-stepper' aria-label={`份数，当前${value}份`}>
      <Text className='count-stepper__label'>份数</Text>
      <Button
        className='count-stepper__control'
        aria-label='减少份数'
        disabled={atMin}
        onClick={() => !atMin && onChange(value - 1)}
      >
        <Text className='count-stepper__symbol'>−</Text>
      </Button>
      <Text className='count-stepper__value' aria-live='polite'>
        {toZhNumber(value)}
      </Text>
      <Button
        className='count-stepper__control'
        aria-label='增加份数'
        disabled={atMax}
        onClick={() => !atMax && onChange(value + 1)}
      >
        <Text className='count-stepper__symbol'>＋</Text>
      </Button>
    </View>
  )
}
