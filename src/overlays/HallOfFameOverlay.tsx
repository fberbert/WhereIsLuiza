import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome5 from '@react-native-vector-icons/fontawesome5/static'
import { images } from '../assets'
import { AnimatedTitle } from '../components/AnimatedTitle'
import { Overlay } from '../components/Overlay'
import { Wallpaper } from '../components/Wallpaper'
import type { LeaderboardEntry } from '../storage/leaderboard'
import { colors, fonts } from '../theme'

interface Props {
  visible: boolean
  entries: LeaderboardEntry[]
  onClose: () => void
}

function Row({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rankCell}>
        <FontAwesome5 name="trophy" iconStyle="solid" size={30} color={colors.gold} />
        <Text style={styles.rankNumber}>{rank}</Text>
      </View>
      <View style={styles.nameCell}>
        <Text style={styles.cellText}>{entry.name}</Text>
      </View>
      <View style={styles.scoreCell}>
        <Text style={styles.cellText}>{entry.score}</Text>
      </View>
    </View>
  )
}

export function HallOfFameOverlay({ visible, entries, onClose }: Props) {
  return (
    <Overlay visible={visible} onRequestClose={onClose}>
      <Wallpaper source={images.wallpaperHallOfFame}>
        <View style={styles.container}>
          <View style={styles.header}>
            <AnimatedTitle>Hall da Fama</AnimatedTitle>
          </View>
          <View style={styles.tableHeader}>
            <View style={styles.rankCell}>
              <Text style={styles.headerText}>RANK</Text>
            </View>
            <View style={styles.nameCell}>
              <Text style={styles.headerText}>NOME</Text>
            </View>
            <View style={styles.scoreCell}>
              <Text style={styles.headerText}>PONTOS</Text>
            </View>
          </View>
          <FlatList
            data={entries}
            keyExtractor={e => `${e.at}-${e.name}`}
            renderItem={({ item, index }) => <Row rank={index + 1} entry={item} />}
            style={styles.list}
          />
          <Pressable onPress={onClose} style={styles.close}>
            <FontAwesome5 name="home" iconStyle="solid" size={30} color={colors.white} />
          </Pressable>
        </View>
      </Wallpaper>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', padding: 20 },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  tableHeader: {
    marginTop: 15,
    flexDirection: 'row',
    width: '80%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
  },
  headerText: { color: colors.white, fontSize: 15, fontFamily: fonts.body },
  list: { width: '80%', backgroundColor: 'rgba(0,0,0,0.3)', paddingTop: 5 },
  row: { flexDirection: 'row' },
  rankCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  rankNumber: { position: 'absolute', color: 'black', fontWeight: 'bold' },
  nameCell: { flex: 3, justifyContent: 'center' },
  scoreCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cellText: { color: colors.white, fontSize: 20, marginRight: 15, fontFamily: fonts.body },
  close: { position: 'absolute', right: 20, bottom: 20 },
})
