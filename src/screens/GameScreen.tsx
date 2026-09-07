import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { images } from '../assets'
import { useAudio } from '../audio/useAudio'
import { AnimatedTitle } from '../components/AnimatedTitle'
import { Board } from '../components/Board'
import { Detective } from '../components/Detective'
import { ExtraLifeProgress } from '../components/ExtraLifeProgress'
import { LivesRow } from '../components/LivesRow'
import { Spider } from '../components/Spider'
import { TopBar } from '../components/TopBar'
import { TrophiesRow } from '../components/TrophiesRow'
import { Wallpaper } from '../components/Wallpaper'
import { useRoundController } from '../game/useRoundController'
import { CloseAppOverlay } from '../overlays/CloseAppOverlay'
import { GameOverOverlay } from '../overlays/GameOverOverlay'
import { HallOfFameOverlay } from '../overlays/HallOfFameOverlay'
import { saveGame } from '../storage/game'
import { colors, fonts } from '../theme'
import { useGameEnvironment } from './useGameEnvironment'
import { useGameSession, type GameSession } from './useGameSession'

type OverlayKind = 'none' | 'hallOfFame' | 'closeApp'
type Session = ReturnType<typeof useGameSession>

export function GameScreen() {
  const session = useGameSession()
  return (
    <Wallpaper source={images.wallpaper}>
      <StatusBar hidden />
      {session.data ? (
        <GameContent session={session} data={session.data} />
      ) : (
        <View style={styles.loading}>
          {session.error ? (
            <>
              <Text style={styles.message}>{session.error}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tentar carregar novamente"
                onPress={session.reload}
                style={styles.action}
              >
                <Text style={styles.actionText}>Tentar novamente</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator size="large" color={colors.white} accessibilityLabel="Carregando o jogo" />
          )}
        </View>
      )}
    </Wallpaper>
  )
}

