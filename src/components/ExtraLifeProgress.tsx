import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'

interface Props {
  count: 0 | 1
  earned?: boolean
  reducedMotion?: boolean
}

export function ExtraLifeProgress({ count, earned = false }: Props) {
  const completed = earned ? 2 : count
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Vida extra: {completed}/2</Text>
      {[0, 1].map(index => (
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 22 },
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
