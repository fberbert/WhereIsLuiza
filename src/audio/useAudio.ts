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
}

export function useAudio({ musicOn, effectsOn }: Options) {
  const music = useRef<Sound | null>(null)
  const effects = useRef<Record<Effect, Sound> | null>(null)
  const musicOnRef = useRef(musicOn)
  musicOnRef.current = musicOn

  useEffect(() => {
    const m = load(MUSIC_FILE, s => {
      s.setVolume(MUSIC_VOLUME)
      s.setNumberOfLoops(-1)
      if (musicOnRef.current) s.play()
    })
    music.current = m
    const loaded = {} as Record<Effect, Sound>
    for (const effect of Object.keys(EFFECT_FILE) as Effect[]) loaded[effect] = load(EFFECT_FILE[effect])
    effects.current = loaded
    return () => {
      m.stop()
      m.release()
      Object.values(loaded).forEach(s => s.release())
      music.current = null
      effects.current = null
    }
  }, [])

  useEffect(() => {
    const m = music.current
    if (!m?.isLoaded()) return
    if (musicOn) m.play()
    else m.pause()
  }, [musicOn])

  return useMemo(() => {
    const play = (effect: Effect, onEnd?: () => void) => {
      if (!effectsOn) return
      effects.current?.[effect].play(onEnd)
    }
    const playEvents = (events: GameEvent[]) => {
      const [first, ...rest] = events.map(e => EVENT_EFFECT[e])
      if (!first) return
      // 'extraLife' toca depois de 'hit' terminar (comportamento original)
      play(first, () => rest.forEach(e => play(e)))
    }
    return { play, playEvents }
  }, [effectsOn])
}
