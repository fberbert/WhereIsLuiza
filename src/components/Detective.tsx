import React, { useRef } from 'react'
import { Animated, Pressable, StyleSheet } from 'react-native'
import { images } from '../assets'

export function Detective({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current
  const bounce = () => {
    scale.setValue(0.8)
    Animated.spring(scale, { toValue: 1, friction: 1, useNativeDriver: true }).start()
    onPress()
  }
  return (
    <Pressable onPress={bounce} style={styles.wrap}>
      <Animated.Image source={images.detective} style={[styles.image, { transform: [{ scale }] }]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 20, left: 10 },
  image: { width: 110, height: 140 },
})
