export interface ListPagination { page: number; pageSize: number; total: number; totalPages: number }
export interface ListResponse<T> { data: T[]; pagination: ListPagination }
export function cleanQueryParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== ''))) as Partial<T>
}
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function nonnegative(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined
}
/** Unwrap only recognized collection envelopes; malformed data is an error, never an empty farm. */
export function unwrapListResponse<T>(raw: unknown, defaults: { page?: number; pageSize?: number } = {}): ListResponse<T> {
  let current = raw
  let metadata: Record<string, unknown> = {}
  for (let depth = 0; depth < 8; depth += 1) {
    if (Array.isArray(current)) {
      const page = nonnegative(metadata.page) || defaults.page || 1
      const pageSize = nonnegative(metadata.pageSize ?? metadata.limit) || defaults.pageSize || 20
      const total = nonnegative(metadata.total) ?? current.length
      return { data: current as T[], pagination: { page, pageSize, total, totalPages: nonnegative(metadata.totalPages) ?? Math.ceil(total / pageSize) } }
    }
    const envelope = record(current)
    if (!envelope) break
    const meta = record(envelope.meta)
    metadata = { ...envelope, ...meta, ...record(meta?.pagination), ...record(envelope.pagination), ...metadata }
    const key = ['items', 'data', 'content'].find(key => envelope[key] != null && typeof envelope[key] === 'object')
    if (!key) break
    current = envelope[key]
  }
  throw new Error('Dữ liệu danh sách từ máy chủ không đúng định dạng')
}
