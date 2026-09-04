import React, { type ReactNode } from 'react'
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native'

interface Props {
  source: ImageSourcePropType
  children: ReactNode
}

export function Wallpaper({ source, children }: Props) {
  return (
    <View style={styles.fill}>
      <Image source={source} resizeMode="stretch" style={StyleSheet.absoluteFill} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
