import React from 'react'
import { Text, View, AppState, AccessibilityInfo } from 'react-native'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import App from '../App'

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)
const mockStore: Record<string, string> = {}
let mockReadError = false
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      if (mockReadError) throw new Error('disk unavailable')
      return mockStore[key] ?? null
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore[key] = value
    }),
  },
}))
const mockPlayed: string[] = []
jest.mock('react-native-sound', () => {
  class FakeSound {
    static MAIN_BUNDLE = ''
    readonly file: string
    constructor(file: string, _base: string, onLoad: (error: null) => void) {
      this.file = file
      setTimeout(() => onLoad(null), 0)
    }
    isLoaded = () => true
    play = (onEnd?: (ok: boolean) => void) => {
      mockPlayed.push(this.file)
      onEnd?.(true)
      return this
    }
    pause = () => this
    stop = (onEnd?: () => void) => {
      onEnd?.()
      return this
    }
    setSpeed = () => this
    release = () => this
    setVolume = () => this
    setNumberOfLoops = () => this
  }
  return { __esModule: true, default: FakeSound }
})
jest.mock('lottie-react-native', () => {
  const R = require('react')
  return {
    __esModule: true,
    default: R.forwardRef((props: object, ref: unknown) => {
      R.useImperativeHandle(ref, () => ({ pause: jest.fn(), play: jest.fn() }))
      return R.createElement(require('react-native').View, props)
    }),
  }
})
jest.mock('@react-native-vector-icons/fontisto/static', () => ({
  __esModule: true,
  default: require('react-native').Text,
}))
jest.mock('@react-native-vector-icons/fontawesome5/static', () => ({
  __esModule: true,
  default: require('react-native').Text,
}))
jest.mock('../src/components/Board', () => ({
  Board: (props: object) => require('react').createElement(require('react-native').View, { ...props, testID: 'board' }),
}))
let tree: ReactTestRenderer
let onAppState: (state: import('react-native').AppStateStatus) => void
let onReduceMotion: (reduced: boolean) => void
const texts = () => tree.root.findAllByType(Text).map(t => React.Children.toArray(t.props.children).join(''))
const board = () => tree.root.findByProps({ testID: 'board' })
const press = async (label: string) => {
  const button = tree.root.findAll(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0]
  expect(button).toBeDefined()
  await act(async () => button!.props.onPress())
}
const finish = async () => {
  await act(async () => board().props.onAnimationEnd({ finished: true }))
}
const prepare = async () => {
  for (let i = 0; i < 10 && board().props.game.phase !== 'guessing'; i += 1) await finish()
  expect(board().props.game.phase).toBe('guessing')
}
async function mount() {
  await act(async () => {
    tree = create(<App />)
  })
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 1))
  })
}

beforeEach(() => {
  Object.keys(mockStore).forEach(key => delete mockStore[key])
  mockReadError = false
  mockPlayed.length = 0
  jest.spyOn(Math, 'random').mockReturnValue(0)
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onAppState = callback
    return { remove: jest.fn() }
  })
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, callback) => {
    onReduceMotion = callback as (value: boolean) => void
    return { remove: jest.fn() }
  })
})
afterEach(async () => {
  if (tree) await act(async () => tree.unmount())
  jest.restoreAllMocks()
})

it('loads legacy settings and game, preserving the record and cumulative progress', async () => {
  mockStore['luiza.settings'] = JSON.stringify({ musicOn: true, effectsOn: true, highScore: 7, playerName: 'Luiza' })
  mockStore['luiza.game'] = JSON.stringify({
    score: 2,
    lives: 4,
    streak: 1,
    luizaAt: 0,
    phase: 'closed',
    lastGuess: null,
    gameOver: false,
  })
  await mount()
  expect(texts()).toContain('Onde Está Luiza?')
  expect(texts()).toContain('Pontos: 2')
  expect(texts()).toContain('Vida extra: 1/5')
  expect(texts().some(t => t.includes('Recorde: 7'))).toBe(true)
  expect(board().props.game.phase).toBe('preview')
  expect(JSON.parse(mockStore['luiza.game']).version).toBe(2)
  expect(mockPlayed).toContain('forest.mp3')
})

