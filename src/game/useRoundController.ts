import { useCallback, useEffect, useRef, useState } from 'react'
import {
  chooseCup,
  completePhase,
  completeSwap,
  newGame,
  nextRound,
  resumeGame,
  type CupId,
  type GameEvent,
  type GameState,
} from './logic'

interface Options {
  suspended: boolean
  save: (state: GameState) => Promise<void>
  onEvents: (events: GameEvent[]) => void
}

export function useRoundController(initialGame: GameState, options: Options) {
  const [game, setGame] = useState(initialGame)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)
  const state = useRef(game)
  const currentOptions = useRef(options)
  currentOptions.current = options
  const alive = useRef(true)
  const blocked = useRef(false)
  const failed = useRef(false)
  const revision = useRef(0)
  const run = useRef(0)

  const update = useCallback((next: GameState) => {
    state.current = next
    setGame(next)
  }, [])

  const persist = useCallback(async (next: GameState) => {
    const ticket = ++revision.current
    blocked.current = true
    failed.current = false
    setSaving(true)
    setError(null)
    try {
      await currentOptions.current.save(next)
    } catch {
      if (alive.current && ticket === revision.current) {
        failed.current = true
        setError('Não foi possível salvar o progresso. Tente novamente.')
      }
    } finally {
      if (alive.current && ticket === revision.current) {
        blocked.current = false
        setSaving(false)
      }
    }
  }, [])

  useEffect(() => {
    alive.current = true
    persist(state.current)
    return () => {
      alive.current = false
      run.current += 1
    }
  }, [persist])

  const recover = useCallback(() => {
    run.current += 1
    setGeneration(run.current)
    const next = resumeGame(state.current)
    update(next)
    persist(next)
  }, [persist, update])

  const wasSuspended = useRef(options.suspended)
  useEffect(() => {
    if (options.suspended === wasSuspended.current) return
    wasSuspended.current = options.suspended
    if (options.suspended) {
      run.current += 1
      setGeneration(run.current)
    } else recover()
  }, [options.suspended, recover])

  const allowed = useCallback(
    () => alive.current && !currentOptions.current.suspended && !blocked.current && !failed.current,
    [],
  )

  const choose = useCallback(
    (cup: CupId) => {
      if (!allowed()) return
      const result = chooseCup(state.current, cup)
      if (result.state === state.current) return
      update(result.state)
      persist(result.state)
      currentOptions.current.onEvents(result.events)
    },
    [allowed, persist, update],
  )

  const next = useCallback(() => {
    if (!allowed()) return
    const following = nextRound(state.current)
    if (following === state.current) return
    update(following)
    persist(following)
  }, [allowed, persist, update])

  const restart = useCallback(() => {
    if (!alive.current || state.current.phase !== 'gameOver') return
    run.current += 1
    setGeneration(run.current)
    const fresh = newGame(Math.random, state.current.roundId + 1)
    update(fresh)
    persist(fresh)
  }, [persist, update])

  const { roundId, phase, swapIndex } = game
  const onAnimationEnd = useCallback(
    ({ finished }: { finished: boolean }) => {
      if (!finished || !allowed() || generation !== run.current) return
      const following =
        phase === 'shuffling'
          ? completeSwap(state.current, roundId, swapIndex)
          : completePhase(state.current, roundId, phase)
      if (following !== state.current) update(following)
    },
    [allowed, generation, phase, roundId, swapIndex, update],
  )

  return {
    game,
    saving,
    error,
    generation,
    choose,
    next,
    restart,
    onAnimationEnd,
    animating: !options.suspended && !saving && !error,
    retrySave: useCallback(() => persist(state.current), [persist]),
    onResize: recover,
  }
}
