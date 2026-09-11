import { loadJson, saveJson } from './persist'

const KEY = 'luiza.settings'

export interface Settings {
  musicOn: boolean
  effectsOn: boolean
  highScore: number
  playerName: string
}

export const DEFAULT_SETTINGS: Settings = {
  musicOn: true,
  effectsOn: true,
  highScore: 0,
  playerName: '',
}

export async function loadSettings(): Promise<Settings> {
  const saved = await loadJson<Partial<Settings>>(KEY)
  return { ...DEFAULT_SETTINGS, ...saved }
}

export function saveSettings(settings: Settings): Promise<void> {
  return saveJson(KEY, settings)
}
