import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'
import { HITS_PER_LIFE, type GameState } from '../game/logic'

interface Props {
  count: GameState['hitsTowardLife']
  earned?: boolean
  reducedMotion?: boolean
}

export function ExtraLifeProgress({ count, earned = false }: Props) {
  const completed = earned ? HITS_PER_LIFE : count
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        Vida extra: {completed}/{HITS_PER_LIFE}
      </Text>
      {Array.from({ length: HITS_PER_LIFE }, (_, index) => (
        <View
          key={index}
          testID="extra-life-indicator"
          accessible
          accessibilityLabel={index < completed ? 'Acerto conquistado' : 'Acerto pendente'}
          style={[styles.indicator, index < completed && styles.filled]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 22 },
  label: { color: colors.white, fontFamily: fonts.body, fontSize: 13, marginRight: 3 },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: '#173c28',
  },
  filled: { backgroundColor: colors.gold },
})
