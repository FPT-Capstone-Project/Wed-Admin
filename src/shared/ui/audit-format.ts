export function auditDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}
export function auditWeight(value: number | string | null | undefined): string {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}
