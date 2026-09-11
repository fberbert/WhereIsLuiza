import React from 'react'
import { Animated, View } from 'react-native'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Board } from '../src/components/Board'
import { AnimatedCup } from '../src/components/AnimatedCup'
import { RoundFeedback } from '../src/components/RoundFeedback'
import { boardLayout } from '../src/components/boardLayout'
import { newGame, type GameState } from '../src/game/logic'

jest.mock('lottie-react-native', () => ({ __esModule: true, default: require('react-native').View }))
const initial = (patch: Partial<GameState> = {}): GameState => ({ ...newGame(() => 0), ...patch })
let tree: ReactTestRenderer
let complete: ((result: { finished: boolean }) => void)[]
let stop: jest.Mock
const choose = jest.fn()
const end = jest.fn()
const resize = jest.fn()
const stopShuffle = jest.fn()
const shuffleStart = jest.fn(() => stopShuffle)
const props = (game = initial(), patch = {}) => ({
  game,
  enabled: true,
  reducedMotion: false,
  onChoose: choose,
  onAnimationEnd: end,
  onResize: resize,
  onShuffleStart: shuffleStart,
  scoreTarget: null,
  generation: 0,
  ...patch,
})
const mount = (game = initial(), patch = {}) =>
  act(() => {
    tree = create(<Board {...props(game, patch)} />)
  })
const layout = (width = 600, height = 300) =>
  act(() => {
    tree.root
      .findAllByType(View)
      .find(node => node.props.testID === 'board')!
      .props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height } } })
  })
beforeEach(() => {
  complete = []
  stop = jest.fn()
  choose.mockClear()
  end.mockClear()
  resize.mockClear()
  shuffleStart.mockClear()
  stopShuffle.mockClear()
  jest.spyOn(Animated, 'timing').mockImplementation((_value, _config) => ({
    start: callback => {
      if (callback) complete.push(callback)
    },
    stop,
    reset: jest.fn(),
  }))
})
afterEach(() => {
  if (tree) act(() => tree.unmount())
  jest.restoreAllMocks()
})

