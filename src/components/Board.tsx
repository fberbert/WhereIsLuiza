import React from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { images } from '../assets'
import { cupFace, type CupFace, type CupIndex, type GameState } from '../game/logic'
import { useSway } from './AnimatedTitle'

const FACE_IMAGE: Record<CupFace, number> = {
  closed: images.cup,
  luiza: images.luizaHead,
  wrong: images.cupWrong,
}

const CUPS: CupIndex[] = [0, 1, 2]

interface Props {
  game: GameState
  onTap: (cup: CupIndex) => void
}

export function Board({ game, onTap }: Props) {
  const sway = useSway()
  const translateY = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -30, 0] })
  return (
    <View style={styles.board}>
      {CUPS.map(cup => (
        <View key={cup} style={styles.slot}>
          <Pressable onPress={() => onTap(cup)}>
            <Animated.Image
              source={FACE_IMAGE[cupFace(game, cup)]}
              style={[styles.cup, { transform: [{ translateY }] }]}
            />
          </Pressable>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  board: { flex: 6, flexDirection: 'row', marginLeft: 140, marginRight: 100 },
  slot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cup: { width: 117, height: 120 },
})
