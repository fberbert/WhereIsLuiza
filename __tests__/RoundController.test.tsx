import React from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { newGame, type GameState } from '../src/game/logic'
import { useRoundController } from '../src/game/useRoundController'

const save = jest.fn(async (_game: GameState) => {})
const events = jest.fn()
let current: ReturnType<typeof useRoundController>
let tree: ReactTestRenderer
const initial = (patch: Partial<GameState> = {}): GameState => ({ ...newGame(() => 0), ...patch })

function Harness({ game, suspended = false }: { game: GameState; suspended?: boolean }) {
  current = useRoundController(game, { suspended, save, onEvents: events })
  return null
}

async function mount(game = initial()) {
  await act(async () => {
    tree = create(<Harness game={game} />)
  })
}

beforeEach(() => {
  save.mockReset().mockResolvedValue(undefined)
  events.mockClear()
})
afterEach(async () => {
  if (tree) await act(async () => tree.unmount())
})

it('advances only completed matching animations and ignores a duplicate completion', async () => {
  await mount()
  const previewFinished = current.onAnimationEnd
  await act(async () => previewFinished({ finished: false }))
  expect(current.game.phase).toBe('preview')
  await act(async () => previewFinished({ finished: true }))
  expect(current.game.phase).toBe('covering')
  await act(async () => previewFinished({ finished: true }))
  expect(current.game.phase).toBe('covering')
  await act(async () => current.onAnimationEnd({ finished: true }))
  const before = current.game.order
  const firstSwap = current.onAnimationEnd
  expect(current.game.phase).toBe('shuffling')
  await act(async () => firstSwap({ finished: true }))
  expect(current.game.order).not.toEqual(before)
  const after = current.game.order
  await act(async () => firstSwap({ finished: true }))
  expect(current.game.order).toEqual(after)
})

it('blocks choices during preview and counts rapid duplicate guesses only once', async () => {
  await mount()
  await act(async () => current.choose(0))
  expect(current.game.score).toBe(0)
  while (current.game.phase !== 'guessing') {
    await act(async () => current.onAnimationEnd({ finished: true }))
  }
  await act(async () => {
    current.choose(0)
    current.choose(0)
  })
  expect(current.game.score).toBe(1)
  expect(events).toHaveBeenCalledTimes(1)
  expect(current.game.phase).toBe('revealing')
  await act(async () => current.onAnimationEnd({ finished: true }))
  expect(current.game.phase).toBe('roundEnd')
  await act(async () => current.next())
  expect(current.game.phase).toBe('preview')
  expect(current.game.score).toBe(1)
})

it('waits for the judgment checkpoint before starting the reveal', async () => {
  await mount(initial({ phase: 'guessing' }))
  const pending = Promise.withResolvers<void>()
  save.mockReturnValueOnce(pending.promise)
  await act(async () => current.choose(0))
  expect(current.saving).toBe(true)
  expect(current.animating).toBe(false)
  await act(async () => current.onAnimationEnd({ finished: true }))
  expect(current.game.phase).toBe('revealing')
  await act(async () => pending.resolve())
  expect(current.animating).toBe(true)
})

it('retains the judged score on write failure and retries without replaying effects', async () => {
  await mount(initial({ phase: 'guessing' }))
  save.mockRejectedValueOnce(new Error('disk unavailable'))
  await act(async () => current.choose(0))
  expect(current.error).toBeTruthy()
  expect(current.game.score).toBe(1)
  await act(async () => current.next())
  expect(current.game.phase).toBe('revealing')
  await act(async () => current.retrySave())
  expect(current.error).toBeNull()
  expect(events).toHaveBeenCalledTimes(1)
})

it('suspends unjudged rounds, rejects old callbacks and previews again on resume', async () => {
  const game = initial({ phase: 'shuffling', hitsTowardLife: 1, score: 3 })
  await mount(game)
  const oldCompletion = current.onAnimationEnd
  await act(async () => tree.update(<Harness game={game} suspended />))
  expect(current.animating).toBe(false)
  await act(async () => {
    oldCompletion({ finished: true })
    current.choose(0)
  })
  await act(async () => tree.update(<Harness game={game} />))
  expect(current.game).toMatchObject({ phase: 'preview', hitsTowardLife: 1, score: 3 })
  const resumed = current.game
  await act(async () => oldCompletion({ finished: true }))
  expect(current.game).toBe(resumed)
})

it('settles a judged last-life interruption without replaying the loss', async () => {
  const game = initial({ phase: 'guessing', lives: 1 })
  await mount(game)
  await act(async () => current.choose(1))
  await act(async () => tree.update(<Harness game={game} suspended />))
  await act(async () => tree.update(<Harness game={game} />))
  expect(current.game).toMatchObject({ phase: 'gameOver', lives: 0 })
  expect(events).toHaveBeenCalledTimes(1)
  await act(async () => current.restart())
  expect(current.game).toMatchObject({ phase: 'preview', lives: 3, score: 0 })
})

it('invalidates callbacks on resize and preserves a judged result', async () => {
  await mount(initial({ phase: 'guessing' }))
  const old = current.onAnimationEnd
  await act(async () => current.onResize())
  expect(current.game.phase).toBe('preview')
  await act(async () => old({ finished: true }))
  expect(current.game.phase).toBe('preview')
})

it('ignores completion and pending writes after unmount', async () => {
  await mount(initial({ phase: 'guessing' }))
  const pending = Promise.withResolvers<void>()
  save.mockReturnValueOnce(pending.promise)
  await act(async () => current.choose(0))
  const finish = current.onAnimationEnd
  await act(async () => tree.unmount())
  await act(async () => {
    pending.resolve()
    finish({ finished: true })
  })
  expect(events).toHaveBeenCalledTimes(1)
})
