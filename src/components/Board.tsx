import React, { useLayoutEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import type { CupId, GameState } from '../game/logic'
import { AnimatedCup } from './AnimatedCup'
import { RoundFeedback } from './RoundFeedback'
import { boardLayout } from './boardLayout'

interface Props {
  game: GameState
  enabled: boolean
  reducedMotion: boolean
  onChoose: (cup: CupId) => void
  onAnimationEnd: (result: { finished: boolean }) => void
  onShuffleStart: (durationMs: number) => () => void
  onResize: () => void
  scoreTarget: { x: number; y: number } | null
  generation: number
}
const CUPS: readonly CupId[] = [0, 1, 2]

export function Board({
  game,
  enabled,
  reducedMotion,
  onChoose,
  onAnimationEnd,
  onShuffleStart,
  onResize,
  scoreTarget,
  generation,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current
  const board = useRef<React.ComponentRef<typeof View>>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const layout = boardLayout(size.width, size.height)
  const { phase, roundId, swapIndex, difficulty } = game
  const duration =
    phase === 'preview'
      ? 1200
      : phase === 'covering'
      ? 220
      : phase === 'revealing'
      ? 850
      : phase === 'shuffling'
      ? Math.max(difficulty.durationMs, reducedMotion ? 700 : 0)
      : 0

  useLayoutEffect(() => {
    progress.setValue(0)
    if (!enabled || size.width <= 0 || size.height <= 0 || !duration) return
    let active = true
    let completed = false
    let stopSound = phase === 'shuffling' ? onShuffleStart(duration) : undefined
    const finishSound = () => {
      stopSound?.()
      stopSound = undefined
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
      isInteraction: false,
    })
    animation.start(({ finished }) => {
      if (!active || completed) return
      finishSound()
      if (!finished) return
      completed = true
      onAnimationEnd({ finished: true })
    })
    return () => {
      active = false
      animation.stop()
      finishSound()
    }
  }, [
    progress,
    enabled,
    size.width,
    size.height,
    duration,
    phase,
    roundId,
    swapIndex,
    generation,
    onAnimationEnd,
    onShuffleStart,
  ])

  const onLayout = ({ nativeEvent: { layout: measured } }: LayoutChangeEvent) => {
    board.current?.measureInWindow((x, y) => setOrigin({ x, y }))
    if (measured.width === size.width && measured.height === size.height) return
    if (size.width > 0 && size.height > 0) onResize()
    setSize({ width: measured.width, height: measured.height })
  }
  const target = scoreTarget && origin ? { x: scoreTarget.x - origin.x, y: scoreTarget.y - origin.y } : null
  return (
    <View ref={board} testID="board" style={styles.board} onLayout={onLayout}>
      <View pointerEvents="none" style={styles.contrast} />
      {CUPS.map(cupId => (
        <AnimatedCup
          key={cupId}
          cupId={cupId}
          game={game}
          layout={layout}
          progress={progress}
          enabled={enabled}
          reducedMotion={reducedMotion}
          onChoose={onChoose}
        />
      ))}
      <RoundFeedback game={game} layout={layout} progress={progress} target={target} reducedMotion={reducedMotion} />
    </View>
  )
}
const styles = StyleSheet.create({
  board: { flex: 1, alignSelf: 'stretch' },
  contrast: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 24,
  },
})
