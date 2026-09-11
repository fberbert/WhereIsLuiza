import { useEffect, useMemo, useRef } from 'react'
import Sound from 'react-native-sound'
import type { GameEvent } from '../game/logic'

export type Effect = 'hit' | 'miss' | 'extraLife' | 'gameOver' | 'boing' | 'spider'

// Arquivos em android/app/src/main/res/raw/
const EFFECT_FILE: Record<Effect, string> = {
  hit: 'got_it.mp3',
  miss: 'errou.mp3',
  extraLife: 'vida.mp3',
  gameOver: 'game_over.mp3',
  boing: 'boing.wav',
  spider: 'spider.mp3',
}
const MUSIC_FILE = 'forest.mp3'
const MUSIC_VOLUME = 0.2

const EVENT_EFFECT: Record<GameEvent, Effect> = {
  hit: 'hit',
  miss: 'miss',
  extraLife: 'extraLife',
  gameOver: 'gameOver',
}

// setVolume/setNumberOfLoops/play só chegam ao nativo depois do load; por isso o onReady.
function load(file: string, onReady?: (sound: Sound) => void): Sound {
  const sound = new Sound(file, Sound.MAIN_BUNDLE, error => {
    if (!error) onReady?.(sound)
  })
  return sound
}

interface Options {
  musicOn: boolean
  effectsOn: boolean
  active?: boolean
}

export function useAudio({ musicOn, effectsOn, active = true }: Options) {
  const music = useRef<Sound | null>(null)
  const effects = useRef<Record<Effect, Sound> | null>(null)
  const options = useRef({ musicOn, effectsOn, active })
  const generation = useRef(0)
  const shuffle = useRef<Sound | null>(null)
  const shuffleGeneration = useRef(0)
  options.current = { musicOn, effectsOn, active }

  useEffect(() => {
    let disposed = false
    const m = load(MUSIC_FILE, s => {
      if (disposed) {
        s.release()
        return
      }
      s.setVolume(MUSIC_VOLUME)
      s.setNumberOfLoops(-1)
      if (options.current.musicOn && options.current.active) s.play()
    })
    music.current = m
    const loaded = Object.fromEntries(
      (Object.keys(EFFECT_FILE) as Effect[]).map(effect => [
        effect,
        load(EFFECT_FILE[effect], s => {
          if (disposed) s.release()
        }),
      ]),
    ) as Record<Effect, Sound>
    const shuffleSound = load('shuffle.wav', s => {
      if (disposed) s.release()
    })
    shuffle.current = shuffleSound
    effects.current = loaded
    return () => {
      disposed = true
      generation.current += 1
      shuffleGeneration.current += 1
      shuffleSound.stop()
      shuffleSound.release()
      shuffle.current = null
      m.stop()
      m.release()
      Object.values(loaded).forEach(s => {
        s.stop()
        s.release()
      })
      music.current = null
      effects.current = null
    }
  }, [])

  useEffect(() => {
    const m = music.current
    if (!m?.isLoaded()) return
    if (musicOn && active) m.play()
    else m.pause()
  }, [musicOn, active])

  useEffect(() => {
    if (effectsOn && active) return
    generation.current += 1
    shuffleGeneration.current += 1
    if (shuffle.current?.isLoaded()) shuffle.current.stop()
    Object.values(effects.current ?? {}).forEach(s => {
      if (s.isLoaded()) s.stop()
    })
  }, [effectsOn, active])

  return useMemo(() => {
    const play = (effect: Effect, onEnd?: () => void) => {
      if (!options.current.effectsOn || !options.current.active) return
      const sound = effects.current?.[effect]
      if (!sound?.isLoaded()) return
      const started = generation.current
      sound.play(() => {
        if (started === generation.current && options.current.effectsOn && options.current.active) onEnd?.()
      })
    }
    const playEvents = (events: GameEvent[]) => {
      const sequence = events.map(event => EVENT_EFFECT[event])
      const next = (index: number) => {
        const effect = sequence[index]
        if (effect) play(effect, () => next(index + 1))
      }
      next(0)
    }
    const playShuffle = (durationMs: number): (() => void) => {
      const sound = shuffle.current
      if (!options.current.effectsOn || !options.current.active || !sound?.isLoaded()) return () => {}
      const started = ++shuffleGeneration.current
      sound.stop(() => {
        if (started !== shuffleGeneration.current || !options.current.effectsOn || !options.current.active) return
        sound.setVolume(0.55)
        sound.setSpeed(360 / durationMs)
        sound.play()
      })
      return () => {
        if (started !== shuffleGeneration.current) return
        shuffleGeneration.current += 1
        sound.stop()
      }
    }
    return { play, playEvents, playShuffle }
  }, [])
}
