import React, { useRef } from 'react'
import { Animated, Pressable, StyleSheet } from 'react-native'
import { images } from '../assets'

export function Detective({
  onPress,
  size = 86,
  reducedMotion = false,
}: {
  onPress: () => void
  size?: number
  reducedMotion?: boolean
}) {
  const scale = useRef(new Animated.Value(1)).current
  const bounce = () => {
    if (!reducedMotion) {
      scale.setValue(0.8)
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }).start()
    }
    onPress()
  }
  return (
    <Pressable onPress={bounce} accessibilityRole="button" accessibilityLabel="Ouvir detetive" style={styles.wrap}>
      <Animated.Image
        source={images.detective}
        style={[styles.image, { width: size, height: size * 1.27, transform: [{ scale }] }]}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { minHeight: 48, minWidth: 48 },
  image: { width: 110, height: 140 },
})
