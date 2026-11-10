/**
 * Chuẩn hoá response luồng Farm Spawn Workflow — **hàm thuần**.
 *
 * ⚠ Tách riêng khỏi `farm.api.ts` để:
 *   1. Test được bằng Node test runner (không cần mock axios).
 *   2. API layer chỉ lo gọi mạng; logic chuẩn hoá nằm 1 nơi.
 *
 * ⚠ Module này **không import runtime** từ module khác ⇒ chạy được trong
 *   Node test runner (`--experimental-strip-types`) mà không cần loader.
 */
import type {
  FarmSession,
  SpawnInspection,
  SpawnInspectionHistory,
  SpawnInspectionImage,
} from '../types/farm.types'
import type { CultivationSessionStatus } from '../../sessions/types/session.types'

/** Chuẩn hoá 1 phiên trong luồng farm. */
export function normalizeFarmSession(raw: unknown): FarmSession {
  const obj = asRecord(raw) ?? {}

  return {
    harvest_status: pickString(obj, 'harvest_status', 'harvestStatus'),
    expected_harvest_date: pickString(
      obj,
      'expected_harvest_date',
      'expectedHarvestDate',
      'harvest_date',
    ),
    last_inspected_at: pickString(obj, 'last_inspected_at', 'lastInspectedAt'),
    order_item_id: pickNumber(obj, 'order_item_id', 'orderItemId'),
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
    payment_status: pickString(obj, 'payment_status', 'paymentStatus'),
    spawn_issued: pickNumber(obj, 'spawn_issued', 'spawnIssued', 'spawn_used'),
    spawn_remaining: pickNumber(obj, 'spawn_remaining', 'spawnRemaining'),
    tray_count: pickNumber(
      obj,
      'tray_quantity',
      'tray_count',
      'trayCount',
      'trays_count',
    ),
    spawn_quantity: pickNumber(obj, 'spawn_quantity', 'spawnQuantity'),
    start_date: pickString(obj, 'start_at', 'start_date', 'startDate'),
    end_date: pickString(obj, 'end_date', 'endDate'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
    updated_at: pickString(obj, 'updated_at', 'updatedAt'),
  }
}

/** Chuẩn hoá 1 lần kiểm tra phôi + ảnh Cloudinary kèm theo. */
export function normalizeInspection(raw: unknown): SpawnInspection {
  const obj = asRecord(raw) ?? {}

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
    images: asArray(obj.images ?? obj.image_urls).map(normalizeImage),
    /*
     * ⚠ BE (`SELECT si.inspected_at` từ bảng `spawn_inspections`) trả cột
     *   **`inspected_at`** — không có cột `checked_at` ⇒ phải đọc
     *   `inspected_at` làm mốc thời gian kiểm tra, nếu không mọi lần kiểm
     *   tra phôi sẽ mất timestamp và thư viện ảnh tổng hợp mất trục thời gian.
     */
    checked_at: pickString(obj, 'checked_at', 'checkedAt', 'inspected_at'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
    /** BE join `users.full_name` — người thực hiện kiểm tra. */
    inspected_by_name: pickString(obj, 'inspected_by_name', 'inspectedByName'),
    /** Giai đoạn ủ phôi tại thời điểm kiểm tra (RESTING / MYCELIAL_DEVELOPMENT). */
    stage: pickString(obj, 'stage'),
  }
}

/** Ảnh Cloudinary — BE có thể trả `url`, `image_url` hoặc `secure_url`. */
export function normalizeImage(raw: unknown): SpawnInspectionImage {
  if (typeof raw === 'string') return { url: raw, secure_url: raw }

  const obj = asRecord(raw) ?? {}
  const url = pickString(obj, 'url', 'image_url', 'imageUrl')
  return {
    image_id: pickNumber(obj, 'image_id', 'imageId', 'id'),
    url,
    /*
     * ⚠ BE (`spawn_inspection_images`) trả cột `image_url` — không có
     *   `secure_url` ⇒ phải fallback về `image_url` để ảnh hiển thị được.
     */
    secure_url: pickString(obj, 'secure_url', 'secureUrl') ?? url,
    public_id: pickString(obj, 'public_id', 'publicId'),
    caption: pickString(obj, 'caption'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
  }
}

/** Chuẩn hoá response lịch sử kiểm tra phôi. */
export function normalizeInspectionHistory(
  raw: unknown,
): SpawnInspectionHistory {
  const obj = asRecord(raw) ?? {}
  return {
    session_id: pickNumber(obj, 'session_id', 'sessionId'),
    inspections: asArray(obj.inspections).map(normalizeInspection),
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Ép về object (null nếu không phải object / là mảng). */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

/** Ép về mảng (rỗng nếu không phải mảng). */
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
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
