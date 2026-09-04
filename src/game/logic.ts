export const CUP_COUNT = 3
export const INITIAL_LIVES = 3
export const STREAK_FOR_LIFE = 2

export type CupIndex = 0 | 1 | 2
export type CupFace = 'closed' | 'luiza' | 'wrong'
export type GameEvent = 'hit' | 'miss' | 'extraLife' | 'gameOver'
export type Rng = () => number

export interface GameState {
  score: number
  lives: number
  streak: number
  luizaAt: CupIndex
  phase: 'closed' | 'revealed'
  lastGuess: CupIndex | null
  gameOver: boolean
}

function randomCup(rng: Rng): CupIndex {
  return Math.floor(rng() * CUP_COUNT) as CupIndex
}

export function newGame(rng: Rng = Math.random): GameState {
  return {
    score: 0,
    lives: INITIAL_LIVES,
    streak: 0,
    luizaAt: randomCup(rng),
    phase: 'closed',
    lastGuess: null,
    gameOver: false,
  }
}

export function nextRound(state: GameState, rng: Rng = Math.random): GameState {
  return { ...state, luizaAt: randomCup(rng), phase: 'closed', lastGuess: null }
}

export function tap(
  state: GameState,
  cup: CupIndex,
  rng: Rng = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.gameOver) return { state, events: [] }
  if (state.phase === 'revealed') return { state: nextRound(state, rng), events: [] }

  if (cup === state.luizaAt) {
    let { streak, lives } = state
    const events: GameEvent[] = ['hit']
    streak += 1
    if (streak === STREAK_FOR_LIFE) {
      streak = 0
      lives += 1
      events.push('extraLife')
    }
    return {
      state: { ...state, score: state.score + 1, streak, lives, phase: 'revealed', lastGuess: cup },
      events,
    }
  }

  const lives = state.lives - 1
  const gameOver = lives === 0
  return {
    state: { ...state, lives, phase: 'revealed', lastGuess: cup, gameOver },
    events: gameOver ? ['miss', 'gameOver'] : ['miss'],
  }
}

export function cupFace(state: GameState, cup: CupIndex): CupFace {
  if (state.phase === 'closed') return 'closed'
  if (cup === state.luizaAt) return 'luiza'
  return state.lastGuess === state.luizaAt ? 'closed' : 'wrong'
}
