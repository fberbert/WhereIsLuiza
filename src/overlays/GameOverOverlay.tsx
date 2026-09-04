import React from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import LottieView from 'lottie-react-native'
import Fontisto from '@react-native-vector-icons/fontisto/static'
import { lottie } from '../assets'
import { Overlay } from '../components/Overlay'
import { colors, fonts } from '../theme'

interface Props {
  visible: boolean
  score: number
  playerName: string
  onChangeName: (name: string) => void
  onSave: () => void
}

export function GameOverOverlay({ visible, score, playerName, onChangeName, onSave }: Props) {
  return (
    <Overlay visible={visible}>
      <View style={styles.backdrop}>
        <Text style={styles.title}>Fim de Jogo</Text>
        <View style={styles.scoreRow}>
          <LottieView source={lottie.trophy} autoPlay loop style={styles.trophy} />
          <Text style={styles.title}> = {score}</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            placeholder="Digite seu nome"
            value={playerName}
            onChangeText={onChangeName}
            autoComplete="name"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.placeholder}
            style={styles.input}
          />
          <Pressable onPress={onSave}>
            <Fontisto name="save" size={40} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlayStrong, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 45, fontFamily: fonts.body, textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  trophy: { width: 45, height: 45 },
  form: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: {
    borderColor: colors.placeholder,
    borderWidth: 0.5,
    width: 250,
    color: colors.placeholder,
    paddingLeft: 20,
    fontSize: 20,
    fontFamily: fonts.body,
    marginRight: 10,
  },
})
