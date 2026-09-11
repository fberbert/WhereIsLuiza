import {
  chooseCup,
  completePhase,
  completeSwap,
  newGame,
  nextRound,
  resumeGame,
  type CupId,
  type GamePhase,
  type GameState,
} from './logic'

const rng = () => 0
const phases: GamePhase[] = ['preview', 'covering', 'shuffling', 'guessing', 'revealing', 'roundEnd', 'gameOver']

function ready(state = newGame(rng)): GameState {
  const covering = completePhase(state, state.roundId, 'preview')
  let shuffled = completePhase(covering, covering.roundId, 'covering')
  while (shuffled.phase === 'shuffling') {
    shuffled = completeSwap(shuffled, shuffled.roundId, shuffled.swapIndex)
  }
  return shuffled
}

function endRound(state: GameState): GameState {
  return completePhase(state, state.roundId, 'revealing')
}

describe('round setup', () => {
  it('starts a deterministic preview with stable cup IDs and a shuffle plan', () => {
    expect(newGame(rng, 8)).toEqual({
      score: 0,
      lives: 3,
      hitsTowardLife: 0,
      luizaCupId: 0,
      order: [0, 1, 2],
      swaps: [
        [0, 1],
        [0, 2],
        [0, 1],
      ],
      swapIndex: 0,
      phase: 'preview',
      lastGuess: null,
      roundId: 8,
      difficulty: { swaps: 3, durationMs: 650 },
    })
  })

  it.each([0, 1, 2] as CupId[])('selects Luiza cup %i using the supplied RNG', cupId => {
    expect(newGame(() => cupId / 3).luizaCupId).toBe(cupId)
  })

  it('supports default random sources', () => {
    const start = newGame()
    expect(start.roundId).toBe(0)
    expect(start.luizaCupId).toBeGreaterThanOrEqual(0)
    expect(start.luizaCupId).toBeLessThan(3)
    expect(nextRound({ ...start, phase: 'roundEnd' }).phase).toBe('preview')
    expect(resumeGame(start).phase).toBe('preview')
  })

  it('prepares the next difficulty while preserving earned totals', () => {
    const previous: GameState = {
      ...newGame(rng),
      phase: 'roundEnd',
      score: 3,
      lives: 7,
      hitsTowardLife: 1,
      lastGuess: 0,
    }
    expect(nextRound(previous, () => 0.8)).toMatchObject({
      phase: 'preview',
      score: 3,
      lives: 7,
      hitsTowardLife: 1,
      lastGuess: null,
      luizaCupId: 2,
      order: [0, 1, 2],
      roundId: 1,
      swapIndex: 0,
      difficulty: { swaps: 4, durationMs: 560 },
    })
    expect(nextRound(previous, rng).swaps).toHaveLength(4)
  })

  it.each(phases.filter(phase => phase !== 'roundEnd'))('does not start another round from %s', phase => {
    const state = { ...newGame(rng), phase }
    expect(nextRound(state, rng)).toBe(state)
  })
})

describe('phase and shuffle callbacks', () => {
  it('covers Luiza before moving and waits for every swap before guessing', () => {
    const preview = newGame(rng)
    const covering = completePhase(preview, 0, 'preview')
    expect(covering.phase).toBe('covering')
    const shuffling = completePhase(covering, 0, 'covering')
    expect(shuffling.phase).toBe('shuffling')
    const first = completeSwap(shuffling, 0, 0)
    expect(first).toMatchObject({ phase: 'shuffling', swapIndex: 1, order: [1, 0, 2] })
    expect(shuffling.order).toEqual([0, 1, 2])
    const second = completeSwap(first, 0, 1)
    expect(second).toMatchObject({ phase: 'shuffling', swapIndex: 2, order: [2, 0, 1] })
    const third = completeSwap(second, 0, 2)
    expect(third).toMatchObject({ phase: 'guessing', swapIndex: 3, order: [0, 2, 1] })
    expect(third.luizaCupId).toBe(preview.luizaCupId)
  })

  it('rejects stale rounds and duplicate phase completions', () => {
    const preview = newGame(rng, 4)
    expect(completePhase(preview, 3, 'preview')).toBe(preview)
    expect(completePhase(preview, 4, 'covering')).toBe(preview)
    const covering = completePhase(preview, 4, 'preview')
    expect(completePhase(covering, 4, 'preview')).toBe(covering)
  })

  it.each(['shuffling', 'guessing', 'roundEnd', 'gameOver'] as GamePhase[])(
    'ignores generic phase completion in %s',
    phase => {
      const state = { ...newGame(rng), phase }
      expect(completePhase(state, state.roundId, phase)).toBe(state)
    },
  )

  it('rejects stale rounds, out-of-order swaps and duplicate swap callbacks', () => {
    const state = completePhase(completePhase(newGame(rng), 0, 'preview'), 0, 'covering')
    expect(completeSwap(state, 1, 0)).toBe(state)
    expect(completeSwap(state, 0, 1)).toBe(state)
    const moved = completeSwap(state, 0, 0)
    expect(completeSwap(moved, 0, 0)).toBe(moved)
  })

  it.each(phases.filter(phase => phase !== 'shuffling'))('ignores swap completion in %s', phase => {
    const state = { ...newGame(rng), phase }
    expect(completeSwap(state, 0, 0)).toBe(state)
  })
})

