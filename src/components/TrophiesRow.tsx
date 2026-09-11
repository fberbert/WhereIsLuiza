import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, type LayoutChangeEvent } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'
import { colors, fonts } from '../theme'

interface Props {
  count: number
  reducedMotion?: boolean
  onLayout?: (event: LayoutChangeEvent) => void
}

export function TrophiesRow({ count, reducedMotion = false, onLayout }: Props) {
  const scale = useRef(new Animated.Value(1)).current
  const previous = useRef(count)

  useEffect(() => {
    const changed = previous.current !== count
    previous.current = count
    scale.setValue(1)
    if (!changed || reducedMotion) return
    const pulse = Animated.sequence([
      Animated.timing(scale, { toValue: 1.1, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ])
    pulse.start()
    return () => {
      pulse.stop()
    }
  }, [count, reducedMotion, scale])

  return (
    <Animated.View
      testID="score-target"
      onLayout={onLayout}
      accessible
      accessibilityLabel={`Pontos: ${count}`}
      style={[styles.row, { transform: [{ scale }] }]}
    >
      <LottieView source={lottie.trophy} autoPlay={false} loop={false} progress={1} style={styles.icon} />
      <Text style={styles.label}>Pontos: {count}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  icon: { width: 32, height: 32 },
  label: {
    color: colors.gold,
    fontFamily: fonts.body,
    fontSize: 18,
    textShadowColor: '#16311d',
    textShadowRadius: 2,
    textShadowOffset: { width: 1, height: 1 },
  },
})
