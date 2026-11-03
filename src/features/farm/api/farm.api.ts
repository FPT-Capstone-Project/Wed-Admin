import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type {
  FarmSession,
  SpawnInspection,
  SpawnInspectionHistory,
  SpawnInspectionImage,
} from '../types/farm.types'
import type { CultivationSessionStatus } from '../../sessions/types/session.types'

/**
 * Farm Spawn Workflow API — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *   Các endpoint ghi của luồng này (`POST .../spawn-inspections`,
 *   `PATCH .../stage`, `POST .../images`, `POST .../replacements`) do
 *   **nhân viên (staff)** thực hiện trên app.
 *
 * Endpoints:
 *   - `GET /api/farm/sessions` — danh sách phiên trong luồng farm.
 *   - `GET /api/farm/sessions/{id}` — chi tiết phiên (kèm `spawn_issued`).
 *   - `GET /api/farm/sessions/{id}/spawn-inspections` — lịch sử kiểm tra phôi.
 *
 * ## Về HTTP 404
 *
 * ⚠ Khi phiên canh tác chưa tồn tại (hoặc route chưa có trên bản deploy
 *   hiện tại), BE trả `404`. FE **không** để lỗi nổi lên làm hỏng cả trang
 *   → `list()` trả `[]`, `getById()` / `getSpawnInspections()` trả `null`.
 *
 * Phân quyền (Swagger): `403` nếu không phải Admin / Farm Operator.
 */

const BASE = '/api/farm/sessions'

