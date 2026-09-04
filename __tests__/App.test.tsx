import React from 'react'
import { Image, Text } from 'react-native'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import App from '../App'
import { images } from '../src/assets'

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)

const mockStore: Record<string, string> = {}
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore[key] = value
    }),
  },
}))

const played: string[] = []
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
      played.push(this.file)
      onEnd?.(true)
      return this
    }
    pause = () => this
    stop = () => this
    release = () => this
    setVolume = () => this
    setNumberOfLoops = () => this
  }
  return { __esModule: true, default: FakeSound }
})

jest.mock('lottie-react-native', () => ({ __esModule: true, default: require('react-native').View }))
jest.mock('@react-native-vector-icons/fontisto/static', () => ({
  __esModule: true,
  default: require('react-native').Text,
}))
jest.mock('@react-native-vector-icons/fontawesome5/static', () => ({
  __esModule: true,
  default: require('react-native').Text,
}))

async function settle() {
  await act(async () => {
    const { promise, resolve } = Promise.withResolvers<void>()
    setTimeout(resolve, 0)
    await promise
  })
}

async function renderApp(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer
  await act(async () => {
    tree = create(<App />)
  })
  await settle()
  return tree
}

const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => React.Children.toArray(t.props.children).join(''))

const cupImages = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Image)
    .map(i => i.props.source)
    .filter(s => s === images.cup || s === images.cupWrong || s === images.luizaHead)

it('renders the game with persisted settings intact and plays music', async () => {
  mockStore['luiza.settings'] = JSON.stringify({ musicOn: true, effectsOn: true, highScore: 7, playerName: 'Luiza' })
  const tree = await renderApp()
  const all = texts(tree)
  expect(all).toContain('Onde Está Luiza?')
  expect(all.some(t => t.startsWith('Hall da Fama | Recorde: 7'))).toBe(true)
  expect(cupImages(tree)).toEqual([images.cup, images.cup, images.cup])
  expect(played).toContain('forest.mp3')
  expect(JSON.parse(mockStore['luiza.settings'])).toMatchObject({ highScore: 7, playerName: 'Luiza' })
})

it('tapping a cup reveals Luiza and plays a hit or miss sound', async () => {
  const tree = await renderApp()
  played.length = 0
  const [cupPressable] = tree.root.findAll(
    n => typeof n.props.onPress === 'function' && n.findAllByType(Image).some(i => i.props.source === images.cup),
  )
  await act(async () => cupPressable.props.onPress())
  await settle()
  const faces = cupImages(tree)
  expect(faces.filter(f => f === images.luizaHead)).toHaveLength(1)
  expect(played.length).toBeGreaterThanOrEqual(1)
  expect(['got_it.mp3', 'errou.mp3']).toContain(played[0])
})
