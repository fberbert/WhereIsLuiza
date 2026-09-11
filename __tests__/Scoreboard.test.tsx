import React from 'react'
import { Animated, Text, View } from 'react-native'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { TrophiesRow } from '../src/components/TrophiesRow'
import { ExtraLifeProgress } from '../src/components/ExtraLifeProgress'
import { LivesRow } from '../src/components/LivesRow'
import { lottie } from '../src/assets'

jest.mock('lottie-react-native', () => ({ __esModule: true, default: require('react-native').View }))

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
const icons = (tree: ReactTestRenderer, source: unknown) =>
  tree.root.findAllByType(View).filter(node => node.props.source === source)

afterEach(() => {
  act(() => trees.forEach(tree => tree.unmount()))
  trees = []
  jest.restoreAllMocks()
})

it.each([0, 1, 1000])('uses one static trophy and the full score for %i points', count => {
  const tree = render(<TrophiesRow count={count} />)
  expect(icons(tree, lottie.trophy)).toHaveLength(1)
  expect(icons(tree, lottie.trophy)[0].props).toMatchObject({ autoPlay: false, loop: false })
  expect(texts(tree)).toContain(`Pontos: ${count}`)
  expect(tree.root.findAllByType(View).some(node => node.props.accessibilityLabel === `Pontos: ${count}`)).toBe(true)
})

it('exposes the score target layout callback', () => {
  const onLayout = jest.fn()
  const tree = render(<TrophiesRow count={3} onLayout={onLayout} />)
  const target = tree.root.findAllByType(View).find(node => node.props.testID === 'score-target')!
  const event = { nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 30 } } }
  act(() => target.props.onLayout(event))
  expect(onLayout).toHaveBeenCalledWith(event)
})

it.each([0, 3, 5, 8])('bounds hearts while retaining %i lives', count => {
  const tree = render(<LivesRow count={count} />)
  expect(icons(tree, lottie.heart)).toHaveLength(Math.min(count, 5))
  icons(tree, lottie.heart).forEach(icon => expect(icon.props).toMatchObject({ autoPlay: false, loop: false }))
  expect(tree.root.findAllByType(View).some(node => node.props.accessibilityLabel === `${count} vidas`)).toBe(true)
  if (count > 5) expect(texts(tree)).toContain(`+${count - 5}`)
  if (count === 0) expect(texts(tree)).toContain('Sem vidas')
})

it('pulses only when the score changes and stops pending motion on unmount', () => {
  const start = jest.fn()
  const stop = jest.fn()
  const sequence = jest.spyOn(Animated, 'sequence').mockReturnValue({ start, stop, reset: jest.fn() })
  const tree = render(<TrophiesRow count={0} />)
  expect(start).not.toHaveBeenCalled()
  act(() => tree.update(<TrophiesRow count={1} />))
  expect(start).toHaveBeenCalledTimes(1)
  act(() => tree.update(<TrophiesRow count={1} />))
  expect(start).toHaveBeenCalledTimes(1)
  act(() => tree.unmount())
  expect(stop).toHaveBeenCalledTimes(1)
  expect(sequence).toHaveBeenCalledTimes(1)
})

it('disables score and lives motion when reduced motion is requested', () => {
  const sequence = jest.spyOn(Animated, 'sequence')
  const score = render(<TrophiesRow count={0} reducedMotion />)
  act(() => score.update(<TrophiesRow count={1} reducedMotion />))
  render(<LivesRow count={4} gained reducedMotion />)
  render(<LivesRow count={2} lost reducedMotion />)
  expect(sequence).not.toHaveBeenCalled()
})

it.each(['gained', 'lost'] as const)('briefly pulses lives when %s and cleans up', event => {
  const start = jest.fn()
  const stop = jest.fn()
  jest.spyOn(Animated, 'sequence').mockReturnValue({ start, stop, reset: jest.fn() })
  const tree = render(<LivesRow count={3} />)
  expect(start).not.toHaveBeenCalled()
  act(() => tree.update(<LivesRow count={event === 'gained' ? 4 : 2} {...{ [event]: true }} />))
  expect(start).toHaveBeenCalledTimes(1)
  act(() => tree.update(<LivesRow count={3} />))
  expect(stop).toHaveBeenCalledTimes(1)
})

it.each([0, 1, 4] as const)('shows %i of five hits toward the extra life', count => {
  const tree = render(<ExtraLifeProgress count={count} />)
  expect(texts(tree)).toContain(`Vida extra: ${count}/5`)
  const indicators = tree.root.findAllByType(View).filter(node => node.props.testID === 'extra-life-indicator')
  expect(indicators).toHaveLength(5)
  expect(indicators.filter(node => node.props.accessibilityLabel === 'Acerto conquistado')).toHaveLength(count)
  expect(indicators.filter(node => node.props.accessibilityLabel === 'Acerto pendente')).toHaveLength(5 - count)
})

it('shows five filled indicators on earning a life until the parent resets feedback', () => {
  const tree = render(<ExtraLifeProgress count={0} earned reducedMotion />)
  expect(texts(tree)).toContain('Vida extra: 5/5')
  expect(
    tree.root.findAllByType(View).filter(node => node.props.accessibilityLabel === 'Acerto conquistado'),
  ).toHaveLength(5)
  act(() => tree.update(<ExtraLifeProgress count={0} earned={false} />))
  expect(texts(tree)).toContain('Vida extra: 0/5')
  expect(
    tree.root.findAllByType(View).filter(node => node.props.accessibilityLabel === 'Acerto pendente'),
  ).toHaveLength(5)
})

it('keeps extra-life progress when a life is lost', () => {
  const tree = render(
    <View>
      <LivesRow count={3} />
      <ExtraLifeProgress count={1} />
    </View>,
  )
  act(() =>
    tree.update(
      <View>
        <LivesRow count={2} lost reducedMotion />
        <ExtraLifeProgress count={1} />
      </View>,
    ),
  )
  expect(texts(tree)).toContain('Vida extra: 1/5')
})