it('waits for positive measurement and enabled state before starting preview', () => {
  mount(initial(), { enabled: false })
  expect(complete).toHaveLength(0)
  layout(0, 0)
  expect(complete).toHaveLength(0)
  layout()
  expect(complete).toHaveLength(0)
  act(() => tree.update(<Board {...props()} />))
  expect(complete).toHaveLength(1)
  expect(Animated.timing).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ duration: 1200, useNativeDriver: true }),
  )
  expect(resize).not.toHaveBeenCalled()
})
it('advances once on success and never advances on cancellation or stale completion', () => {
  mount()
  layout()
  act(() => complete[0]({ finished: false }))
  expect(end).not.toHaveBeenCalled()
  act(() => tree.update(<Board {...props(initial(), { generation: 1 })} />))
  act(() => complete[0]({ finished: true }))
  expect(end).not.toHaveBeenCalled()
  act(() => {
    complete[1]({ finished: true })
    complete[1]({ finished: true })
  })
  expect(end).toHaveBeenCalledTimes(1)
})
it('stops on disable, unmount, and changed dimensions but ignores identical layout', () => {
  mount()
  layout()
  layout()
  expect(resize).not.toHaveBeenCalled()
  layout(500, 240)
  expect(resize).toHaveBeenCalledTimes(1)
  expect(stop).toHaveBeenCalledTimes(1)
  act(() => tree.update(<Board {...props(initial(), { enabled: false })} />))
  act(() => complete[1]({ finished: true }))
  expect(end).not.toHaveBeenCalled()
  act(() => tree.unmount())
})
it('keeps identity while accessible position and choice follow shuffled order', () => {
  mount(initial({ phase: 'guessing', order: [2, 0, 1] }))
  layout()
  const cups = [0, 1, 2].map(id => tree.root.findAllByProps({ testID: `cup-${id}` })[0])
  expect(cups).toHaveLength(3)
  expect(cups.map(cup => cup.props.testID)).toEqual(['cup-0', 'cup-1', 'cup-2'])
  expect(cups.map(cup => cup.props.accessibilityLabel)).toEqual([
    'Copo do centro',
    'Copo da direita',
    'Copo da esquerda',
  ])
  act(() => cups[0].props.onPress())
  expect(choose).toHaveBeenCalledWith(0)
  expect(complete).toHaveLength(0)
})
it.each([
  ['covering', 220],
  ['shuffling', 650],
  ['revealing', 850],
] as const)('animates %s as one completion boundary', (phase, duration) => {
  mount(initial({ phase, lastGuess: phase === 'revealing' ? 0 : null }))
  layout()
  expect(complete).toHaveLength(1)
  expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration }))
})
it('slows reduced-motion exchanges and blocks guessing outside the choice phase', () => {
  mount(initial({ phase: 'shuffling' }), { reducedMotion: true })
  layout()
  expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 700 }))
  act(() => tree.root.findAllByProps({ testID: 'cup-0' })[0].props.onPress())
  expect(choose).not.toHaveBeenCalled()
})
it.each(['preview', 'guessing', 'roundEnd', 'gameOver'] as const)('never shows a transient trophy in %s', phase => {
  mount(initial({ phase, lastGuess: 0 }))
  layout()
  expect(tree.root.findAllByType(View).filter(node => node.props.testID === 'round-trophy')).toHaveLength(0)
})
it.each([false, true])('shows one transient trophy on a hit, no trophy on miss (reduced=%s)', reducedMotion => {
  mount(initial({ phase: 'revealing', lastGuess: 0 }), { reducedMotion })
  layout()
  expect(tree.root.findAllByType(View).filter(node => node.props.testID === 'round-trophy')).toHaveLength(1)
  act(() => tree.update(<Board {...props(initial({ phase: 'revealing', lastGuess: 1 }), { reducedMotion })} />))
  expect(tree.root.findAllByType(View).filter(node => node.props.testID === 'round-trophy')).toHaveLength(0)
})

it('retains component identities across swaps while moving the two selected cups on distinct arcs', () => {
  const game = initial({ phase: 'shuffling', swaps: [[0, 2]] })
  mount(game)
  layout()
  const before = tree.root.findAllByType(AnimatedCup)
  const progress = before[0].props.progress as Animated.Value
  act(() => progress.setValue(0.5))
  const positions = before.map(cup => cup.findAllByType(Animated.View)[0].props.style[1])
  expect(positions[0].transform[0].translateX.__getValue()).toBe(200)
  expect(positions[2].transform[0].translateX.__getValue()).toBe(-200)
  expect(positions[0].transform[1].translateY.__getValue()).toBeLessThan(0)
  expect(positions[2].transform[1].translateY.__getValue()).toBeGreaterThan(0)
  expect(positions[1].transform[0].translateX.__getValue()).toBe(0)
  act(() => tree.update(<Board {...props({ ...game, order: [2, 1, 0], phase: 'guessing' })} />))
  expect(tree.root.findAllByType(AnimatedCup)).toEqual(before)
})
it('converts the scoreboard window target into the measured board frame', () => {
  mount(initial({ phase: 'revealing', lastGuess: 0 }), { scoreTarget: { x: 110, y: 120 } })
  const measured = tree.root.findAllByType(View).find(node => node.props.testID === 'board')!
  jest.spyOn(measured.instance, 'measureInWindow').mockImplementation((...args: unknown[]) => {
    const callback = args[0] as (x: number, y: number) => void
    callback(80, 100)
  })
  layout()
  expect(tree.root.findByType(RoundFeedback).props.target).toEqual({ x: 30, y: 20 })
})
it.each([
  [360, 180],
  [760, 200],
  [100, 60],
  [0, 0],
])('fits cups and full lift inside a %i by %i board', (width, height) => {
  const frame = boardLayout(width, height)
  expect(frame.cupWidth).toBeLessThanOrEqual(117)
  expect(frame.cupHeight).toBeLessThanOrEqual(120)
  expect(frame.top - frame.lift).toBeGreaterThanOrEqual(0)
  expect(frame.top + frame.cupHeight).toBeLessThanOrEqual(height)
  expect(frame.cupWidth).toBeLessThanOrEqual(frame.slotWidth)
})