export const farmApi = {
  /**
   * `GET /api/farm/sessions` — danh sách phiên đã thanh toán trong luồng farm.
   *
   * Query duy nhất BE hỗ trợ: `status` (8 trạng thái phiên).
   *
   * ⚌ Response chứa `order_id`, `customer_name`, `customer_email`,
   *   `package_name`, `mushroom_name` — nhờ đó Admin dựng lại được danh sách
   *   đơn khách đã đặt (vì `GET /api/orders` chỉ trả đơn của chính user
   *   đăng nhập).
   */
  async list(status?: string): Promise<FarmSession[]> {
    let response: { data?: unknown }
    try {
      response = await apiClient.get<unknown>(BASE, {
        params: status ? { status } : undefined,
      })
    } catch (error) {
      // 404 → chưa có luồng farm trên server ⇒ coi như danh sách rỗng.
      if (isNotFoundError(error)) return []
      throw error
    }

    const body = (response.data ?? {}) as Record<string, unknown>
    const rawItems = Array.isArray(body.data) ? body.data : ensureArray(body)

    return rawItems.map((item) => normalizeFarmSession(item))
  },

  /**
   * `GET /api/farm/sessions/{id}` — chi tiết phiên + `spawn_issued`.
   *
   * ⚠ Trả `null` khi BE trả 404 (phiên không tồn tại).
   */
  async getById(sessionId: number): Promise<FarmSession | null> {
    try {
      const response = await apiClient.get<unknown>(`${BASE}/${sessionId}`)
      const obj = ensureObject<Record<string, unknown>>(response.data)
      if (!obj) return null
      return normalizeFarmSession(obj)
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },

  /**
   * `GET /api/farm/sessions/{id}/spawn-inspections` — lịch sử kiểm tra phôi.
   *
   * Response gồm các field tổng hợp (`totalChecked`, `normalQuantity`,
   * `warningQuantity`, `abnormalQuantity`, `replacementQuantity`) cùng mảng
   * lần kiểm tra, mỗi lần có `images[]` (URL Cloudinary).
   *
   * ⚠ Trả `null` khi BE trả 404 (phiên chưa có lịch sử kiểm tra phôi).
   */
  async getSpawnInspections(
    sessionId: number,
  ): Promise<SpawnInspectionHistory | null> {
    try {
      const response = await apiClient.get<unknown>(
        `${BASE}/${sessionId}/spawn-inspections`,
      )
      const obj = ensureObject<Record<string, unknown>>(response.data)
      if (!obj) return null

      const inspections = ensureArray<unknown>(
        obj.inspections ?? obj.data ?? obj,
      ).map((item) => normalizeInspection(item))

      return {
        session_id: pickNumber(obj, 'session_id', 'sessionId') ?? sessionId,
        inspections,
        total_checked: pickNumber(obj, 'totalChecked', 'total_checked'),
        normal_quantity: pickNumber(obj, 'normalQuantity', 'normal_quantity'),
        warning_quantity: pickNumber(obj, 'warningQuantity', 'warning_quantity'),
        abnormal_quantity: pickNumber(obj, 'abnormalQuantity', 'abnormal_quantity'),
        replacement_quantity: pickNumber(
          obj,
          'replacementQuantity',
          'replacement_quantity',
        ),
      }
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },
}

// ─── Normalizers ─────────────────────────────────────────────────────────

/** Chuẩn hoá 1 phiên farm — đọc nhiều tên field (camelCase lẫn snake_case). */
function normalizeFarmSession(raw: unknown): FarmSession {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    session_id: pickNumber(obj, 'session_id', 'sessionId', 'id') ?? 0,
    order_id: pickNumber(obj, 'order_id', 'orderId'),
    user_id: pickNumber(obj, 'user_id', 'userId', 'customer_id'),
    customer_name: pickString(obj, 'customer_name', 'customerName'),
    customer_email: pickString(obj, 'customer_email', 'customerEmail'),
    customer_phone: pickString(obj, 'customer_phone', 'customerPhone'),
    package_name: pickString(obj, 'package_name', 'packageName'),
    mushroom_name: pickString(obj, 'mushroom_name', 'mushroomName'),
    mushroom_type_id: pickNumber(obj, 'mushroom_type_id', 'mushroomTypeId'),
    status: (pickString(obj, 'status') ??
      'PENDING') as CultivationSessionStatus,
    spawn_issued: pickNumber(obj, 'spawn_issued', 'spawnIssued', 'spawn_used'),
    spawn_remaining: pickNumber(obj, 'spawn_remaining', 'spawnRemaining'),
    tray_count: pickNumber(obj, 'tray_count', 'trayCount', 'trays_count'),
    spawn_quantity: pickNumber(obj, 'spawn_quantity', 'spawnQuantity'),
    start_date: pickString(obj, 'start_date', 'startDate'),
    end_date: pickString(obj, 'end_date', 'endDate'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
    updated_at: pickString(obj, 'updated_at', 'updatedAt'),
  }
}

/** Chuẩn hoá 1 lần kiểm tra phôi + ảnh Cloudinary kèm theo. */
function normalizeInspection(raw: unknown): SpawnInspection {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    inspection_id: pickNumber(obj, 'inspection_id', 'inspectionId', 'id') ?? 0,
    session_id: pickNumber(obj, 'session_id', 'sessionId'),
    total_checked: pickNumber(obj, 'totalChecked', 'total_checked'),
    normal_quantity: pickNumber(obj, 'normalQuantity', 'normal_quantity'),
    warning_quantity: pickNumber(obj, 'warningQuantity', 'warning_quantity'),
    abnormal_quantity: pickNumber(obj, 'abnormalQuantity', 'abnormal_quantity'),
    condition: pickString(obj, 'condition') as SpawnInspection['condition'],
    replacement_quantity: pickNumber(
      obj,
      'replacementQuantity',
      'replacement_quantity',
    ),
    notes: pickString(obj, 'notes'),
    next_check_at: pickString(obj, 'nextCheckAt', 'next_check_at'),
    images: ensureArray<unknown>(obj.images ?? obj.image_urls).map(
      normalizeImage,
    ),
    checked_at: pickString(obj, 'checked_at', 'checkedAt'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
  }
}

/** Ảnh Cloudinary — BE có thể trả `url` hoặc `secure_url`. */
function normalizeImage(raw: unknown): SpawnInspectionImage {
  if (typeof raw === 'string') return { url: raw, secure_url: raw }

  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}
  return {
    image_id: pickNumber(obj, 'image_id', 'imageId', 'id'),
    url: pickString(obj, 'url', 'image_url', 'imageUrl'),
    secure_url: pickString(obj, 'secure_url', 'secureUrl'),
    public_id: pickString(obj, 'public_id', 'publicId'),
    caption: pickString(obj, 'caption'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
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
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}
