import { MAX_ENTRIES, insertEntry, type LeaderboardEntry } from './leaderboard'

const e = (name: string, score: number, at: number): LeaderboardEntry => ({ name, score, at })

describe('insertEntry', () => {
  it('orders by score desc, then older first', () => {
    const list = insertEntry([e('a', 5, 1), e('b', 7, 2)], e('c', 5, 3))
    expect(list.map(x => x.name)).toEqual(['b', 'a', 'c'])
  })

  it('keeps at most MAX_ENTRIES', () => {
    const full = Array.from({ length: MAX_ENTRIES }, (_, i) => e(`p${i}`, 100 - i, i))
    const list = insertEntry(full, e('low', 1, 99))
    expect(list).toHaveLength(MAX_ENTRIES)
    expect(list.find(x => x.name === 'low')).toBeUndefined()
  })

  it('does not mutate the input', () => {
    const input = [e('a', 1, 1)]
    insertEntry(input, e('b', 2, 2))
    expect(input).toHaveLength(1)
  })
})
