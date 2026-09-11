import React from 'react'
import { Animated, Pressable, StyleSheet } from 'react-native'
import { images } from '../assets'
import type { CupId, GameState } from '../game/logic'
import type { BoardLayout } from './boardLayout'

interface Props {
  cupId: CupId
  game: GameState
  layout: BoardLayout
  progress: Animated.Value
  enabled: boolean
  reducedMotion: boolean
  onChoose: (cup: CupId) => void
}
const POSITIONS = ['da esquerda', 'do centro', 'da direita']

export function AnimatedCup({ cupId, game, layout, progress, enabled, reducedMotion, onChoose }: Props) {
  const slot = game.order.indexOf(cupId)
  const pair = game.phase === 'shuffling' ? game.swaps[game.swapIndex] : undefined
  const destination = pair?.[0] === slot ? pair[1] : pair?.[1] === slot ? pair[0] : slot
  const moving = destination !== slot
  const correct = cupId === game.luizaCupId
  const revealed = game.phase === 'revealing' || game.phase === 'roundEnd' || game.phase === 'gameOver'
  const lifted = revealed && (correct || cupId === game.lastGuess)
  const lift = cupLift(game, correct, lifted, layout.lift, progress)
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (destination - slot) * layout.slotWidth],
  })
  const translateY = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, moving && !reducedMotion ? (destination > slot ? -1 : 1) * layout.cupHeight * 0.22 : 0, 0],
  })
  const visible = correct && (game.phase === 'preview' || game.phase === 'covering' || revealed)
  // Fabric's PropsAnimatedNode.restoreDefaultValues() is a no-op on Android.
  // Keep native property mappings present, including when their output is constant.
  const opacity = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: visible ? (game.phase === 'revealing' ? [0, 1, 1] : [1, 1, 1]) : [0, 0, 0],
  })
  const bouncing = game.phase === 'revealing' && !reducedMotion
  const bounce = progress.interpolate({
    inputRange: [0, 0.36, 0.55, 0.72, 1],
    outputRange: [0, 0, bouncing ? -8 : 0, 0, 0],
  })
  const miss = game.phase === 'revealing' && !correct && cupId === game.lastGuess && !reducedMotion
  const wiggle = progress.interpolate({
    inputRange: [0, 0.36, 0.5, 0.65, 0.8, 1],
    outputRange: miss ? [0, 0, -4, 4, -2, 0] : [0, 0, 0, 0, 0, 0],
  })
  const zIndex = moving && destination < slot ? 2 : 1
  return (
    <Animated.View
      style={[
        styles.cupPosition,
        {
          left: (slot + 0.5) * layout.slotWidth - layout.cupWidth / 2,
          top: layout.top,
          width: layout.cupWidth,
          height: layout.cupHeight,
          zIndex,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      {correct && (
        <Animated.Image
          source={images.luizaHead}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.luiza,
            {
              width: layout.cupWidth * 0.7,
              height: layout.cupHeight * 0.7,
              left: layout.cupWidth * 0.15,
              top: layout.cupHeight * 0.3,
              opacity,
              transform: [{ translateY: bounce }],
            },
          ]}
        />
      )}
      <Pressable
        testID={`cup-${cupId}`}
        accessibilityRole="button"
        accessibilityLabel={`Copo ${POSITIONS[slot]}`}
        accessibilityState={{ disabled: !enabled || game.phase !== 'guessing' }}
        disabled={!enabled || game.phase !== 'guessing'}
        onPress={() => {
          if (enabled && game.phase === 'guessing') onChoose(cupId)
        }}
        style={styles.touch}
        hitSlop={Math.max(0, (48 - layout.cupWidth) / 2)}
      >
        <Animated.Image
          source={images.cup}
          accessible={false}
          style={{
            width: layout.cupWidth,
            height: layout.cupHeight,
            transform: [{ translateY: lift }, { translateX: wiggle }],
          }}
        />
      </Pressable>
    </Animated.View>
  )
}

function cupLift(game: GameState, correct: boolean, lifted: boolean, distance: number, progress: Animated.Value) {
  if (game.phase === 'preview' && correct)
    return progress.interpolate({ inputRange: [0, 1], outputRange: [-distance, -distance] })
  if (game.phase === 'covering' && correct)
    return progress.interpolate({ inputRange: [0, 1], outputRange: [-distance, 0] })
  if (game.phase === 'revealing' && lifted)
    return progress.interpolate({ inputRange: [0, 300 / 850, 1], outputRange: [0, -distance, -distance] })
  const restingLift = lifted ? -distance : 0
  return progress.interpolate({ inputRange: [0, 1], outputRange: [restingLift, restingLift] })
}
const styles = StyleSheet.create({
  cupPosition: { position: 'absolute' },
  luiza: { position: 'absolute', resizeMode: 'contain' },
  touch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
