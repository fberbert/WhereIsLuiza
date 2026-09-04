import { loadJson, saveJson } from './persist'

const KEY = 'luiza.leaderboard'
export const MAX_ENTRIES = 10

export interface LeaderboardEntry {
  name: string
  score: number
  at: number
}

export function insertEntry(list: readonly LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
  return [...list, entry].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, MAX_ENTRIES)
}

export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  return (await loadJson<LeaderboardEntry[]>(KEY)) ?? []
}

export async function recordScore(name: string, score: number, now = Date.now): Promise<LeaderboardEntry[]> {
  const next = insertEntry(await loadLeaderboard(), { name: name.trim() || 'Sem nome', score, at: now() })
  await saveJson(KEY, next)
  return next
}
