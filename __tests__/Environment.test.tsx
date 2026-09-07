import React from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native'
import { useGameEnvironment } from '../src/screens/useGameEnvironment'

let result: ReturnType<typeof useGameEnvironment>
let tree: ReactTestRenderer
let changeMotion: (value: boolean) => void
let changeApp: (value: AppStateStatus) => void
const remove = jest.fn()
function Harness() {
  result = useGameEnvironment()
  return null
}
beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_name, fn) => {
    changeMotion = fn as (value: boolean) => void
    return { remove }
  })
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_name, fn) => {
    changeApp = fn
    return { remove }
  })
  remove.mockClear()
})
afterEach(async () => {
  await act(async () => tree.unmount())
  jest.restoreAllMocks()
})
const mount = async () => {
  await act(async () => {
    tree = create(<Harness />)
  })
}

it('keeps the latest motion preference if initial query completes after a change event', async () => {
  const query = Promise.withResolvers<boolean>()
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(query.promise)
  await mount()
  await act(async () => changeMotion(true))
  await act(async () => query.resolve(false))
  expect(result.reducedMotion).toBe(true)
})

it('tracks inactive/background and foreground independently of motion query errors', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('unsupported'))
  await mount()
  await act(async () => changeApp('inactive'))
  expect(result.foreground).toBe(false)
  await act(async () => changeApp('background'))
  expect(result.foreground).toBe(false)
  await act(async () => changeApp('active'))
  expect(result.foreground).toBe(true)
  expect(result.reducedMotion).toBe(false)
})

it('removes listeners and ignores late preference query on unmount', async () => {
  const query = Promise.withResolvers<boolean>()
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(query.promise)
  await mount()
  await act(async () => tree.unmount())
  await act(async () => query.resolve(true))
  expect(result.reducedMotion).toBe(false)
  expect(remove).toHaveBeenCalledTimes(2)
})
