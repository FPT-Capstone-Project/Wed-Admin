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

const compactDecimalFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Giữ một chữ số thập phân để các mốc gần nhau trên biểu đồ khác nhãn. */
export function formatCompactVND(value: number | string | null | undefined): string {
  if (value == null || (typeof value === 'string' && !value.trim())) return '—'
  const amount = Number(value)
  return Number.isFinite(amount)
    ? compactDecimalFormatter.formatToParts(amount).map(part => part.type === 'decimal' ? '.' : part.value).join('')
    : '—'
}

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
