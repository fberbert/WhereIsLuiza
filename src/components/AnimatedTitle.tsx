import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { colors, fonts, textShadow } from '../theme'

export function useSway(): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [value])
  return value
}

export function AnimatedTitle({ children }: { children: string }) {
  const sway = useSway()
  const translateX = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 30, 0] })
  return <Animated.Text style={[styles.title, { transform: [{ translateX }] }]}>{children}</Animated.Text>
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontSize: 40, fontFamily: fonts.title, ...textShadow },
})
