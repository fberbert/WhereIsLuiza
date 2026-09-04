import React, { useCallback, useEffect, useState } from 'react'
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { images } from '../assets'
import { useAudio } from '../audio/useAudio'
import { AnimatedTitle } from '../components/AnimatedTitle'
import { Board } from '../components/Board'
import { Detective } from '../components/Detective'
import { LivesRow } from '../components/LivesRow'
import { Spider } from '../components/Spider'
import { TopBar } from '../components/TopBar'
import { TrophiesRow } from '../components/TrophiesRow'
import { Wallpaper } from '../components/Wallpaper'
import { newGame, tap, type CupIndex, type GameState } from '../game/logic'
import { CloseAppOverlay } from '../overlays/CloseAppOverlay'
import { GameOverOverlay } from '../overlays/GameOverOverlay'
import { HallOfFameOverlay } from '../overlays/HallOfFameOverlay'
import { loadGame, saveGame } from '../storage/game'
import { loadLeaderboard, recordScore, type LeaderboardEntry } from '../storage/leaderboard'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../storage/settings'
import { colors, fonts } from '../theme'

type OverlayKind = 'none' | 'hallOfFame' | 'closeApp'

export function GameScreen() {
  const insets = useSafeAreaInsets()
  const [game, setGame] = useState<GameState | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [overlay, setOverlay] = useState<OverlayKind>('none')
  const closeOverlay = useCallback(() => setOverlay('none'), [])
  const audio = useAudio(settings)

  useEffect(() => {
    Promise.all([loadSettings(), loadGame(), loadLeaderboard()]).then(([s, g, lb]) => {
      setSettings(s)
      setGame(g ?? newGame())
      setLeaderboard(lb)
    })
  }, [])

  useEffect(() => {
    if (game) saveGame(game)
  }, [game])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const patchSettings = useCallback((patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch })), [])

  const onTapCup = (cup: CupIndex) => {
    if (!game) return
    const { state, events } = tap(game, cup)
    setGame(state)
    audio.playEvents(events)
    if (state.gameOver && state.score > settings.highScore) patchSettings({ highScore: state.score })
  }

  const onSaveScore = async () => {
    if (!game) return
    setLeaderboard(await recordScore(settings.playerName, game.score))
    setGame(newGame())
  }

  if (!game) return null

  const safeArea = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  }

  return (
    <Wallpaper source={images.wallpaper}>
      <StatusBar hidden />
      <View style={[styles.container, safeArea]}>
        <Spider onPress={() => audio.play('spider')} />
        <Detective onPress={() => audio.play('boing')} />
        <TopBar
          effectsOn={settings.effectsOn}
          musicOn={settings.musicOn}
          onToggleEffects={() => patchSettings({ effectsOn: !settings.effectsOn })}
          onToggleMusic={() => patchSettings({ musicOn: !settings.musicOn })}
          onClose={() => setOverlay('closeApp')}
        />

        <View style={styles.header}>
          <AnimatedTitle>Onde Está Luiza?</AnimatedTitle>
        </View>

        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, styles.scoreLeft]}>
            <TrophiesRow count={game.score} />
          </View>
          <View style={[styles.scoreBox, styles.scoreRight]}>
            <LivesRow count={game.lives} />
          </View>
        </View>

        <Board game={game} onTap={onTapCup} />

        <Pressable onPress={() => setOverlay('hallOfFame')} style={styles.hallOfFame}>
          <Text style={styles.hallOfFameText}>Hall da Fama | Recorde: {settings.highScore}</Text>
        </Pressable>

        <HallOfFameOverlay visible={overlay === 'hallOfFame'} entries={leaderboard} onClose={closeOverlay} />
        <CloseAppOverlay visible={overlay === 'closeApp'} onCancel={closeOverlay} />
        <GameOverOverlay
          visible={game.gameOver}
          score={game.score}
          playerName={settings.playerName}
          onChangeName={name => patchSettings({ playerName: name })}
          onSave={onSaveScore}
        />
      </View>
    </Wallpaper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  scoreRow: { flex: 1, flexDirection: 'row', marginLeft: 140, marginRight: 100, marginTop: 20 },
  scoreBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay },
  scoreLeft: { marginRight: 20 },
  scoreRight: { marginLeft: 20 },
  hallOfFame: { position: 'absolute', right: 20, bottom: 10, padding: 10 },
  hallOfFameText: { color: colors.white, fontFamily: fonts.body, fontSize: 20 },
})
