import React, { useEffect, useRef, type ReactNode } from 'react'
import { Animated, BackHandler, StyleSheet } from 'react-native'

interface Props {
  visible: boolean
  /** Chamado no botão voltar do Android. Omitir bloqueia o voltar enquanto o overlay está aberto. */
  onRequestClose?: () => void
  children: ReactNode
}

// Substitui o <Modal> nativo: no Fabric em landscape a Dialog recorta o conteúdo
// e anima o "slide" de lado. Um View absoluto por cima do jogo não tem esses problemas.
export function Overlay({ visible, onRequestClose, children }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return
    opacity.setValue(0)
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose?.()
      return true
    })
    return () => sub.remove()
  }, [visible, opacity, onRequestClose])

  if (!visible) return null
  return <Animated.View style={[StyleSheet.absoluteFill, styles.top, { opacity }]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  top: { zIndex: 10 },
})
