import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Fontisto from '@react-native-vector-icons/fontisto/static'
import { colors } from '../theme'

interface Props {
  effectsOn: boolean
  musicOn: boolean
  onToggleEffects: () => void
  onToggleMusic: () => void
  onClose: () => void
}

export function TopBar({ effectsOn, musicOn, onToggleEffects, onToggleMusic, onClose }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={effectsOn ? 'Desligar efeitos sonoros' : 'Ligar efeitos sonoros'}
        onPress={onToggleEffects}
        style={[styles.button, !effectsOn && styles.off]}
      >
        <Fontisto name="volume-mute" size={25} color={colors.white} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={musicOn ? 'Desligar música' : 'Ligar música'}
        onPress={onToggleMusic}
        style={[styles.button, !musicOn && styles.off]}
      >
        <Fontisto name="music-note" size={25} color={colors.white} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Sair do jogo" onPress={onClose} style={styles.button}>
        <Fontisto name="close-a" size={25} color={colors.white} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row' },
  button: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.5 },
})
