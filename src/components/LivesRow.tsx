import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'
import { colors, fonts } from '../theme'

interface Props {
  count: number
  gained?: boolean
  lost?: boolean
  reducedMotion?: boolean
}

export function LivesRow({ count, gained = false, lost = false, reducedMotion = false }: Props) {
  const scale = useRef(new Animated.Value(1)).current
  useEffect(() => {
    scale.setValue(1)
    if (reducedMotion || (!gained && !lost)) return
    const pulse = Animated.sequence([
      Animated.timing(scale, { toValue: gained ? 1.15 : 0.9, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ])
    pulse.start()
    return () => {
      pulse.stop()
    }
  }, [count, gained, lost, reducedMotion, scale])

  return (
    <Animated.View accessible accessibilityLabel={`${count} vidas`} style={[styles.row, { transform: [{ scale }] }]}>
      {Array.from({ length: Math.min(count, 5) }, (_, index) => (
        <LottieView key={index} source={lottie.heart} autoPlay={false} loop={false} progress={1} style={styles.icon} />
      ))}
      {count > 5 && <Text style={styles.label}>+{count - 5}</Text>}
      {count === 0 && <Text style={styles.label}>Sem vidas</Text>}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 28, gap: 2 },
  icon: { width: 25, height: 25 },
  label: { color: colors.white, fontFamily: fonts.body, fontSize: 16 },
})
