export type CupId = 0 | 1 | 2
export type SlotIndex = 0 | 1 | 2
export type CupOrder = readonly [CupId, CupId, CupId]
export type Swap = readonly [SlotIndex, SlotIndex]
export type Rng = () => number

export interface Difficulty {
  readonly swaps: number
  readonly durationMs: number
}

const SWAP_PAIRS: readonly Swap[] = [
  [0, 1],
  [0, 2],
  [1, 2],
]

export function applySwap(order: CupOrder, [first, second]: Swap): CupOrder {
  return order.map((cup, slot) => {
    if (slot === first) return order[second]
    if (slot === second) return order[first]
    return cup
  }) as unknown as CupOrder
}

export function planSwaps(count: number, rng: Rng = Math.random): readonly Swap[] {
  return Array.from({ length: count }).reduce<readonly Swap[]>(plan => {
    const previous = plan[plan.length - 1]
    const choices = SWAP_PAIRS.filter(pair => pair !== previous)
    return [...plan, choices[Math.floor(rng() * choices.length)]]
  }, [])
}

export function difficultyForScore(score: number): Difficulty {
  if (score < 3) return { swaps: 3, durationMs: 650 }
  if (score < 6) return { swaps: 4, durationMs: 560 }
  if (score < 9) return { swaps: 5, durationMs: 470 }
  return { swaps: 6, durationMs: 380 }
}
