import AsyncStorage from '@react-native-async-storage/async-storage'
import { HITS_PER_LIFE, newGame, resumeGame, type CupId, type CupOrder, type Swap, type GameState } from '../game/logic'
import { applySwap, difficultyForScore } from '../game/shuffle'
import { loadJson } from './persist'

const KEY = 'luiza.game'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function cup(value: unknown): value is CupId {
  return value === 0 || value === 1 || value === 2
}

function totals(value: Record<string, unknown>): boolean {
  return integer(value.score) && integer(value.lives)
}

function validState(value: unknown): value is GameState {
  if (
    !record(value) ||
    !totals(value) ||
    !integer(value.hitsTowardLife) ||
    value.hitsTowardLife >= HITS_PER_LIFE ||
    !integer(value.roundId) ||
    !cup(value.luizaCupId) ||
    !integer(value.swapIndex)
  )
    return false
  const { order, swaps, difficulty } = value
  if (
    !Array.isArray(order) ||
    order.length !== 3 ||
    !order.every(cup) ||
    new Set(order).size !== 3 ||
    !record(difficulty) ||
    !integer(difficulty.swaps) ||
    difficulty.swaps < 3 ||
    difficulty.swaps > 6 ||
    difficulty.durationMs !== difficultyForScore((difficulty.swaps - 3) * 3).durationMs ||
    !Array.isArray(swaps) ||
    swaps.length !== difficulty.swaps ||
    value.swapIndex > swaps.length ||
    !swaps.every(
      pair => Array.isArray(pair) && pair.length === 2 && cup(pair[0]) && cup(pair[1]) && pair[0] !== pair[1],
    )
  )
    return false

  const expectedOrder = (swaps as Swap[]).slice(0, value.swapIndex).reduce<CupOrder>(applySwap, [0, 1, 2])
  if (!order.every((id, index) => id === expectedOrder[index])) return false
  const judged = value.phase === 'revealing' || value.phase === 'roundEnd' || value.phase === 'gameOver'
  if (judged) {
    if (!cup(value.lastGuess) || value.swapIndex !== swaps.length) return false
    if (value.lives === 0) return value.lastGuess !== value.luizaCupId && value.phase !== 'roundEnd'
    return value.phase !== 'gameOver'
  }
  if (value.lives === 0 || value.lastGuess !== null) return false
  if (value.phase === 'preview' || value.phase === 'covering') return value.swapIndex === 0
  if (value.phase === 'shuffling') return value.swapIndex < swaps.length
  return value.phase === 'guessing' && value.swapIndex === swaps.length
}

function migrate(value: Record<string, unknown>): GameState | null {
  if (
    !totals(value) ||
    (value.streak !== 0 && value.streak !== 1) ||
    !cup(value.luizaAt) ||
    typeof value.gameOver !== 'boolean'
  )
    return null
  const judged = value.phase === 'revealed'
  if (value.phase !== 'closed' && !judged) return null
  if (judged ? !cup(value.lastGuess) : value.lastGuess !== null) return null
  if (value.gameOver !== (value.lives === 0) || (value.gameOver && (!judged || value.lastGuess === value.luizaAt)))
    return null
  const initial = newGame()
  const migrated: GameState = {
    ...initial,
    score: value.score as number,
    lives: value.lives as number,
    hitsTowardLife: value.streak as 0 | 1,
    luizaCupId: value.luizaAt,
    phase: value.gameOver ? 'gameOver' : 'preview',
    lastGuess: value.gameOver ? (value.lastGuess as CupId) : null,
  }
  if (!value.gameOver) return resumeGame(migrated)
  const order = initial.swaps.reduce<CupOrder>(applySwap, [0, 1, 2])
  return { ...migrated, order, swapIndex: initial.swaps.length }
}

export async function loadGame(): Promise<GameState | null> {
  const value = await loadJson<unknown>(KEY)
  if (!record(value)) return null
  if ('version' in value) return value.version === 2 && validState(value.state) ? resumeGame(value.state) : null
  return migrate(value)
}

let pendingWrite: Promise<void> = Promise.resolve()

export function saveGame(state: GameState): Promise<void> {
  const snapshot = JSON.stringify({ version: 2, state })
  const write = pendingWrite.then(() => AsyncStorage.setItem(KEY, snapshot))
  pendingWrite = write.catch(() => undefined)
  return write
}
