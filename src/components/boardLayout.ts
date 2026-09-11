export interface BoardLayout {
  width: number
  height: number
  cupWidth: number
  cupHeight: number
  lift: number
  top: number
  slotWidth: number
}

export function boardLayout(width: number, height: number): BoardLayout {
  const cupHeight = Math.max(0, Math.min(120, width * 0.24, height / 1.9))
  const lift = cupHeight * 0.72
  return {
    width,
    height,
    cupHeight,
    cupWidth: cupHeight * 0.975,
    lift,
    top: (height - cupHeight + lift) / 2,
    slotWidth: width / 3,
  }
}
