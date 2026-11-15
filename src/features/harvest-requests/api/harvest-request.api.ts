/**
 * API service — `GET /api/harvest-requests/admin` (WF-04).
 *
 * ⚠ Endpoint này **chỉ** cho Admin (role 1) và Farm Operator (role 2) —
 *   xem Swagger: `403 — Admin or Farm Operator role required`.
 *
 * ⚠ Response BE: `{ total: number, data: HarvestRequestRow[] }`.
 */
import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  HarvestRequestListResult,
  HarvestRequestRow,
} from '../types/harvest-request.types'

/** Endpoint danh sách yêu cầu nhận nấm cho quản trị. */
export const HARVEST_REQUESTS_ADMIN_URL = '/api/harvest-requests/admin'

/**
 * Chuẩn hoá 1 dòng từ BE — **không** tin tuyệt đối vào shape.
 *
 * ⚠ BE có thể bỏ field (vd `customer_phone` null) hoặc trả kiểu khác
 *   (`scheduled_at` rỗng) ⇒ ép kiểu ở đây để UI không phải guard.
 */
function normalizeHarvestRequestRow(
  raw: Record<string, unknown>,
): HarvestRequestRow {
  const text = (value: unknown): string | null => {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed ? trimmed : null
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    return null
  }

  const num = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  return {
    harvest_request_id: num(raw.harvest_request_id) ?? 0,
    session_id: num(raw.session_id) ?? 0,
    harvest_method:
      raw.harvest_method === 'PICKUP' || raw.harvest_method === 'DELIVERY'
        ? raw.harvest_method
        : null,
    scheduled_at: text(raw.scheduled_at),
    status: text(raw.status) ?? 'PENDING',
    customer_note: text(raw.customer_note),
    confirmed_at: text(raw.confirmed_at),
    completed_at: text(raw.completed_at),
    confirmed_by: num(raw.confirmed_by),
    delivery_address: text(raw.delivery_address),
    order_id: num(raw.order_id),
    order_code: text(raw.order_code),
    customer_id: num(raw.customer_id),
    customer_name: text(raw.customer_name),
    customer_phone: text(raw.customer_phone),
    customer_email: text(raw.customer_email),
    session_status: text(raw.session_status),
  }
}

/**
 * GET /api/harvest-requests/admin — danh sách yêu cầu nhận nấm.
 *
 * ⚠ BE trả `{ total, data: [...] }` — **không** có wrapper `pagination`
 *   ⇒ dùng `ensureArray` (bóc `data`) + đọc `total` từ object gốc.
 */
export async function fetchAdminHarvestRequests(): Promise<HarvestRequestListResult> {
  const response = await apiClient.get<unknown>(HARVEST_REQUESTS_ADMIN_URL)
  const body = ensureObject<Record<string, unknown>>(response.data) ?? {}
  const rows = ensureArray<Record<string, unknown>>(body.data).map(
    normalizeHarvestRequestRow,
  )
  const total =
    typeof body.total === 'number' && Number.isFinite(body.total)
      ? body.total
      : rows.length

  return { items: rows, total }
}
