import { useCallback, useEffect, useRef, useState } from 'react'
import { newGame, type GameState } from '../game/logic'
import { loadGame } from '../storage/game'
import { loadLeaderboard, recordScore, type LeaderboardEntry } from '../storage/leaderboard'
import { loadSettings, saveSettings, type Settings } from '../storage/settings'

export interface GameSession {
  initialGame: GameState
  settings: Settings
  leaderboard: LeaderboardEntry[]
}

export function useGameSession() {
  const [data, setData] = useState<GameSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [savingScore, setSavingScore] = useState(false)
  const alive = useRef(true)
  const current = useRef<GameSession | null>(null)
  const loadTicket = useRef(0)
  const settingsTicket = useRef(0)
  const settingsQueue = useRef(Promise.resolve())
  const scorePending = useRef(false)

  const publish = useCallback((next: GameSession) => {
    current.current = next
    setData(next)
  }, [])

  const reload = useCallback(async () => {
    const ticket = ++loadTicket.current
    setError(null)
    try {
      const [settings, game, leaderboard] = await Promise.all([loadSettings(), loadGame(), loadLeaderboard()])
      if (alive.current && ticket === loadTicket.current) {
        publish({ settings, initialGame: game ?? newGame(), leaderboard })
      }
    } catch {
      if (alive.current && ticket === loadTicket.current) {
        setError('Não foi possível carregar o jogo. Seus dados serão preservados. Tente novamente.')
      }
    }
  }, [publish])

  useEffect(() => {
    alive.current = true
    reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  const writeSettings = useCallback(async (settings: Settings) => {
    const ticket = ++settingsTicket.current
    setSettingsError(null)
    const pending = settingsQueue.current.catch(() => {}).then(() => saveSettings(settings))
    settingsQueue.current = pending
    try {
      await pending
    } catch {
      if (alive.current && ticket === settingsTicket.current) {
        setSettingsError('Não foi possível salvar as preferências.')
      }
    }
  }, [])

  const patchSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (!alive.current || !current.current) return
      const next = { ...current.current, settings: { ...current.current.settings, ...patch } }
      publish(next)
      writeSettings(next.settings)
    },
    [publish, writeSettings],
  )

  const retrySettings = useCallback(async () => {
    if (current.current) await writeSettings(current.current.settings)
  }, [writeSettings])

  const record = useCallback(
    async (score: number) => {
      if (!alive.current || !current.current || scorePending.current) return false
      scorePending.current = true
      setSavingScore(true)
      setScoreError(null)
      try {
        const leaderboard = await recordScore(current.current.settings.playerName, score)
        if (!alive.current) return false
        publish({ ...current.current, leaderboard })
        return true
      } catch {
        if (alive.current) setScoreError('Não foi possível salvar a pontuação. Tente novamente.')
        return false
      } finally {
        scorePending.current = false
        if (alive.current) setSavingScore(false)
      }
    },
    [publish],
  )

  return { data, error, reload, patchSettings, settingsError, retrySettings, record, scoreError, savingScore }
}
