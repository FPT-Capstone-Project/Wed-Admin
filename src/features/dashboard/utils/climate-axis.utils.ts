/** Integer 1/2/5-step ticks; all finite observations remain inside the domain. */
export function climateAxis(values: readonly (number | null)[]): { domain: [number, number]; ticks: number[] } {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!finite.length) return { domain: [0, 4], ticks: [0, 1, 2, 3, 4] }
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const rawStep = Math.max(1, (max - min) / 4)
  const scale = 10 ** Math.floor(Math.log10(rawStep))
  const step = ([1, 2, 5, 10].find(multiplier => multiplier * scale >= rawStep) ?? 10) * scale
  let low = Math.floor(min / step) * step
  let high = Math.ceil(max / step) * step
  if (low === high) { low -= step; high += step }
  const ticks = Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => low + index * step)
  return { domain: [low, high], ticks }
}
