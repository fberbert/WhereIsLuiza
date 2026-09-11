import React from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useGameSession } from '../src/screens/useGameSession'
import { loadGame } from '../src/storage/game'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../src/storage/settings'
import { loadLeaderboard, recordScore } from '../src/storage/leaderboard'
import { newGame } from '../src/game/logic'

jest.mock('../src/storage/game', () => ({ loadGame: jest.fn() }))
jest.mock('../src/storage/settings', () => ({
  ...jest.requireActual('../src/storage/settings'),
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
}))
jest.mock('../src/storage/leaderboard', () => ({ loadLeaderboard: jest.fn(), recordScore: jest.fn() }))
let session: ReturnType<typeof useGameSession>
let tree: ReactTestRenderer
function Harness() {
  session = useGameSession()
  return null
}
async function mount() {
  await act(async () => {
    tree = create(<Harness />)
  })
}

beforeEach(() => {
  jest
    .mocked(loadSettings)
    .mockReset()
    .mockResolvedValue({ ...DEFAULT_SETTINGS, highScore: 7, playerName: 'Luiza' })
  jest.mocked(loadGame).mockReset().mockResolvedValue(null)
  jest.mocked(loadLeaderboard).mockReset().mockResolvedValue([])
  jest.mocked(saveSettings).mockReset().mockResolvedValue(undefined)
  jest
    .mocked(recordScore)
    .mockReset()
    .mockResolvedValue([{ name: 'Luiza', score: 8, at: 1 }])
})
afterEach(async () => {
  await act(async () => tree.unmount())
})

it('loads all data without writing default settings and keeps a restored game', async () => {
  const game = newGame()
  jest.mocked(loadGame).mockResolvedValue(game)
  await mount()
  expect(session.data?.initialGame).toBe(game)
  expect(session.data?.settings.highScore).toBe(7)
  expect(saveSettings).not.toHaveBeenCalled()
})

it('offers retry after a read error without overwriting data', async () => {
  jest.mocked(loadGame).mockRejectedValueOnce(new Error('unavailable'))
  await mount()
  expect(session.error).toBeTruthy()
  expect(session.data).toBeNull()
  expect(saveSettings).not.toHaveBeenCalled()
  await act(async () => session.reload())
  expect(session.error).toBeNull()
  expect(session.data?.initialGame.phase).toBe('preview')
})

it('serializes settings updates and reports/retries a failed write', async () => {
  await mount()
  const pending = Promise.withResolvers<void>()
  jest.mocked(saveSettings).mockReturnValueOnce(pending.promise)
  await act(async () => {
    session.patchSettings({ musicOn: false })
    session.patchSettings({ effectsOn: false })
  })
  expect(saveSettings).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve())
  expect(saveSettings).toHaveBeenLastCalledWith(expect.objectContaining({ musicOn: false, effectsOn: false }))
  jest.mocked(saveSettings).mockRejectedValueOnce(new Error('full'))
  await act(async () => session.patchSettings({ playerName: 'Lulu' }))
  expect(session.settingsError).toBeTruthy()
  await act(async () => session.retrySettings())
  expect(session.settingsError).toBeNull()
})

it('records a score once, blocks concurrent saves, and allows retry on error', async () => {
  await mount()
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof recordScore>>>()
  jest.mocked(recordScore).mockReturnValueOnce(pending.promise)
  let first!: Promise<boolean>
  await act(async () => {
    first = session.record(8)
    expect(await session.record(8)).toBe(false)
  })
  expect(session.savingScore).toBe(true)
  await act(async () => pending.resolve([{ name: 'Luiza', score: 8, at: 1 }]))
  expect(await first).toBe(true)
  expect(recordScore).toHaveBeenCalledTimes(1)
  expect(session.data?.leaderboard).toHaveLength(1)
  jest.mocked(recordScore).mockRejectedValueOnce(new Error('disk'))
  await act(async () => {
    expect(await session.record(9)).toBe(false)
  })
  expect(session.scoreError).toBeTruthy()
  await act(async () => {
    expect(await session.record(9)).toBe(true)
  })
  expect(session.scoreError).toBeNull()
})

it('does not publish a load result after unmount', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<typeof loadSettings>>>()
  jest.mocked(loadSettings).mockReturnValueOnce(pending.promise)
  await mount()
  await act(async () => tree.unmount())
  await act(async () => pending.resolve(DEFAULT_SETTINGS))
  expect(session.data).toBeNull()
})