it.each([false, true])('keeps native animated properties mapped through rounds (reduced=%s)', reducedMotion => {
  mount(initial(), { reducedMotion })
  layout()
  const identities = tree.root.findAllByType(AnimatedCup)
  const progress = identities[0].props.progress as Animated.Value
  const readNode = (node: { __getValue: () => number; __getNativeTag: () => number }) => {
    expect(typeof node.__getValue).toBe('function')
    expect(typeof node.__getNativeTag).toBe('function')
    return node.__getValue()
  }
  const stages: { game: GameState; raised: number[]; visible: boolean }[] = [
    { game: initial(), raised: [0], visible: true },
    { game: initial({ phase: 'covering' }), raised: [], visible: true },
    { game: initial({ phase: 'shuffling' }), raised: [], visible: false },
    { game: initial({ phase: 'guessing' }), raised: [], visible: false },
    { game: initial({ phase: 'revealing', lastGuess: 0 }), raised: [0], visible: true },
    { game: initial({ phase: 'roundEnd', lastGuess: 0 }), raised: [0], visible: true },
    { game: initial({ phase: 'preview', roundId: 1, luizaCupId: 2 }), raised: [2], visible: true },
    { game: initial({ phase: 'revealing', roundId: 1, luizaCupId: 2, lastGuess: 1 }), raised: [1, 2], visible: true },
    { game: initial({ phase: 'roundEnd', roundId: 1, luizaCupId: 2, lastGuess: 1 }), raised: [1, 2], visible: true },
    { game: initial({ phase: 'preview', roundId: 2, luizaCupId: 0 }), raised: [0], visible: true },
  ]
  stages.forEach(({ game, raised, visible }) => {
    act(() => tree.update(<Board {...props(game, { reducedMotion })} />))
    act(() => progress.setValue(1))
    const cups = tree.root.findAllByType(AnimatedCup)
    expect(cups).toEqual(identities)
    cups.forEach(cup => {
      const layers = cup.findAllByType(Animated.Image)
      const cupStyle = layers[layers.length - 1].props.style
      expect(readNode(cupStyle.transform[0].translateY)).toBe(
        raised.includes(cup.props.cupId) ? -cup.props.layout.lift : 0,
      )
      expect(readNode(cupStyle.transform[1].translateX)).toBe(0)
      if (layers.length === 2) {
        const luizaStyle = layers[0].props.style[1]
        expect(readNode(luizaStyle.opacity)).toBe(visible ? 1 : 0)
        expect(readNode(luizaStyle.transform[0].translateY)).toBe(0)
      }
    })
  })
})

it('plays only measured enabled swaps and cancels audio on completion or pause', () => {
  const game = initial({ phase: 'shuffling' })
  mount(game)
  expect(shuffleStart).not.toHaveBeenCalled()
  layout()
  expect(shuffleStart).toHaveBeenCalledWith(650)
  act(() => complete[0]({ finished: true }))
  expect(stopShuffle).toHaveBeenCalledTimes(1)
  act(() => tree.update(<Board {...props({ ...game, swapIndex: 1 })} />))
  expect(shuffleStart).toHaveBeenCalledTimes(2)
  act(() => tree.update(<Board {...props({ ...game, swapIndex: 1 }, { enabled: false })} />))
  expect(stopShuffle).toHaveBeenCalled()
  const count = shuffleStart.mock.calls.length
  act(() => tree.update(<Board {...props(initial({ phase: 'preview' }))} />))
  expect(shuffleStart).toHaveBeenCalledTimes(count)
})
it('uses the reduced-motion duration for the shuffle sound', () => {
  mount(initial({ phase: 'shuffling' }), { reducedMotion: true })
  layout()
  expect(shuffleStart).toHaveBeenCalledWith(700)
})