function GameContent({ session, data }: { session: Session; data: GameSession }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const compact = width < 700
  const { foreground, reducedMotion } = useGameEnvironment()
  const [overlay, setOverlay] = useState<OverlayKind>('none')
  const suspended = !foreground || overlay !== 'none'
  const audio = useAudio({ ...data.settings, active: !suspended })
  const round = useRoundController(data.initialGame, { suspended, save: saveGame, onEvents: audio.playEvents })
  const { game } = round
  const { patchSettings } = session
  const railStyle = { width: compact ? 64 : 94 }
  const closeOverlay = useCallback(() => setOverlay('none'), [])
  const scoreAnchor = useRef<React.ComponentRef<typeof View>>(null)
  const [scoreTarget, setScoreTarget] = useState<{ x: number; y: number } | null>(null)
  const measureScore = useCallback(() => {
    scoreAnchor.current?.measureInWindow((x, y, w, h) => {
      if (w && h) setScoreTarget({ x: x + 18, y: y + h / 2 })
    })
  }, [])
  useEffect(() => {
    measureScore()
  }, [measureScore, width, insets.left, insets.right])
  useEffect(() => {
    if (game.phase === 'gameOver' && game.score > data.settings.highScore) {
      patchSettings({ highScore: game.score })
    }
  }, [game.phase, game.score, data.settings.highScore, patchSettings])

  const revealing = game.phase === 'revealing'
  const judged = revealing || game.phase === 'roundEnd' || game.phase === 'gameOver'
  const hit = judged && game.lastGuess === game.luizaCupId
  const earned = revealing && hit && game.hitsTowardLife === 0
  const focused = ['preview', 'covering', 'shuffling', 'guessing'].includes(game.phase)
  const instruction =
    game.phase === 'preview'
      ? 'Olhe onde a Luiza está!'
      : game.phase === 'covering' || game.phase === 'shuffling'
      ? 'Acompanhe o copo!'
      : game.phase === 'guessing'
      ? 'Onde está a Luiza?'
      : hit
      ? 'Me achou!'
      : 'Vamos tentar de novo!'
  const safeArea = {
    marginTop: insets.top,
    marginBottom: insets.bottom,
    marginLeft: insets.left,
    marginRight: insets.right,
  }
  const onSaveScore = async () => {
    if (round.saving || round.error) return
    if (await session.record(game.score)) round.restart()
  }

  return (
    <View style={[styles.container, safeArea]} onLayout={measureScore}>
      <View style={styles.header}>
        <View style={styles.title}>
          <AnimatedTitle paused={focused || suspended || reducedMotion} fontSize={compact ? 28 : 32}>
            Onde Está Luiza?
          </AnimatedTitle>
        </View>
        <TopBar
          effectsOn={data.settings.effectsOn}
          musicOn={data.settings.musicOn}
          onToggleEffects={() => session.patchSettings({ effectsOn: !data.settings.effectsOn })}
          onToggleMusic={() => session.patchSettings({ musicOn: !data.settings.musicOn })}
          onClose={() => setOverlay('closeApp')}
        />
      </View>
      <View style={styles.scoreRow}>
        <View ref={scoreAnchor} collapsable={false} onLayout={measureScore}>
          <TrophiesRow count={game.score} reducedMotion={reducedMotion || suspended} />
        </View>
        <LivesRow
          count={game.lives}
          gained={earned}
          lost={revealing && !hit}
          reducedMotion={reducedMotion || suspended}
        />
        <ExtraLifeProgress count={game.hitsTowardLife} earned={earned} reducedMotion={reducedMotion || suspended} />
      </View>
      <Text style={styles.instruction} accessibilityLiveRegion="polite">
        {instruction}
      </Text>
      <View style={styles.playArea}>
        <View style={[styles.characters, railStyle]}>
          <Spider
            paused={focused || suspended || reducedMotion}
            size={compact ? 60 : 86}
            onPress={() => audio.play('spider')}
          />
          <Detective size={compact ? 60 : 86} reducedMotion={reducedMotion} onPress={() => audio.play('boing')} />
        </View>
        <Board
          game={game}
          enabled={round.animating}
          reducedMotion={reducedMotion}
          generation={round.generation}
          onChoose={round.choose}
          onAnimationEnd={round.onAnimationEnd}
          onResize={round.onResize}
          scoreTarget={scoreTarget}
        />
      </View>
      <View style={styles.footer}>
        <View style={styles.nextSlot}>
          {game.phase === 'roundEnd' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próxima rodada"
              disabled={round.saving || !!round.error}
              onPress={round.next}
              style={styles.action}
            >
              <Text style={styles.actionText}>Próxima rodada</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir Hall da Fama"
          onPress={() => setOverlay('hallOfFame')}
          style={styles.hall}
        >
          <Text style={styles.hallText}>Hall da Fama | Recorde: {data.settings.highScore}</Text>
        </Pressable>
      </View>
      {(round.error || session.settingsError) && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{round.error ?? session.settingsError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tentar salvar novamente"
            onPress={round.error ? round.retrySave : session.retrySettings}
            style={styles.retry}
          >
            <Text style={styles.actionText}>Tentar novamente</Text>
          </Pressable>
        </View>
      )}
      <HallOfFameOverlay visible={overlay === 'hallOfFame'} entries={data.leaderboard} onClose={closeOverlay} />
      <CloseAppOverlay visible={overlay === 'closeApp'} onCancel={closeOverlay} />
      <GameOverOverlay
        visible={game.phase === 'gameOver'}
        score={game.score}
        playerName={data.settings.playerName}
        onChangeName={playerName => session.patchSettings({ playerName })}
        onSave={onSaveScore}
        saving={session.savingScore || round.saving}
        error={session.scoreError ?? round.error}
        onRetryProgress={round.error ? round.retrySave : undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  message: { color: colors.white, fontFamily: fonts.body, fontSize: 20, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  title: { flex: 1, alignItems: 'center' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 48,
    backgroundColor: 'rgba(9, 32, 19, 0.72)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 10,
  },
  instruction: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 19,
    textAlign: 'center',
    paddingVertical: 5,
    textShadowColor: '#17351e',
    textShadowRadius: 4,
    textShadowOffset: { width: 1, height: 1 },
  },
  playArea: { flex: 1, flexDirection: 'row', minHeight: 0, gap: 8 },
  characters: { justifyContent: 'space-between', alignItems: 'center' },
  footer: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nextSlot: { flex: 1, alignItems: 'center' },
  action: {
    backgroundColor: '#ffd260',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: { color: '#19321c', fontFamily: fonts.body, fontSize: 17 },
  hall: { padding: 10, minHeight: 44, justifyContent: 'center' },
  hallText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 17,
    textShadowColor: '#17351e',
    textShadowRadius: 4,
    textShadowOffset: { width: 1, height: 1 },
  },
  error: {
    position: 'absolute',
    bottom: 4,
    left: 12,
    right: 12,
    backgroundColor: '#fff1d2',
    padding: 12,
    borderRadius: 12,
    zIndex: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { flex: 1, color: '#40290b', fontSize: 15 },
  retry: { padding: 8 },
})
