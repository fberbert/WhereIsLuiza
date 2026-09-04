import { CUP_COUNT, INITIAL_LIVES, cupFace, newGame, nextRound, tap } from './logic'

const rngFor = (cup: number) => () => cup / CUP_COUNT

describe('newGame', () => {
  it('starts with 3 lives, zero score, closed cups', () => {
    const g = newGame(rngFor(1))
    expect(g).toEqual({
      score: 0,
      lives: INITIAL_LIVES,
      streak: 0,
      luizaAt: 1,
      phase: 'closed',
      lastGuess: null,
      gameOver: false,
    })
  })
})

describe('tap on closed cups', () => {
  it('hit: +1 score, +1 streak, reveals', () => {
    const { state, events } = tap(newGame(rngFor(2)), 2)
    expect(state).toMatchObject({ score: 1, streak: 1, lives: 3, phase: 'revealed', lastGuess: 2 })
    expect(events).toEqual(['hit'])
  })

  it('second consecutive hit grants a life and resets streak', () => {
    const first = tap(newGame(rngFor(0)), 0).state
    const { state, events } = tap(nextRound(first, rngFor(1)), 1)
    expect(state).toMatchObject({ score: 2, streak: 0, lives: 4 })
    expect(events).toEqual(['hit', 'extraLife'])
  })

  it('miss: -1 life, streak untouched', () => {
    const g = { ...newGame(rngFor(0)), streak: 1 }
    const { state, events } = tap(g, 2)
    expect(state).toMatchObject({ lives: 2, streak: 1, score: 0, phase: 'revealed', lastGuess: 2 })
    expect(events).toEqual(['miss'])
  })

  it('miss on last life ends the game', () => {
    const g = { ...newGame(rngFor(0)), lives: 1 }
    const { state, events } = tap(g, 1)
    expect(state.gameOver).toBe(true)
    expect(state.lives).toBe(0)
    expect(events).toEqual(['miss', 'gameOver'])
  })
})

describe('tap on revealed cups', () => {
  it('starts a new round keeping score/lives/streak', () => {
    const revealed = tap(newGame(rngFor(0)), 0).state
    const { state, events } = tap(revealed, 1, rngFor(2))
    expect(state).toMatchObject({ score: 1, streak: 1, lives: 3, luizaAt: 2, phase: 'closed', lastGuess: null })
    expect(events).toEqual([])
  })
})

describe('tap after game over', () => {
  it('is ignored', () => {
    const g = { ...newGame(rngFor(0)), lives: 0, gameOver: true, phase: 'revealed' as const }
    expect(tap(g, 0)).toEqual({ state: g, events: [] })
  })
})

describe('cupFace', () => {
  it('all closed before a guess', () => {
    const g = newGame(rngFor(1))
    expect([0, 1, 2].map(i => cupFace(g, i as 0 | 1 | 2))).toEqual(['closed', 'closed', 'closed'])
  })
  it('hit: luiza on the right cup, others stay closed', () => {
    const g = tap(newGame(rngFor(1)), 1).state
    expect([0, 1, 2].map(i => cupFace(g, i as 0 | 1 | 2))).toEqual(['closed', 'luiza', 'closed'])
  })
  it('miss: luiza on the right cup, others wrong', () => {
    const g = tap(newGame(rngFor(1)), 0).state
    expect([0, 1, 2].map(i => cupFace(g, i as 0 | 1 | 2))).toEqual(['wrong', 'luiza', 'wrong'])
  })
})
