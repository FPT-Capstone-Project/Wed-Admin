import type { Inventory, ExportTransaction } from '../types/inventory.types'

// Ngưỡng tạm dùng chung, chờ backend bổ sung field ngưỡng theo giống.
export const LOW_STOCK_THRESHOLD = 20
export const SUMMARY_PAGE_LIMIT = 10
export const SUMMARY_PAGE_SIZE = 100
export const INCOMPLETE_SUMMARY = 'Chưa đủ dữ liệu để tổng hợp'

/** Decimal PostgreSQL được giữ dạng chuỗi; BigInt tránh mất độ chính xác khi cộng. */
function decimal(value: unknown): { units: bigint; scale: number } {
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value.trim())) {
    throw new Error('Số lượng phôi từ máy chủ không hợp lệ.')
  }
  const [integer, fraction = ''] = value.trim().split('.')
  return { units: BigInt(`${integer}${fraction}`), scale: fraction.length }
}

export function sumQuantities(values: string[]): string {
  const parts = values.map(decimal)
  const scale = Math.max(0, ...parts.map(part => part.scale))
  const units = parts.reduce((sum, part) => sum + part.units * 10n ** BigInt(scale - part.scale), 0n)
  const sign = units < 0n ? '-' : ''
  const digits = (units < 0n ? -units : units).toString().padStart(scale + 1, '0')
  if (!scale) return `${sign}${digits}`
  const fraction = digits.slice(-scale).replace(/0+$/, '')
  return `${sign}${digits.slice(0, -scale)}${fraction ? `.${fraction}` : ''}`
}

export function stockLevel(quantity: string) {
  const { units, scale } = decimal(quantity)
  if (units <= 0n) return { label: 'Hết phôi', tone: 'danger' as const }
  if (units <= BigInt(LOW_STOCK_THRESHOLD) * 10n ** BigInt(scale)) {
    return { label: 'Sắp hết phôi', tone: 'warning' as const }
  }
  return { label: 'Tồn kho bình thường', tone: 'success' as const }
}

export function isEmptyStock(quantity: string): boolean {
  return decimal(quantity).units === 0n
}

export function formatQuantity(value: string): string {
  decimal(value)
  const [integer, fraction] = value.split('.')
  return fraction ? `${integer}.${fraction}` : integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dữ liệu kho phôi không hợp lệ.')
  return value as Record<string, unknown>
}
function id(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw new Error('Mã kho phôi không hợp lệ.')
  return value
}
function quantity(value: unknown): string {
  decimal(value)
  return (value as string).trim()
}
function date(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) > 0 ? value : null
}
function name(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : 'Chưa có tên giống nấm'
}
export function mapInventory(value: unknown): Inventory {
  const row = record(value)
  return { inventory_id: id(row.inventory_id), mushroom_type_id: id(row.mushroom_type_id), mushroom_name: name(row.mushroom_name), quantity: quantity(row.quantity), updated_at: date(row.updated_at) }
}
export function mapExport(value: unknown): ExportTransaction {
  const row = record(value)
  return { transaction_id: id(row.transaction_id), inventory_id: id(row.inventory_id), mushroom_type_id: id(row.mushroom_type_id), mushroom_name: name(row.mushroom_name), quantity: quantity(row.quantity), quantity_before: quantity(row.quantity_before), quantity_after: quantity(row.quantity_after), session_id: row.session_id == null ? null : id(row.session_id), notes: typeof row.notes === 'string' ? row.notes : null, created_at: date(row.created_at) }
}

export interface SummaryPage<T> { data: T[]; pagination: { page: number; totalPages: number; total: number } }
/** Không bao giờ trả tổng một phần khi vượt trần, trang lỗi hoặc phân trang thiếu dữ liệu. */
export async function collectSummaryPages<T>(fetchPage: (page: number) => Promise<SummaryPage<T>>): Promise<T[]> {
  const first = await fetchPage(1)
  const pages = first.pagination.totalPages
  if (!Number.isInteger(pages) || pages < 0 || pages > SUMMARY_PAGE_LIMIT || first.pagination.page !== 1 || first.data.length > SUMMARY_PAGE_SIZE) throw new Error(INCOMPLETE_SUMMARY)
  const rows = [...first.data]
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchPage(page)
    if (next.pagination.page !== page || next.pagination.totalPages !== pages || next.pagination.total !== first.pagination.total || next.data.length > SUMMARY_PAGE_SIZE) throw new Error(INCOMPLETE_SUMMARY)
    rows.push(...next.data)
  }
  if (rows.length !== first.pagination.total) throw new Error(INCOMPLETE_SUMMARY)
  return rows
}