it('plays a full hit, miss, extra-life sequence and requires the next-round button', async () => {
  await mount()
  await prepare()
  await act(async () => board().props.onChoose(0))
  expect(texts()).toContain('Me achou!')
  expect(texts()).toContain('Vida extra: 1/5')
  await finish()
  await press('Próxima rodada')
  await prepare()
  await act(async () => board().props.onChoose(1))
  expect(texts()).toContain('Vamos tentar de novo!')
  expect(texts()).toContain('Vida extra: 1/5')
  await finish()
  for (let hits = 2; hits <= 5; hits += 1) {
    await press('Próxima rodada')
    await prepare()
    await act(async () => board().props.onChoose(0))
    expect(texts()).toContain(`Vida extra: ${hits}/5`)
    if (hits < 5) {
      expect(board().props.game.lives).toBe(2)
      await finish()
    }
  }
  expect(texts()).toContain('Vida extra: 5/5')
  expect(board().props.game.lives).toBe(3)
  await finish()
  expect(texts()).toContain('Vida extra: 0/5')
  expect(texts()).toContain('Pontos: 5')
})

it('shows game over after revealing, saves the name and resets the game', async () => {
  await mount()
  for (let loss = 0; loss < 3; loss += 1) {
    await prepare()
    await act(async () => board().props.onChoose(1))
    expect(texts()).not.toContain('Fim de Jogo')
    await finish()
    if (loss < 2) await press('Próxima rodada')
  }
  expect(texts()).toContain('Fim de Jogo')
  const input = tree.root.findByProps({ placeholder: 'Digite seu nome' })
  await act(async () => input.props.onChangeText('Lulu'))
  await press('Salvar pontuação')
  expect(board().props.game.phase).toBe('preview')
  expect(JSON.parse(mockStore['luiza.leaderboard'])[0].name).toBe('Lulu')
})

it('suspends for overlays/background and resumes a new preview without points', async () => {
  await mount()
  await prepare()
  await press('Sair do jogo')
  expect(texts()).toContain('Sair do jogo?')
  expect(board().props.enabled).toBe(false)
  await press('Continuar jogando')
  expect(board().props.game.phase).toBe('preview')
  await press('Abrir Hall da Fama')
  expect(texts()).toContain('Hall da Fama')
  await press('Voltar ao jogo')
  await act(async () => onAppState('background'))
  expect(board().props.enabled).toBe(false)
  await act(async () => onAppState('active'))
  expect(board().props.game.score).toBe(0)
  await act(async () => onReduceMotion(true))
  expect(board().props.reducedMotion).toBe(true)
})

it('toggles audio preferences and retries a failed initial read without writing defaults', async () => {
  mockReadError = true
  await mount()
  expect(tree.root.findAllByProps({ testID: 'board' })).toHaveLength(0)
  expect(mockStore['luiza.settings']).toBeUndefined()
  mockReadError = false
  await press('Tentar carregar novamente')
  await press('Desligar música')
  await press('Desligar efeitos sonoros')
  expect(JSON.parse(mockStore['luiza.settings'])).toMatchObject({ musicOn: false, effectsOn: false })
  expect(tree.root.findAllByType(View).length).toBeGreaterThan(0)
})

it('connects swap sounds to the effects toggle without changing the game', async () => {
  await mount()
  await finish()
  await finish()
  const before = board().props.game
  let stopSound: () => void = () => {}
  await act(async () => {
    stopSound = board().props.onShuffleStart(650)
  })
  expect(mockPlayed.filter(file => file === 'shuffle.wav')).toHaveLength(1)
  await act(async () => stopSound())
  await press('Desligar efeitos sonoros')
  await act(async () => board().props.onShuffleStart(650))
  expect(mockPlayed.filter(file => file === 'shuffle.wav')).toHaveLength(1)
  expect(board().props.game).toEqual(before)
})
