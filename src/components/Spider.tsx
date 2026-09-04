import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'

export function Spider({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <LottieView source={lottie.spider} autoPlay loop style={styles.anim} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 20 },
  anim: { width: 120, height: 120 },
})
