export interface FormatVNDOptions {
  compact?: boolean
  fallback?: string
}

const fullFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const compactFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
  notation: 'compact',
})

/** Format finite amounts, preserving a legitimate zero and missing-data fallback. */
export function formatVND(
  value: number | string | null | undefined,
  options: FormatVNDOptions = {},
): string {
  const { compact = false, fallback = '—' } = options
  if (value == null || (typeof value === 'string' && !value.trim())) return fallback
  const amount = Number(value)
  if (!Number.isFinite(amount)) return fallback
  return (compact ? compactFormatter : fullFormatter).format(amount)
}
