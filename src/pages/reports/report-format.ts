import { formatDecimal } from '../../shared/utils/number-format.ts'

const integerFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
export function formatReportNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return digits === 0 ? integerFormatter.format(value) : formatDecimal(value, digits)
}
export const formatReportMoney = (value: number) => `${formatReportNumber(value)} ₫`
export const formatReportPercent = (value: number) => `${formatReportNumber(value, 1)}%`
export const formatReportWeight = (value: number) => `${formatReportNumber(value, 1)} kg`
export const formatReportMillions = (value: number) => `${formatReportNumber(value / 1e6, 1)} Tr đ`
export function niceRevenueTicks(max: number): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 200000, 400000, 600000, 800000]
  const raw = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 4, 5, 10].find(n => n * magnitude >= raw) ?? 10) * magnitude
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}
export function formatReportPeriod(key: string): string {
  if (/^\d{4}-\d{2}$/.test(key)) return `T${key.slice(5)}/${key.slice(0, 4)}`
  if (/^\d{4}-Q[1-4]$/.test(key)) return `${key.slice(5)}/${key.slice(0, 4)}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const date = new Date(`${key}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
    const year = date.getUTCFullYear()
    const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)
    return `Tuần ${week}/${year}`
  }
  return key
}
export const reportDateTime = (date: Date) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
}).format(date)
export function reportFileDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)?.value).join('-')
}

/** Fill calendar gaps using the same Vietnam calendar as the source aggregation. */
export function continuousRevenuePeriods<T extends { month: string; current: number; previous: number | null }>(
  points: T[], granularity: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY', now = new Date(),
): { month: string; current: number; previous: number | null }[] {
  if (!points.length) return []
  const keyFor = (date: Date) => {
    const year = date.getUTCFullYear(), month = date.getUTCMonth()
    if (granularity === 'WEEKLY') {
      const monday = new Date(date)
      monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
      return monday.toISOString().slice(0, 10)
    }
    return granularity === 'MONTHLY' ? `${year}-${String(month + 1).padStart(2, '0')}` : `${year}-Q${Math.floor(month / 3) + 1}`
  }
  const dateFor = (key: string) => new Date(granularity === 'QUARTERLY'
    ? Date.UTC(Number(key.slice(0, 4)), (Number(key.slice(-1)) - 1) * 3, 1)
    : `${key}${granularity === 'MONTHLY' ? '-01' : ''}T00:00:00Z`)
  const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month))
  const cursor = dateFor(sorted[0].month)
  const today = new Date(`${reportFileDate(now)}T00:00:00Z`)
  const last = keyFor(today)
  const values = new Map(points.map(point => [point.month, point]))
  const result = []
  while (keyFor(cursor) <= last) {
    const month = keyFor(cursor)
    result.push(values.get(month) ?? { month, current: 0, previous: null })
    if (granularity === 'WEEKLY') cursor.setUTCDate(cursor.getUTCDate() + 7)
    else cursor.setUTCMonth(cursor.getUTCMonth() + (granularity === 'MONTHLY' ? 1 : 3))
  }
  return result
}