describe('guesses and accumulated rewards', () => {
  it('awards a point and reveals only once', () => {
    const before = ready()
    const hit = chooseCup(before, 0)
    expect(hit.state).toMatchObject({ score: 1, lives: 3, hitsTowardLife: 1, phase: 'revealing', lastGuess: 0 })
    expect(hit.events).toEqual(['hit'])
    expect(before.score).toBe(0)
    expect(chooseCup(hit.state, 0)).toEqual({ state: hit.state, events: [] })
    expect(endRound(hit.state).phase).toBe('roundEnd')
  })

  it('counts stable cup identity instead of its shuffled position', () => {
    const state: GameState = { ...ready(), order: [2, 0, 1], luizaCupId: 0 }
    expect(chooseCup(state, 0).events).toEqual(['hit'])
    expect(chooseCup(state, 1).events).toEqual(['miss'])
  })

  it('awards a life only on the fifth accumulated hit and preserves progress on a miss', () => {
    const hit = chooseCup(ready(), 0).state
    const miss = chooseCup(ready(nextRound(endRound(hit), rng)), 1)
    expect(miss.state).toMatchObject({ score: 1, lives: 2, hitsTowardLife: 1 })
    expect(miss.events).toEqual(['miss'])
    const secondHit = chooseCup(ready(nextRound(endRound(miss.state), rng)), 0)
    expect(secondHit.state).toMatchObject({ score: 2, lives: 2, hitsTowardLife: 2 })
    expect(secondHit.events).toEqual(['hit'])
    let previous = secondHit.state
    for (const score of [3, 4, 5]) {
      const result = chooseCup(ready(nextRound(endRound(previous), rng)), 0)
      expect(result.state).toMatchObject({ score, lives: score === 5 ? 3 : 2, hitsTowardLife: score % 5 })
      expect(result.events).toEqual(score === 5 ? ['hit', 'extraLife'] : ['hit'])
      expect(chooseCup(result.state, 0)).toEqual({ state: result.state, events: [] })
      previous = result.state
    }
    const resumed = resumeGame(previous)
    expect(resumed).toMatchObject({ lives: 3, score: 5, hitsTowardLife: 0 })
    const sixth = chooseCup(ready(nextRound(resumed, rng)), 0)
    expect(sixth.state).toMatchObject({ lives: 3, score: 6, hitsTowardLife: 1 })
    expect(sixth.events).toEqual(['hit'])
  })

  it('reveals the last miss before entering game over', () => {
    const miss = chooseCup({ ...ready(), lives: 1 }, 2)
    expect(miss.state).toMatchObject({ lives: 0, phase: 'revealing', lastGuess: 2 })
    expect(miss.events).toEqual(['miss', 'gameOver'])
    const ended = endRound(miss.state)
    expect(ended.phase).toBe('gameOver')
    expect(nextRound(ended, rng)).toBe(ended)
  })

  it.each(phases.filter(phase => phase !== 'guessing'))('ignores guesses in %s', phase => {
    const state = { ...newGame(rng), phase }
    expect(chooseCup(state, 0)).toEqual({ state, events: [] })
  })
})

describe('resume', () => {
  it.each(['preview', 'covering', 'shuffling', 'guessing'] as GamePhase[])(
    'restarts unjudged %s with a new round ID and preserves totals',
    phase => {
      const state: GameState = { ...newGame(rng, 12), phase, score: 9, lives: 5, hitsTowardLife: 1 }
      const resumed = resumeGame(state, () => 0.9)
      expect(resumed).toMatchObject({
        phase: 'preview',
        roundId: 13,
        score: 9,
        lives: 5,
        hitsTowardLife: 1,
        luizaCupId: 2,
        swapIndex: 0,
        lastGuess: null,
        difficulty: { swaps: 6, durationMs: 380 },
      })
      expect(resumed.swaps).toHaveLength(6)
      expect(completePhase(resumed, 12, 'preview')).toBe(resumed)
    },
  )

  it.each([1, 0])('settles judged reveal with %i lives without replaying rewards', lives => {
    const state: GameState = { ...newGame(rng, 4), phase: 'revealing', lastGuess: 1, lives, score: 2 }
    expect(resumeGame(state, rng)).toEqual({ ...state, phase: lives > 0 ? 'roundEnd' : 'gameOver' })
  })

  it.each(['roundEnd', 'gameOver'] as GamePhase[])('preserves settled %s', phase => {
    const state = { ...newGame(rng), phase }
    expect(resumeGame(state, rng)).toBe(state)
  })
})
