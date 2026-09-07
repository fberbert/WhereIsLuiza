import React from 'react'
import { Animated, BackHandler, Text, TextInput, View } from 'react-native'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Spider } from '../src/components/Spider'
import { Detective } from '../src/components/Detective'
import { AnimatedTitle, useSway } from '../src/components/AnimatedTitle'
import { TopBar } from '../src/components/TopBar'
import { CloseAppOverlay } from '../src/overlays/CloseAppOverlay'
import { HallOfFameOverlay } from '../src/overlays/HallOfFameOverlay'
import { GameOverOverlay } from '../src/overlays/GameOverOverlay'

const mockPlay = jest.fn()
const mockPause = jest.fn()
jest.mock('lottie-react-native', () => {
  const R = require('react')
  return {
    __esModule: true,
    default: R.forwardRef((props: object, ref: unknown) => {
      R.useImperativeHandle(ref, () => ({ pause: mockPause, play: mockPlay }))
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

let trees: ReactTestRenderer[] = []
const render = (element: React.ReactElement) => {
  let tree!: ReactTestRenderer
  act(() => {
    tree = create(element)
  })
  trees = [...trees, tree]
  return tree
}
const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(node => React.Children.toArray(node.props.children).join(''))
const button = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]
const press = (tree: ReactTestRenderer, label: string) => {
  const target = button(tree, label)
  expect(target).toBeDefined()
  expect(target.props.disabled).not.toBe(true)
  act(() => target.props.onPress())
}

afterEach(() => {
  act(() => trees.forEach(tree => tree.unmount()))
  trees = []
  jest.restoreAllMocks()
  mockPlay.mockClear()
  mockPause.mockClear()
})

it('plays the spider, pauses while hidden and resumes while retaining its sound button', () => {
  const onPress = jest.fn()
  const tree = render(<Spider onPress={onPress} />)
  expect(mockPlay).toHaveBeenCalledTimes(1)
  expect(mockPause).not.toHaveBeenCalled()
  press(tree, 'Ouvir aranha')
  expect(onPress).toHaveBeenCalledTimes(1)
  act(() => tree.update(<Spider onPress={onPress} paused size={50} />))
  expect(mockPause).toHaveBeenCalledTimes(1)
  expect(tree.root.findAllByType(View).some(node => node.props.autoPlay === false)).toBe(true)
  act(() => tree.update(<Spider onPress={onPress} paused={false} />))
  expect(mockPlay).toHaveBeenCalledTimes(2)
})

it('starts the spider paused when motion is disabled at mount', () => {
  render(<Spider onPress={jest.fn()} paused />)
  expect(mockPause).toHaveBeenCalledTimes(1)
  expect(mockPlay).not.toHaveBeenCalled()
})

it.each([false, true])('keeps detective sound available with reduced motion %s', reducedMotion => {
  const onPress = jest.fn()
  const start = jest.fn()
  const spring = jest.spyOn(Animated, 'spring').mockReturnValue({ start, stop: jest.fn(), reset: jest.fn() })
  const tree = render(
    reducedMotion ? <Detective onPress={onPress} size={50} reducedMotion /> : <Detective onPress={onPress} />,
  )
  press(tree, 'Ouvir detetive')
  expect(onPress).toHaveBeenCalledTimes(1)
  expect(spring).toHaveBeenCalledTimes(reducedMotion ? 0 : 1)
  expect(start).toHaveBeenCalledTimes(reducedMotion ? 0 : 1)
})

it('stops the title sway when paused and cleans up resumed motion on unmount', () => {
  const start = jest.fn()
  const stop = jest.fn()
  jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() })
  const tree = render(<AnimatedTitle>Onde Está Luiza?</AnimatedTitle>)
  expect(texts(tree)).toContain('Onde Está Luiza?')
  expect(start).toHaveBeenCalledTimes(1)
  act(() =>
    tree.update(
      <AnimatedTitle paused fontSize={24}>
        Onde Está Luiza?
      </AnimatedTitle>,
    ),
  )
  expect(stop).toHaveBeenCalledTimes(1)
  expect(start).toHaveBeenCalledTimes(1)
  act(() => tree.update(<AnimatedTitle paused={false}>Onde Está Luiza?</AnimatedTitle>))
  expect(start).toHaveBeenCalledTimes(2)
  act(() => tree.unmount())
  expect(stop).toHaveBeenCalledTimes(2)
})

it('uses an enabled sway by default for callers of the shared hook', () => {
  const start = jest.fn()
  jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop: jest.fn(), reset: jest.fn() })
  function SwayExample() {
    useSway()
    return null
  }
  render(<SwayExample />)
  expect(start).toHaveBeenCalledTimes(1)
})

