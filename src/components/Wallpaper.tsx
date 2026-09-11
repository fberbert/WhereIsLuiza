import React, { type ReactNode } from 'react'
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native'

interface Props {
  source: ImageSourcePropType
  children: ReactNode
}

export function Wallpaper({ source, children }: Props) {
  return (
    <View style={styles.fill}>
      <Image source={source} resizeMode="stretch" style={styles.image} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Tamanho explícito: no Fabric o Image com absoluteFill sem width/height ficou no tamanho intrínseco.
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
})
