import React from 'react'
import { Animated, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'
import type { GameState } from '../game/logic'
import type { BoardLayout } from './boardLayout'

interface Props {
  game: GameState
  progress: Animated.Value
  layout: BoardLayout
  target: { x: number; y: number } | null
  reducedMotion: boolean
}
export function RoundFeedback({ game, progress, layout, target, reducedMotion }: Props) {
  if (game.phase !== 'revealing' || game.lastGuess !== game.luizaCupId) return null
  const startX = (game.order.indexOf(game.luizaCupId) + 0.5) * layout.slotWidth
  const startY = layout.top + layout.cupHeight * 0.45
  const finish = target ?? { x: startX, y: startY - 32 }
  const translateX = progress.interpolate({
    inputRange: [0, 350 / 850, 1],
    outputRange: [0, 0, reducedMotion ? 0 : finish.x - startX],
  })
  const translateY = progress.interpolate({
    inputRange: [0, 350 / 850, 1],
    outputRange: [0, 0, reducedMotion ? 0 : finish.y - startY],
  })
  const opacity = progress.interpolate({
    inputRange: [0, 300 / 850, 350 / 850, reducedMotion ? 0.65 : 0.9, 1],
    outputRange: [0, 0, 1, 1, 0],
  })
  return (
    <Animated.View
      testID="round-trophy"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.trophy,
        {
          left: startX - 22,
          top: startY - 22,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <LottieView source={lottie.trophy} autoPlay={false} loop={false} progress={0.65} style={styles.icon} />
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  trophy: { position: 'absolute', width: 44, height: 44, zIndex: 3 },
  icon: { width: 44, height: 44 },
})