it.each([false, true])('labels audio controls with the next action when enabled is %s', enabled => {
  const effects = jest.fn()
  const music = jest.fn()
  const close = jest.fn()
  const tree = render(
    <TopBar effectsOn={enabled} musicOn={enabled} onToggleEffects={effects} onToggleMusic={music} onClose={close} />,
  )
  const action = enabled ? 'Desligar' : 'Ligar'
  press(tree, `${action} efeitos sonoros`)
  press(tree, `${action} música`)
  press(tree, 'Sair do jogo')
  expect(effects).toHaveBeenCalledTimes(1)
  expect(music).toHaveBeenCalledTimes(1)
  expect(close).toHaveBeenCalledTimes(1)
  expect(button(tree, 'Sair do jogo').props.accessibilityRole).toBe('button')
})

it('offers explicit exit confirmation and cancels with either the button or Android back', () => {
  const cancel = jest.fn()
  let back!: Parameters<typeof BackHandler.addEventListener>[1]
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_name, handler) => {
    back = handler
    return { remove: jest.fn() }
  })
  const exit = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => {})
  const tree = render(<CloseAppOverlay visible onCancel={cancel} />)
  expect(texts(tree)).toContain('Sair do jogo?')
  press(tree, 'Continuar jogando')
  expect(cancel).toHaveBeenCalledTimes(1)
  act(() => {
    expect(back({ type: 'hardwareBackPress', timeStamp: 1 })).toBe(true)
  })
  expect(cancel).toHaveBeenCalledTimes(2)
  expect(exit).not.toHaveBeenCalled()
  press(tree, 'Confirmar saída')
  expect(exit).toHaveBeenCalledTimes(1)
})

it('shows leaderboard ranks, names and scores and returns through button or back', () => {
  const close = jest.fn()
  let back!: Parameters<typeof BackHandler.addEventListener>[1]
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_name, handler) => {
    back = handler
    return { remove: jest.fn() }
  })
  const entries = [
    { name: 'Lulu', score: 7, at: 10 },
    { name: 'Bia', score: 3, at: 11 },
  ]
  const tree = render(<HallOfFameOverlay visible entries={entries} onClose={close} />)
  expect(texts(tree)).toEqual(expect.arrayContaining(['Hall da Fama', '1', 'Lulu', '7', '2', 'Bia', '3']))
  press(tree, 'Voltar ao jogo')
  act(() => {
    expect(back({ type: 'hardwareBackPress', timeStamp: 1 })).toBe(true)
  })
  expect(close).toHaveBeenCalledTimes(2)
})

const gameOverProps = () => ({
  visible: true,
  score: 12,
  playerName: 'Luiza',
  onChangeName: jest.fn(),
  onSave: jest.fn(),
})

it('allows editing a name and saving the full score', () => {
  const props = gameOverProps()
  const tree = render(<GameOverOverlay {...props} />)
  expect(texts(tree)).toContain(' = 12')
  const input = tree.root.findByType(TextInput)
  expect(input.props).toMatchObject({ value: 'Luiza', editable: true, maxLength: 40 })
  act(() => input.props.onChangeText('Lulu'))
  expect(props.onChangeName).toHaveBeenCalledWith('Lulu')
  press(tree, 'Salvar pontuação')
  expect(props.onSave).toHaveBeenCalledTimes(1)
  expect(texts(tree)).not.toContain('Salvando...')
})

it('locks input and save while writing and restores them when writing completes', () => {
  const props = gameOverProps()
  const tree = render(<GameOverOverlay {...props} saving />)
  expect(tree.root.findByType(TextInput).props.editable).toBe(false)
  expect(button(tree, 'Salvar pontuação').props.disabled).toBe(true)
  expect(texts(tree)).toContain('Salvando...')
  act(() => tree.update(<GameOverOverlay {...props} saving={false} />))
  expect(tree.root.findByType(TextInput).props.editable).toBe(true)
  press(tree, 'Salvar pontuação')
  expect(props.onSave).toHaveBeenCalledTimes(1)
})

it('announces a save error and allows retrying the score save', () => {
  const props = gameOverProps()
  const tree = render(<GameOverOverlay {...props} error="Não foi possível salvar" />)
  expect(tree.root.findAllByType(Text).find(node => node.props.accessibilityRole === 'alert')?.props.children).toBe(
    'Não foi possível salvar',
  )
  press(tree, 'Salvar pontuação')
  expect(props.onSave).toHaveBeenCalledTimes(1)
  expect(button(tree, 'Tentar salvar progresso')).toBeUndefined()
})

it('retries pending progress separately and prevents a duplicate score submission', () => {
  const props = gameOverProps()
  const retry = jest.fn()
  const tree = render(<GameOverOverlay {...props} error="Progresso pendente" onRetryProgress={retry} />)
  expect(button(tree, 'Salvar pontuação').props.disabled).toBe(true)
  press(tree, 'Tentar salvar progresso')
  expect(retry).toHaveBeenCalledTimes(1)
  expect(props.onSave).not.toHaveBeenCalled()
  act(() => tree.update(<GameOverOverlay {...props} error={null} />))
  expect(tree.root.findAllByType(Text).some(node => node.props.accessibilityRole === 'alert')).toBe(false)
  expect(button(tree, 'Tentar salvar progresso')).toBeUndefined()
})
