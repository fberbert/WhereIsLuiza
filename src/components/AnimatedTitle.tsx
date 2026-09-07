import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { colors, fonts, textShadow } from '../theme'

export function useSway(paused = false): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (paused) {
      value.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [value, paused])
  return value
}

export function AnimatedTitle({
  children,
  paused = false,
  fontSize = 32,
}: {
  children: string
  paused?: boolean
  fontSize?: number
}) {
  const sway = useSway(paused)
  const translateX = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 30, 0] })
  return (
    <Animated.Text
      numberOfLines={1}
      adjustsFontSizeToFit
      style={[styles.title, { fontSize, transform: [{ translateX }] }]}
    >
      {children}
    </Animated.Text>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontSize: 40, fontFamily: fonts.title, ...textShadow },
})
