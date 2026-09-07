import AsyncStorage from '@react-native-async-storage/async-storage'
import type { GameState } from '../game/logic'
import { loadGame, saveGame } from './game'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const getItem = jest.mocked(AsyncStorage.getItem)
const setItem = jest.mocked(AsyncStorage.setItem)
const state = (patch: Partial<GameState> = {}): GameState => ({
  score: 4,
  lives: 3,
  hitsTowardLife: 1,
  luizaCupId: 0,
  order: [0, 1, 2],
  swaps: [
    [0, 1],
    [1, 2],
    [0, 1],
  ],
  swapIndex: 0,
  phase: 'preview',
  lastGuess: null,
  roundId: 7,
  difficulty: { swaps: 3, durationMs: 650 },
  ...patch,
})
const legacy = (patch: Record<string, unknown> = {}) => ({
  score: 5,
  lives: 2,
  streak: 1,
  luizaAt: 2,
  phase: 'closed',
  lastGuess: null,
  gameOver: false,
  ...patch,
})
const stored = (value: unknown) => getItem.mockResolvedValue(JSON.stringify(value))
const deferred = () => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  jest.clearAllMocks()
  getItem.mockResolvedValue(null)
  setItem.mockResolvedValue(undefined)
})

describe('loadGame', () => {
  it('returns null for missing or corrupt JSON', async () => {
    expect(await loadGame()).toBeNull()
    getItem.mockResolvedValue('{broken')
    expect(await loadGame()).toBeNull()
  })

  it('propagates storage read failures', async () => {
    getItem.mockRejectedValue(new Error('disk unavailable'))
    await expect(loadGame()).rejects.toThrow('disk unavailable')
  })

  it.each(['preview', 'covering', 'shuffling', 'guessing'] as const)(
    'restarts an unjudged %s round in preview preserving totals',
    async phase => {
      const swapIndex = phase === 'guessing' ? 3 : phase === 'shuffling' ? 1 : 0
      stored({
        version: 2,
        state: state({
          phase,
          swapIndex,
          order: swapIndex === 3 ? [2, 1, 0] : swapIndex === 1 ? [1, 0, 2] : [0, 1, 2],
        }),
      })
      expect(await loadGame()).toMatchObject({
        score: 4,
        lives: 3,
        hitsTowardLife: 1,
        phase: 'preview',
        lastGuess: null,
        swapIndex: 0,
      })
      expect(setItem).not.toHaveBeenCalled()
    },
  )

  it.each(['revealing', 'roundEnd', 'gameOver'] as const)('keeps a judged %s round judged', async phase => {
    const saved = state({ phase, swapIndex: 3, order: [2, 1, 0], lastGuess: 1, lives: phase === 'gameOver' ? 0 : 2 })
    stored({ version: 2, state: saved })
    expect(await loadGame()).toEqual({ ...saved, phase: phase === 'gameOver' ? 'gameOver' : 'roundEnd' })
  })

  it('restores a final-life reveal as game over without replaying judgment', async () => {
    stored({ version: 2, state: state({ phase: 'revealing', swapIndex: 3, order: [2, 1, 0], lastGuess: 2, lives: 0 }) })
    expect(await loadGame()).toMatchObject({ lives: 0, phase: 'gameOver', lastGuess: 2, score: 4 })
  })

  it('migrates a legacy active round retaining accumulated hits', async () => {
    stored(legacy())
    expect(await loadGame()).toMatchObject({ score: 5, lives: 2, hitsTowardLife: 1, phase: 'preview', lastGuess: null })
    expect(getItem).toHaveBeenCalledWith('luiza.game')
    expect(setItem).not.toHaveBeenCalled()
  })

  it.each([
    [{ phase: 'revealed', lastGuess: 2 }, 'preview'],
    [{ phase: 'revealed', lastGuess: 1, lives: 0, gameOver: true }, 'gameOver'],
  ])('migrates a judged legacy round: %j', async (patch, phase) => {
    stored(legacy(patch as Record<string, unknown>))
    expect(await loadGame()).toMatchObject({
      score: 5,
      hitsTowardLife: 1,
      phase,
      lastGuess: phase === 'gameOver' ? patch.lastGuess : null,
    })
  })

  it.each([
    null,
    [],
    3,
    {},
    { version: 1, state: state() },
    { version: 2 },
    { ...legacy(), score: -1 },
    { ...legacy(), lives: 0 },
    { ...legacy(), streak: 2 },
    { ...legacy(), luizaAt: 3 },
    { ...legacy(), phase: 'revealed' },
    { ...legacy(), lastGuess: 0 },
    { ...legacy(), gameOver: true },
    { ...legacy(), phase: 'revealed', lives: 0, lastGuess: 2, gameOver: true },
  ])('rejects invalid envelopes and legacy data: %j', async value => {
    stored(value)
    expect(await loadGame()).toBeNull()
  })

  it.each([
    { score: -1 },
    { score: 1.5 },
    { score: Number.MAX_SAFE_INTEGER + 1 },
    { lives: '3' },
    { lives: -1 },
    { hitsTowardLife: 2 },
    { luizaCupId: 3 },
    { order: [0, 0, 2] },
    { order: [0, 1] },
    { order: [0, 1, 3] },
    {
      swaps: [
        [0, 0],
        [1, 2],
      ],
    },
    {
      swaps: [
        [0, 3],
        [1, 2],
      ],
    },
    { swaps: [[0], [1, 2]] },
    { swaps: null },
    { swapIndex: -1 },
    { swapIndex: 4 },
    { phase: 'unknown' },
    { phase: 'preview', lastGuess: 1 },
    { phase: 'guessing', swapIndex: 0 },
    { phase: 'roundEnd', lastGuess: null },
    { phase: 'roundEnd', lastGuess: 3 },
    { phase: 'gameOver', lastGuess: 1, swapIndex: 2 },
    { phase: 'gameOver', lives: 0, lastGuess: 0, swapIndex: 2 },
    { phase: 'preview', lives: 0 },
    { roundId: -1 },
    { difficulty: null },
    { difficulty: { swaps: 4, durationMs: 560 } },
    { difficulty: { swaps: 2, durationMs: 0 } },
  ])('rejects invalid v2 state: %j', async patch => {
    stored({ version: 2, state: { ...state(), ...patch } })
    expect(await loadGame()).toBeNull()
  })

  it.each([
    {
      swaps: [
        [0, 0],
        [1, 2],
        [0, 1],
      ],
    },
    {
      swaps: [
        [0, 3],
        [1, 2],
        [0, 1],
      ],
    },
    { swaps: [[0], [1, 2], [0, 1]] },
    { swaps: [null, [1, 2], [0, 1]] },
    { difficulty: { swaps: 3, durationMs: 1 } },
    { phase: 'shuffling', swapIndex: 3 },
    { phase: 'covering', swapIndex: 3 },
    { phase: 'roundEnd', lastGuess: null },
    { phase: 'roundEnd', lives: 0 },
    { phase: 'gameOver', lives: 2 },
    { phase: 'gameOver', lives: 0, lastGuess: 0 },
    { order: [0, 1, 2] },
  ])('rejects structurally plausible but inconsistent rounds: %j', async patch => {
    stored({
      version: 2,
      state: {
        ...state({ phase: 'revealing', order: [2, 1, 0], swapIndex: 3, lastGuess: 1 }),
        ...patch,
      },
    })
    expect(await loadGame()).toBeNull()
  })

  it('keeps migrated terminal rounds valid after saving and reloading', async () => {
    stored(legacy({ phase: 'revealed', lastGuess: 1, lives: 0, gameOver: true }))
    const migrated = await loadGame()
    expect(migrated).not.toBeNull()
    await saveGame(migrated!)
    getItem.mockResolvedValue(setItem.mock.calls[0][1])
    expect(await loadGame()).toEqual(migrated)
  })
})

