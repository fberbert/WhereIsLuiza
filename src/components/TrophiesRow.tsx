import React from 'react'
import { StyleSheet, View } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'

export function TrophiesRow({ count }: { count: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <LottieView key={i} source={lottie.trophy} autoPlay loop style={styles.icon} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  icon: { width: 30, height: 30, marginRight: 4 },
})
