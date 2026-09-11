import { applySwap, difficultyForScore, planSwaps } from './shuffle'
import type { CupId, CupOrder, Difficulty, Rng, Swap } from './shuffle'

export type { CupId, CupOrder, Difficulty, Rng, SlotIndex, Swap } from './shuffle'

export const CUP_COUNT = 3
export const INITIAL_LIVES = 3
export const HITS_PER_LIFE = 5
export type HitsTowardLife = 0 | 1 | 2 | 3 | 4

export type GameEvent = 'hit' | 'miss' | 'extraLife' | 'gameOver'
export type GamePhase = 'preview' | 'covering' | 'shuffling' | 'guessing' | 'revealing' | 'roundEnd' | 'gameOver'

export interface GameState {
  readonly score: number
  readonly lives: number
  readonly hitsTowardLife: HitsTowardLife
  readonly luizaCupId: CupId
  readonly order: CupOrder
  readonly swaps: readonly Swap[]
  readonly swapIndex: number
  readonly phase: GamePhase
  readonly lastGuess: CupId | null
  readonly roundId: number
  readonly difficulty: Difficulty
}

type RoundTotals = Pick<GameState, 'score' | 'lives' | 'hitsTowardLife'>

function prepareRound(totals: RoundTotals, roundId: number, rng: Rng): GameState {
  const difficulty = difficultyForScore(totals.score)
  const luizaCupId = Math.floor(rng() * CUP_COUNT) as CupId
  return {
    ...totals,
    luizaCupId,
    order: [0, 1, 2],
    swaps: planSwaps(difficulty.swaps, rng),
    swapIndex: 0,
    phase: 'preview',
    lastGuess: null,
    roundId,
    difficulty,
  }
}

export function newGame(rng: Rng = Math.random, roundId = 0): GameState {
  return prepareRound({ score: 0, lives: INITIAL_LIVES, hitsTowardLife: 0 }, roundId, rng)
}

function restartRound(state: GameState, rng: Rng): GameState {
  const { score, lives, hitsTowardLife } = state
  return prepareRound({ score, lives, hitsTowardLife }, state.roundId + 1, rng)
}

export function nextRound(state: GameState, rng: Rng = Math.random): GameState {
  return state.phase === 'roundEnd' ? restartRound(state, rng) : state
}

export function resumeGame(state: GameState, rng: Rng = Math.random): GameState {
  if (state.phase === 'roundEnd' || state.phase === 'gameOver') return state
  if (state.phase === 'revealing') {
    return { ...state, phase: state.lives > 0 ? 'roundEnd' : 'gameOver' }
  }
  return restartRound(state, rng)
}

export function chooseCup(state: GameState, cupId: CupId): { state: GameState; events: GameEvent[] } {
  if (state.phase !== 'guessing') return { state, events: [] }
  if (cupId === state.luizaCupId) {
    const extraLife = state.hitsTowardLife + 1 === HITS_PER_LIFE
    return {
      state: {
        ...state,
        score: state.score + 1,
        lives: state.lives + (extraLife ? 1 : 0),
        hitsTowardLife: extraLife ? 0 : ((state.hitsTowardLife + 1) as HitsTowardLife),
        phase: 'revealing',
        lastGuess: cupId,
      },
      events: extraLife ? ['hit', 'extraLife'] : ['hit'],
    }
  }
  const lives = state.lives - 1
  return {
    state: { ...state, lives, phase: 'revealing', lastGuess: cupId },
    events: lives === 0 ? ['miss', 'gameOver'] : ['miss'],
  }
}

export function completePhase(state: GameState, roundId: number, expectedPhase: GamePhase): GameState {
  if (roundId !== state.roundId || expectedPhase !== state.phase) return state
  if (state.phase === 'preview') return { ...state, phase: 'covering' }
  if (state.phase === 'covering') return { ...state, phase: 'shuffling' }
  if (state.phase === 'revealing') {
    return { ...state, phase: state.lives > 0 ? 'roundEnd' : 'gameOver' }
  }
  return state
}

export function completeSwap(state: GameState, roundId: number, swapIndex: number): GameState {
  if (state.phase !== 'shuffling' || roundId !== state.roundId || swapIndex !== state.swapIndex) {
    return state
  }
  const nextIndex = swapIndex + 1
  return {
    ...state,
    order: applySwap(state.order, state.swaps[swapIndex]),
    swapIndex: nextIndex,
    phase: nextIndex === state.swaps.length ? 'guessing' : 'shuffling',
  }
}
