import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type {
  CustomerCultivationProgress,
  CustomerCultivationProgressEntry,
  CustomerCultivationStatus,
  CustomerSpawnInspectionDetail,
  CustomerSpawnInspections,
} from '../types/customer.types'
import type {
  SpawnInspection,
  SpawnInspectionImage,
} from '../../farm/types/farm.types'

/**
 * Customer Order Views API — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *
 * Endpoints (tất cả GET):
 *   - `GET /api/customer/orders/{orderId}/cultivation-status`
 *   - `GET /api/customer/orders/{orderId}/cultivation-progress`
 *   - `GET /api/customer/orders/{orderId}/spawn-inspections`
 *   - `GET /api/customer/orders/{orderId}/spawn-inspections/{inspectionId}`
 *
 * ⚠ BE cho phép Admin đọc bất kỳ đơn nào → dùng để dựng lại danh sách
 *   đơn khách đã đặt + timeline tiến độ + lịch sử kiểm tra phôi.
 *
 * ⚠ Swagger không công khai response schema → type là best-effort, mọi
 *   field optional. API layer chuẩn hoá về shape cố định.
 *
 * ## Về HTTP 404
 *
 * ⚠ Đơn ở trạng thái `PENDING` chưa gắn với phiên canh tác nào ⇒ BE trả
 *   404 cho mọi endpoint dưới đây. Đây là trạng thái **bình thường**, không
 *   phải lỗi ⇒ tất cả hàm trả `null` thay vì ném lỗi, để drawer chi tiết
 *   đơn vẫn hiển thị được phần "Trạng thái canh tác" / "Timeline" /
 *   "Lịch sử kiểm tra phôi" ở dạng rỗng.
 */

const BASE = '/api/customer/orders'

export const customerOrderApi = {
  /**
   * `GET /api/customer/orders/{orderId}/cultivation-status`
   * — trạng thái canh tác hiện tại của đơn (nhìn từ phía khách).
   */
  async getCultivationStatus(
    orderId: number,
  ): Promise<CustomerCultivationStatus | null> {
    try {
      const response = await apiClient.get<unknown>(
        `${BASE}/${orderId}/cultivation-status`,
      )
      const obj = ensureObject<Record<string, unknown>>(response.data)
      if (!obj) return null

      return {
        order_id: pickNumber(obj, 'order_id', 'orderId') ?? orderId,
        session_id: pickNumber(obj, 'session_id', 'sessionId'),
        status: pickString(obj, 'status') as CustomerCultivationStatus['status'],
        progress_percent: pickNumber(
          obj,
          'progress_percent',
          'progressPercent',
          'progress',
        ),
        growth_stage: pickString(obj, 'growth_stage', 'growthStage', 'stage'),
        start_date: pickString(obj, 'start_date', 'startDate'),
        end_date: pickString(obj, 'end_date', 'endDate'),
        expected_harvest_date: pickString(
          obj,
          'expected_harvest_date',
          'expectedHarvestDate',
        ),
        mushroom_name: pickString(obj, 'mushroom_name', 'mushroomName'),
        package_name: pickString(obj, 'package_name', 'packageName'),
        customer_name: pickString(obj, 'customer_name', 'customerName'),
        customer_email: pickString(obj, 'customer_email', 'customerEmail'),
        trays: ensureArray(obj.trays),
      }
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },

  /**
   * `GET /api/customer/orders/{orderId}/cultivation-progress`
   * — timeline các mốc tiến độ canh tác của đơn.
   */
  async getCultivationProgress(
    orderId: number,
  ): Promise<CustomerCultivationProgress | null> {
    try {
      const response = await apiClient.get<unknown>(
        `${BASE}/${orderId}/cultivation-progress`,
      )
      const obj = ensureObject<Record<string, unknown>>(response.data)
      if (!obj) return null

      const rawEntries = Array.isArray(obj.progress)
        ? obj.progress
        : Array.isArray(obj.entries)
          ? obj.entries
          : Array.isArray(obj.data)
            ? obj.data
            : ensureArray(obj)

      return {
        order_id: pickNumber(obj, 'order_id', 'orderId') ?? orderId,
        session_id: pickNumber(obj, 'session_id', 'sessionId'),
        current_stage: pickString(obj, 'current_stage', 'currentStage', 'stage'),
        progress_percent: pickNumber(
          obj,
          'progress_percent',
          'progressPercent',
        ),
        entries: rawEntries.map((item) => normalizeProgressEntry(item)),
      }
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },

  /**
   * `GET /api/customer/orders/{orderId}/spawn-inspections`
   * — lịch sử kiểm tra phôi của đơn (kèm URL ảnh Cloudinary).
   */
  async getSpawnInspections(
    orderId: number,
  ): Promise<CustomerSpawnInspections | null> {
    try {
      const response = await apiClient.get<unknown>(
        `${BASE}/${orderId}/spawn-inspections`,
      )
      const obj = ensureObject<Record<string, unknown>>(response.data)
      if (!obj) return null

      const rawInspections = Array.isArray(obj.inspections)
        ? obj.inspections
        : ensureArray(obj.data ?? obj)

      return {
        order_id: pickNumber(obj, 'order_id', 'orderId') ?? orderId,
        session_id: pickNumber(obj, 'session_id', 'sessionId'),
        inspections: rawInspections.map((item) => normalizeInspection(item)),
      }
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },

  /**
   * `GET /api/customer/orders/{orderId}/spawn-inspections/{inspectionId}`
   * — chi tiết 1 lần kiểm tra phôi.
   */
  async getSpawnInspection(
    orderId: number,
    inspectionId: number,
  ): Promise<CustomerSpawnInspectionDetail | null> {
    try {
      const response = await apiClient.get<unknown>(
        `${BASE}/${orderId}/spawn-inspections/${inspectionId}`,
      )
      const obj = ensureObject<Record<string, unknown>>(response.data)
      if (!obj) return null

      return {
        inspection_id:
          pickNumber(obj, 'inspection_id', 'inspectionId', 'id') ?? inspectionId,
        order_id: pickNumber(obj, 'order_id', 'orderId') ?? orderId,
        session_id: pickNumber(obj, 'session_id', 'sessionId'),
        total_checked: pickNumber(obj, 'totalChecked', 'total_checked'),
        normal_quantity: pickNumber(obj, 'normalQuantity', 'normal_quantity'),
        warning_quantity: pickNumber(obj, 'warningQuantity', 'warning_quantity'),
        abnormal_quantity: pickNumber(obj, 'abnormalQuantity', 'abnormal_quantity'),
        condition: pickString(obj, 'condition'),
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
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },
}

// ─── Normalizers ─────────────────────────────────────────────────────────

function normalizeProgressEntry(raw: unknown): CustomerCultivationProgressEntry {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    progress_id: pickNumber(obj, 'progress_id', 'progressId', 'id'),
    session_id: pickNumber(obj, 'session_id', 'sessionId'),
    current_stage: pickString(obj, 'current_stage', 'currentStage'),
    stage: pickString(obj, 'stage'),
    progress_percent: pickNumber(
      obj,
      'progress_percent',
      'progressPercent',
      'progress',
    ),
    description: pickString(obj, 'description'),
    notes: pickString(obj, 'notes'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
  }
}

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
