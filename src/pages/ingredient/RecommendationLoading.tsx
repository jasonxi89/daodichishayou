import { Text, View } from '@tarojs/components'

interface RecommendationLoadingProps {
  message: string
}

export default function RecommendationLoading({
  message,
}: RecommendationLoadingProps) {
  return (
    <View className='thinking-box'>
      <View className='thinking-dots'>
        <Text className='thinking-text'>{message}</Text>
        {[1, 2, 3, 4].map(index => (
          <Text key={index} className={`dot dot${index}`}>.</Text>
        ))}
      </View>
    </View>
  )
}
