import { applySwap, difficultyForScore, planSwaps, type CupOrder, type Swap } from './shuffle'

describe('shuffle plan', () => {
  it('returns no moves for zero swaps', () => {
    expect(planSwaps(0, () => 0)).toEqual([])
  })

  it.each([
    [0, [0, 1]],
    [0.4, [0, 2]],
    [0.999, [1, 2]],
  ] as [number, Swap][])('can select each distinct pair with RNG %f', (value, pair) => {
    expect(planSwaps(1, () => value)).toEqual([pair])
  })

  it('does not immediately repeat a pair, even with a constant RNG', () => {
    expect(planSwaps(4, () => 0)).toEqual([
      [0, 1],
      [0, 2],
      [0, 1],
      [0, 2],
    ])
    const moves = planSwaps(50, () => 0.999)
    expect(moves).toHaveLength(50)
    moves.forEach((move, index) => {
      expect(move[0]).not.toBe(move[1])
      if (index > 0) expect(move).not.toEqual(moves[index - 1])
    })
  })

  it('swaps positions immutably while preserving stable IDs', () => {
    const order: CupOrder = Object.freeze([2, 0, 1])
    const moved = applySwap(order, [0, 2])
    expect(moved).toEqual([1, 0, 2])
    expect(order).toEqual([2, 0, 1])
    expect(applySwap(moved, [0, 2])).toEqual(order)
  })
})

describe('score difficulty', () => {
  it.each([
    [0, 3, 650],
    [2, 3, 650],
    [3, 4, 560],
    [5, 4, 560],
    [6, 5, 470],
    [8, 5, 470],
    [9, 6, 380],
    [999, 6, 380],
  ])('maps score %i to %i swaps at %ims', (score, swaps, durationMs) => {
    expect(difficultyForScore(score)).toEqual({ swaps, durationMs })
  })
})