describe('saveGame', () => {
  it('writes only the game key in a versioned envelope', async () => {
    const saved = state()
    await saveGame(saved)
    expect(setItem.mock.calls).toEqual([['luiza.game', JSON.stringify({ version: 2, state: saved })]])
  })

  it('serializes overlapping writes and captures each state on invocation', async () => {
    const firstWrite = deferred()
    setItem.mockReturnValueOnce(firstWrite.promise)
    const first = saveGame(state({ score: 1 }))
    const latest = state({ score: 2 })
    const second = saveGame(latest)
    Object.assign(latest, { score: 99 })
    await Promise.resolve()
    expect(setItem).toHaveBeenCalledTimes(1)
    firstWrite.resolve()
    await Promise.all([first, second])
    expect(setItem.mock.calls.map(([, raw]) => JSON.parse(raw).state.score)).toEqual([1, 2])
  })

  it('propagates a rejected write and still runs the next queued save', async () => {
    const firstWrite = deferred()
    setItem.mockReturnValueOnce(firstWrite.promise)
    const first = saveGame(state({ score: 1 }))
    const rejected = first.catch(error => error)
    const second = saveGame(state({ score: 2 }))
    firstWrite.reject(new Error('write failed'))
    expect(await rejected).toEqual(new Error('write failed'))
    await second
    expect(setItem.mock.calls.map(([, raw]) => JSON.parse(raw).state.score)).toEqual([1, 2])
  })
})
