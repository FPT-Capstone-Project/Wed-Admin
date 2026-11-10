import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import {
  normalizeFarmSession,
  normalizeInspection,
} from './farm-normalizer'
import type {
  FarmSession,
  SpawnInspectionHistory,
} from '../types/farm.types'

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
 *   hiện tại), BE trả `404`. Lỗi danh sách phải hiển thị rõ ở UI.
 *   → Lỗi danh sách được chuyển cho React Query; chi tiết không tồn tại trả `null`.
 *
 * ⚠ Logic chuẩn hoá nằm ở `farm-normalizer.ts` (hàm thuần) ⇒ test được
 *   bằng Node test runner mà không cần mock axios.
 */
const BASE = '/api/farm/sessions'

export const farmApi = {
  /**
   * `GET /api/farm/sessions` — danh sách phiên trong luồng farm.
   *
   * ⚠ Response có field mà `GET /api/orders` không có (`order_id`,
   *   `customer_name`, …) ⇒ Admin dựng được danh sách đơn khách đã đặt.
   */
  async list(status?: string): Promise<FarmSession[]> {
    const response = await apiClient.get<unknown>(BASE, {
      params: status ? { status } : undefined,
    })

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
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────

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
