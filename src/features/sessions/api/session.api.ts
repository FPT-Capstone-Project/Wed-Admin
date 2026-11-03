import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type {
  CultivationSession,
  SessionListQuery,
  SessionPagination,
  SessionTray,
} from '../types/session.types'

/**
 * Cultivation Sessions API — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *   Mọi hành động ghi (tạo tiến độ, ghi nhận kiểm tra theo khay, chuyển
 *   giai đoạn, huỷ phiên) do **nhân viên (staff)** thực hiện trên app.
 *   Web Admin chỉ quan sát dữ liệu.
 *
 * Endpoints:
 *   - `GET /api/cultivation-sessions/admin` — danh sách phiên (có phân trang).
 *   - `GET /api/cultivation-sessions/admin/{sessionId}` — chi tiết + `trays[]`.
 *
 * ## Về HTTP 404
 *
 * ⚠ Một số bản deploy của BE **không có** route `GET
 *   /api/cultivation-sessions/admin` (chỉ có route `/admin/{sessionId}`).
 *   Khi đó BE trả `404` → FE **không** được để lỗi nổi lên làm đỏ cả
 *   trang; thay vào đó trả về danh sách rỗng để UI hiển thị
 *   "Chưa có phiên canh tác nào".
 *
 *   → `list()` bắt lỗi 404 → `{ items: [], pagination }`.
 *   → `getById()` bắt lỗi 404 → `null` (UI hiển thị "không tìm thấy").
 *
 * Phân quyền (Swagger): `401` khi thiếu token, `403` khi role không phải
 * Admin / Farm Operator.
 */

const BASE = '/api/cultivation-sessions/admin'

/** Kết quả list + pagination (BE tách `pagination` ra ngoài `data`). */
export interface SessionListResult {
  items: CultivationSession[]
  pagination: SessionPagination
}

export const sessionApi = {
  /**
   * `GET /api/cultivation-sessions/admin` — danh sách phiên canh tác.
   *
   * Hỗ trợ đầy đủ bộ lọc: `status`, `userId`, `trayId`, `mushroomTypeId`,
   * `startDateFrom`, `startDateTo`, `page`, `pageSize`.
   *
   * ⚠ Trả `{ items: [] }` (không ném lỗi) khi BE trả 404 — endpoint chưa
   *   tồn tại trên bản deploy hiện tại.
   */
  async list(query: SessionListQuery = {}): Promise<SessionListResult> {
    const emptyPagination: SessionPagination = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      total: 0,
      totalPages: 0,
    }

    let response: { data?: unknown }
    try {
      response = await apiClient.get<unknown>(BASE, { params: query })
    } catch (error) {
      // 404 → endpoint chưa có trên server ⇒ coi như "chưa có phiên nào".
      if (isNotFoundError(error)) {
        return { items: [], pagination: emptyPagination }
      }
      throw error
    }

    const body = (response.data ?? {}) as Record<string, unknown>
    const rawItems = Array.isArray(body.data)
      ? body.data
      : ensureArray<unknown>(body)

    const items = rawItems.map((item) => normalizeSession(item))

    const pagination = (body.pagination as SessionPagination | undefined) ?? {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    }

    return { items, pagination }
  },

  /**
   * `GET /api/cultivation-sessions/admin/{sessionId}` — chi tiết phiên.
   *
   * Response chứa mảng `trays[]` — danh sách khay (kèm phòng / tầng) được
   * gán cho phiên.
   *
   * ⚠ Trả `null` khi BE trả 404 (phiên không tồn tại) hoặc route chi tiết
   *   chưa có trên bản deploy hiện tại.
   */
  async getById(sessionId: number): Promise<CultivationSession | null> {
    try {
      const response = await apiClient.get<unknown>(`${BASE}/${sessionId}`)
      const obj = ensureObject<Record<string, unknown>>(response.data)
      if (!obj) return null
      return normalizeSession(obj)
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },
}

// ─── Normalizers ─────────────────────────────────────────────────────────

/**
 * Chuẩn hoá 1 phiên từ response thô của BE.
 *
 * ⚠ BE chưa công khai schema chi tiết → đọc theo **nhiều tên field** và
 *   fallback về `null` thay vì crash. `trays` luôn là mảng (có thể rỗng)
 *   để UI không phải guard.
 */
function normalizeSession(raw: unknown): CultivationSession {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    session_id: pickNumber(obj, 'session_id', 'sessionId', 'id') ?? 0,
    order_id: pickNumber(obj, 'order_id', 'orderId'),
    user_id: pickNumber(obj, 'user_id', 'userId', 'customer_id'),
    customer_name: pickString(obj, 'customer_name', 'customerName'),
    customer_email: pickString(obj, 'customer_email', 'customerEmail'),
    customer_phone: pickString(obj, 'customer_phone', 'customerPhone'),
    package_id: pickNumber(obj, 'package_id', 'packageId'),
    package_name: pickString(obj, 'package_name', 'packageName'),
    mushroom_type_id: pickNumber(obj, 'mushroom_type_id', 'mushroomTypeId'),
    mushroom_name: pickString(obj, 'mushroom_name', 'mushroomName'),
    status: pickString(
      obj,
      'status',
    ) as CultivationSession['status'] ?? 'PENDING',
    progress_percent: pickNumber(
      obj,
      'progress_percent',
      'progressPercent',
      'progress',
    ),
    start_date: pickString(obj, 'start_date', 'startDate'),
    end_date: pickString(obj, 'end_date', 'endDate'),
    expected_harvest_date: pickString(
      obj,
      'expected_harvest_date',
      'expectedHarvestDate',
    ),
    tray_count: pickNumber(obj, 'tray_count', 'trayCount', 'trays_count'),
    trays: ensureArray<unknown>(obj.trays ?? obj.session_trays).map(
      normalizeTray,
    ),
    payment_status: pickString(obj, 'payment_status', 'paymentStatus'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
    updated_at: pickString(obj, 'updated_at', 'updatedAt'),
  }
}

/** Chuẩn hoá 1 khay được gán cho phiên. */
function normalizeTray(raw: unknown): SessionTray {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    session_tray_id: pickNumber(obj, 'session_tray_id', 'sessionTrayId', 'id'),
    tray_id: pickNumber(obj, 'tray_id', 'trayId'),
    tray_code: pickString(obj, 'tray_code', 'trayCode', 'code'),
    tray_name: pickString(obj, 'tray_name', 'trayName', 'name'),
    room_id: pickNumber(obj, 'room_id', 'roomId'),
    room_code: pickString(obj, 'room_code', 'roomCode'),
    room_name: pickString(obj, 'room_name', 'roomName'),
    floor_id: pickNumber(obj, 'floor_id', 'floorId'),
    floor_number: pickNumber(obj, 'floor_number', 'floorNumber'),
    floor_name: pickString(obj, 'floor_name', 'floorName'),
    spawn_quantity: pickNumber(obj, 'spawn_quantity', 'spawnQuantity'),
    status: pickString(obj, 'status'),
  }
}

function pickString(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    // BE có thể trả số dạng chuỗi ("12") → ép an toàn.
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}
