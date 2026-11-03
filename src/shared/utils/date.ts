import dayjs from 'dayjs'
export type DateValue = string | number | Date | null | undefined
export function formatDate(dateValue: DateValue, formatStr = 'HH:mm DD/MM/YYYY'): string {
  if (!dateValue || (typeof dateValue === 'string' && (!dateValue.trim() || dateValue.trim() === '0'))) return '—'
  const parsed = dayjs(dateValue)
  if (!parsed.isValid() || parsed.year() <= 1970) return '—'
  return parsed.format(formatStr)
}
