import React, { useEffect, useRef } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'

export function Spider({
  onPress,
  paused = false,
  size = 86,
}: {
  onPress: () => void
  paused?: boolean
  size?: number
}) {
  const animation = useRef<LottieView>(null)
  useEffect(() => {
    if (paused) animation.current?.pause()
    else animation.current?.play()
  }, [paused])
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Ouvir aranha" style={styles.wrap}>
      <LottieView
        ref={animation}
        source={lottie.spider}
        progress={paused ? 0.5 : undefined}
        autoPlay={!paused}
        loop
        style={[styles.anim, { width: size, height: size }]}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { minHeight: 48, minWidth: 48 },
  anim: { width: 120, height: 120 },
})
