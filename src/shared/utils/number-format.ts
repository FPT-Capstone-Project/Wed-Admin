/** Measurements use a decimal point, without grouping that could be ambiguous. */
export function formatDecimal(
  value: number | null | undefined,
  maximumFractionDigits = 1,
  minimumFractionDigits = maximumFractionDigits,
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    useGrouping: false, minimumFractionDigits, maximumFractionDigits,
  }).format(value)
}
