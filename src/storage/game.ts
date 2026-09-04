import type { GameState } from '../game/logic'
import { loadJson, saveJson } from './persist'

const KEY = 'luiza.game'

export function loadGame(): Promise<GameState | null> {
  return loadJson<GameState>(KEY)
}

export function saveGame(state: GameState): Promise<void> {
  return saveJson(KEY, state)
}
