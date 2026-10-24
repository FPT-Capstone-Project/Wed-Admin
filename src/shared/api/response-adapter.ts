import type { AxiosResponse } from 'axios'
import { pushUnreadCount } from '../../features/notifications/store/notification.store'

/**
 * Response Adapter — chuẩn hoá 4 kiểu response của BE về **một** shape.
 *
 * Backend trả không đồng nhất (xem `src/controllers/*.js`):
 *
 *   1. Mảng trực tiếp / object đơn
 *        `{ id: 1 }`
 *   2. Wrapper `data`
 *        `{ data: [...] }`, `{ data: { id: 1 } }`
 *   3. Wrapper `data` + `pagination`
 *        `{ data: [...], pagination: { page, total, ... } }`
 *        ({ data, pagination } từ `utils/pagination.js`)
 *   4. Wrapper `data` + `meta.unread_count`
 *        `{ data: [...], meta: { unread_count } }` (notification controller)
 *
 * Mục tiêu: UI không bao giờ phải biết BE đang bọc theo kiểu nào.
 *
 * ⚠ Chỉ đọc/ghi metadata ở đây — **không** thay response. Việc quyết định
 *   `data` là mảng hay object vẫn thuộc về `api/*.api.ts` qua
 *   `ensureArray()` / `ensureObject()`, vì adapter không biết caller muốn
 *   gì. Nếu adapter cải chính `response.data`, các endpoint trả
 *   `{ data: {...} }` sẽ bị bóc hai lần và vỡ.
 */

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface NormalizedPayload<T> {
  items: T[]
  pagination: PaginationMeta | null
  unreadCount: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Đọc `pagination` nếu BE có trả (thiếu → `null`). */
function extractPagination(body: unknown): PaginationMeta | null {
  if (!isRecord(body)) return null

  const raw = isRecord(body.pagination)
    ? body.pagination
    : isRecord(body.meta) && isRecord(body.meta.pagination)
      ? body.meta.pagination
      : null
  if (!raw) return null

  const page = Number(raw.page ?? raw.currentPage ?? 0)
  const pageSize = Number(raw.pageSize ?? raw.limit ?? raw.perPage ?? 0)
  const total = Number(raw.total ?? raw.totalItems ?? 0)

  // Trả `null` nếu thiếu cặp page/total cơ bản — không đoán bừa.
  if (!Number.isFinite(page) || !Number.isFinite(total)) return null

  return {
    page,
    pageSize: Number.isFinite(pageSize) ? pageSize : 0,
    total,
    totalPages:
      Number.isFinite(Number(raw.totalPages)) && Number(raw.totalPages) > 0
        ? Number(raw.totalPages)
        : pageSize > 0
          ? Math.ceil(total / pageSize)
          : 0,
  }
}

/** Đọc `meta.unread_count` (notification controller) nếu có. */
function extractUnreadCount(body: unknown): number | null {
  if (!isRecord(body)) return null

  const raw = isRecord(body.meta) ? body.meta.unread_count : undefined
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null

  return raw
}

/**
 * Tách `data` (mảng) + `pagination` + `unread_count` ra khỏi body.
 *
 * Trả về `items: []` khi body không phải object — cùng hành vi với
 * `ensureArray()`, nên caller có thể dùng thẳng cho `Table.dataSource`.
 */
export function normalizePayload<T = unknown>(body: unknown): NormalizedPayload<T> {
  if (Array.isArray(body)) {
    return { items: body as T[], pagination: null, unreadCount: null }
  }

  if (!isRecord(body)) {
    return { items: [], pagination: null, unreadCount: null }
  }

  const pagination = extractPagination(body)
  const unreadCount = extractUnreadCount(body)

  // Ưu tiên `data`; `items` là chuẩn REST cho các endpoint khác.
  const rawItems = Array.isArray(body.data)
    ? body.data
    : Array.isArray(body.items)
      ? body.items
      : []

  return {
    items: rawItems as T[],
    pagination,
    unreadCount,
  }
}

/**
 * Interceptor chuẩn hoá response.
 *
 * Không mutate body — chỉ:
 *   - đẩy `meta.unread_count` vào notification store,
 *   - gắn metadata đã chuẩn hoá vào `response.data.__normalized` để các
 *     hook đọc được `pagination` mà không phải gọi lại API.
 *
 * Dùng property ẩn (`__normalized`) thay vì export hàm, để mọi caller
 * hiện hữu (`ensureArray(response.data)`) **không đổi hành vi**.
 */
export function normalizeResponse(response: AxiosResponse): AxiosResponse {
  const { pagination, unreadCount } = normalizePayload(response.data)

  if (unreadCount !== null) {
    pushUnreadCount(unreadCount)
  }

  if (pagination && isRecord(response.data)) {
    response.data = {
      ...response.data,
      __normalized: { pagination, unreadCount },
    }
  }

  return response
}