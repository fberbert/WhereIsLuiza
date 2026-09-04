import React from 'react'
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native'
import { Overlay } from '../components/Overlay'
import { colors, fonts } from '../theme'

interface Props {
  visible: boolean
  onCancel: () => void
}

export function CloseAppOverlay({ visible, onCancel }: Props) {
  return (
    <Overlay visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Text style={styles.question}>Sair do jogo?</Text>
        <View style={styles.answers}>
          <Pressable onPress={() => BackHandler.exitApp()}>
            <Text style={styles.answer}>Sim</Text>
          </Pressable>
          <Pressable onPress={onCancel}>
            <Text style={styles.answer}>Não</Text>
          </Pressable>
        </View>
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlayStrong, justifyContent: 'center', alignItems: 'center' },
  question: { color: colors.white, fontFamily: fonts.body, fontSize: 60 },
  answers: { flexDirection: 'row' },
  answer: { color: colors.white, fontFamily: fonts.body, fontSize: 30, margin: 30 },
})
