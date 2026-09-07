import React from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useAudio } from '../src/audio/useAudio'

class MockSound {
  static MAIN_BUNDLE = ''
  static instances: MockSound[] = []
  loaded = false
  completions: Array<() => void> = []
  constructor(readonly file: string, _base: string, readonly onLoad: (error: Error | null) => void) {
    MockSound.instances.push(this)
  }
  finishLoad(error: Error | null = null) {
    this.loaded = !error
    this.onLoad(error)
  }
  isLoaded = () => this.loaded
  play = jest.fn((completion?: () => void) => {
    if (completion) this.completions.push(completion)
    return this
  })
  pause = jest.fn(() => this)
  stop = jest.fn(() => this)
  release = jest.fn(() => {
    this.loaded = false
    return this
  })
  setVolume = jest.fn(() => this)
  setNumberOfLoops = jest.fn(() => this)
}

jest.mock('react-native-sound', () => ({
  __esModule: true,
  default: jest.fn((...args: ConstructorParameters<typeof MockSound>) => new MockSound(...args)),
}))

type Options = { musicOn: boolean; effectsOn: boolean; active?: boolean }
let audio: ReturnType<typeof useAudio>
let tree: ReactTestRenderer
function Harness(props: Options) {
  audio = useAudio(props)
  return null
}
const initial: Options = { musicOn: true, effectsOn: true }
const sound = (file: string) => MockSound.instances.find(s => s.file === file)!
async function mount(options = initial) {
  await act(async () => {
    tree = create(<Harness {...options} />)
  })
}
async function update(options: Options) {
  await act(async () => {
    tree.update(<Harness {...options} />)
  })
}
function loadAll() {
  MockSound.instances.forEach(s => s.finishLoad())
}
beforeEach(() => {
  MockSound.instances = []
})
afterEach(async () => {
  await act(async () => tree?.unmount())
})

it('waits for each file to load and does not replay music on unrelated renders', async () => {
  await mount()
  audio.play('hit')
  expect(sound('got_it.mp3').play).not.toHaveBeenCalled()
  expect(sound('forest.mp3').play).not.toHaveBeenCalled()
  loadAll()
  expect(sound('forest.mp3').play).toHaveBeenCalledTimes(1)
  expect(sound('forest.mp3').setVolume).toHaveBeenCalledWith(0.2)
  expect(sound('forest.mp3').setNumberOfLoops).toHaveBeenCalledWith(-1)
  audio.play('hit')
  expect(sound('got_it.mp3').play).toHaveBeenCalledTimes(1)
  await update({ ...initial })
  expect(sound('forest.mp3').play).toHaveBeenCalledTimes(1)
})

it('ignores failed loads while allowing other audio to play', async () => {
  await mount()
  sound('forest.mp3').finishLoad(new Error('missing'))
  sound('got_it.mp3').finishLoad(new Error('missing'))
  sound('errou.mp3').finishLoad()
  audio.play('hit')
  audio.play('miss')
  expect(sound('forest.mp3').play).not.toHaveBeenCalled()
  expect(sound('got_it.mp3').play).not.toHaveBeenCalled()
  expect(sound('errou.mp3').play).toHaveBeenCalledTimes(1)
})

it('uses current mute preferences when a delayed load completes', async () => {
  await mount()
  await update({ musicOn: false, effectsOn: false })
  loadAll()
  audio.play('spider')
  expect(sound('forest.mp3').play).not.toHaveBeenCalled()
  expect(sound('spider.mp3').play).not.toHaveBeenCalled()
  await update(initial)
  expect(sound('forest.mp3').play).toHaveBeenCalledTimes(1)
  audio.play('boing')
  expect(sound('boing.wav').play).toHaveBeenCalledTimes(1)
  await update({ musicOn: false, effectsOn: true })
  expect(sound('forest.mp3').pause).toHaveBeenCalled()
})

it('suspends audio when inactive and resumes only music', async () => {
  await mount()
  loadAll()
  audio.play('hit')
  await update({ ...initial, active: false })
  expect(sound('forest.mp3').pause).toHaveBeenCalledTimes(1)
  expect(sound('got_it.mp3').stop).toHaveBeenCalledTimes(1)
  audio.play('miss')
  expect(sound('errou.mp3').play).not.toHaveBeenCalled()
  await update({ ...initial, active: true })
  expect(sound('forest.mp3').play).toHaveBeenCalledTimes(2)
  expect(sound('got_it.mp3').play).toHaveBeenCalledTimes(1)
})

it('keeps late-loading music silent while inactive', async () => {
  await mount({ ...initial, active: false })
  loadAll()
  expect(sound('forest.mp3').play).not.toHaveBeenCalled()
  await update(initial)
  expect(sound('forest.mp3').play).toHaveBeenCalledTimes(1)
})

it.each(['mute', 'inactive'] as const)('invalidates queued extra life across %s then re-enable', async change => {
  await mount()
  loadAll()
  audio.playEvents(['hit', 'extraLife'])
  const completion = sound('got_it.mp3').completions[0]
  expect(sound('vida.mp3').play).not.toHaveBeenCalled()
  await update({ ...initial, ...(change === 'mute' ? { effectsOn: false } : { active: false }) })
  completion()
  expect(sound('vida.mp3').play).not.toHaveBeenCalled()
  await update(initial)
  completion()
  expect(sound('vida.mp3').play).not.toHaveBeenCalled()
  audio.playEvents(['hit', 'extraLife'])
  sound('got_it.mp3').completions[1]()
  expect(sound('vida.mp3').play).toHaveBeenCalledTimes(1)
})

it('handles empty events and plays event groups sequentially', async () => {
  await mount()
  loadAll()
  audio.playEvents([])
  expect(sound('got_it.mp3').play).not.toHaveBeenCalled()
  audio.playEvents(['miss', 'gameOver', 'extraLife'])
  expect(sound('errou.mp3').play).toHaveBeenCalledTimes(1)
  expect(sound('game_over.mp3').play).not.toHaveBeenCalled()
  sound('errou.mp3').completions[0]()
  expect(sound('game_over.mp3').play).toHaveBeenCalledTimes(1)
  expect(sound('vida.mp3').play).not.toHaveBeenCalled()
  sound('game_over.mp3').completions[0]()
  expect(sound('vida.mp3').play).toHaveBeenCalledTimes(1)
  sound('vida.mp3').completions[0]()
})

it('releases loaded resources and ignores completion after unmount', async () => {
  await mount()
  loadAll()
  audio.playEvents(['hit', 'extraLife'])
  const completion = sound('got_it.mp3').completions[0]
  await act(async () => {
    tree.unmount()
  })
  MockSound.instances.forEach(s => expect(s.release).toHaveBeenCalledTimes(1))
  completion()
  audio.play('miss')
  expect(sound('vida.mp3').play).not.toHaveBeenCalled()
  expect(sound('errou.mp3').play).not.toHaveBeenCalled()
})

it('releases sounds that finish loading after unmount without playing', async () => {
  await mount()
  await act(async () => {
    tree.unmount()
  })
  loadAll()
  MockSound.instances.forEach(s => {
    expect(s.loaded).toBe(false)
    expect(s.release).toHaveBeenCalled()
    expect(s.play).not.toHaveBeenCalled()
  })
})
