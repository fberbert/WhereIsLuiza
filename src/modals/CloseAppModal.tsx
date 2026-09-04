import React from 'react'
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'

interface Props {
  visible: boolean
  onCancel: () => void
}

export function CloseAppModal({ visible, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
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
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlayStrong, justifyContent: 'center', alignItems: 'center' },
  question: { color: colors.white, fontFamily: fonts.body, fontSize: 60 },
  answers: { flexDirection: 'row' },
  answer: { color: colors.white, fontFamily: fonts.body, fontSize: 30, margin: 30 },
})
