import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  AdminCultivationSessionDto,
  AdminSessionTray,
  SessionHarvestStatus,
} from '../types/admin-session.types'
import { normalizeSessionStage, normalizeSessionStatus } from '../utils/session-state.utils'

/**
 * Chuẩn hoá 1 phiên từ `GET /api/cultivation-sessions/admin`.
 *
 * ⚠ BE join sẵn bảng `users` / `mushroom_types` / `rental_packages` /
 *   `orders` và lateral join `cultivation_progress` (record mới nhất) ⇒
 *   record đã phẳng, mọi field nullable.
 */
export function normalizeAdminSession(
  raw: unknown,
): AdminCultivationSessionDto {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    session_id: pickNumber(obj, 'session_id', 'sessionId', 'id') ?? 0,
    order_item_id: pickNumber(obj, 'order_item_id', 'orderItemId'),
    order_id: pickNumber(obj, 'order_id', 'orderId'),
    user_id: pickNumber(obj, 'user_id', 'userId'),
    customer_name: pickString(obj, 'customer_name', 'customerName'),
    customer_email: pickString(obj, 'customer_email', 'customerEmail'),
    mushroom_type_id: pickNumber(obj, 'mushroom_type_id', 'mushroomTypeId'),
    mushroom_name: pickString(obj, 'mushroom_name', 'mushroomName'),
    package_id: pickNumber(obj, 'package_id', 'packageId'),
    package_name: pickString(obj, 'package_name', 'packageName'),
    tray_quantity: pickNumber(obj, 'tray_quantity', 'trayQuantity', 'tray_count'),
    spawn_quantity: pickNumber(obj, 'spawn_quantity', 'spawnQuantity'),
    start_at: pickString(obj, 'start_at', 'start_date', 'startDate'),
    end_at: pickString(obj, 'end_at', 'end_date', 'endDate'),
    duration_days: pickNumber(obj, 'duration_days', 'durationDays'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
    updated_at: pickString(obj, 'updated_at', 'updatedAt'),
    harvest_date: pickString(
      obj,
      'harvest_date',
      'expected_harvest_date',
      'expectedHarvestDate',
    ),
    status: normalizeSessionStatus(obj.status),
    harvest_status: pickHarvestStatus(obj),
    current_stage: normalizeSessionStage(obj),
    growth_status: normalizeSessionStage(obj),
    progress_percent: pickNumber(
      obj,
      'progress_percent',
      'progressPercent',
      'progress',
    ),
    condition: pickString(obj, 'condition'),
    notes: pickString(obj, 'notes', 'description'),
    harvest_ready: pickBoolean(obj, 'harvest_ready', 'harvestReady'),
    harvest_ready_at: pickString(obj, 'harvest_ready_at', 'harvestReadyAt'),
    progress_updated_at: pickString(
      obj,
      'progress_updated_at',
      'progressUpdatedAt',
    ),
    trays: ensureArray<unknown>(obj.trays ?? obj.session_trays).map(
      normalizeAdminTray,
    ),
  }
}

/** Chuẩn hoá 1 khay được gán cho phiên. */
function normalizeAdminTray(raw: unknown): AdminSessionTray {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    session_tray_id: pickNumber(obj, 'session_tray_id', 'sessionTrayId'),
    tray_id: pickNumber(obj, 'tray_id', 'trayId'),
    tray_code: pickString(obj, 'tray_code', 'trayCode', 'code'),
    tray_name: pickString(obj, 'tray_name', 'trayName', 'name'),
    room_id: pickNumber(obj, 'room_id', 'roomId'),
    room_name: pickString(obj, 'room_name', 'roomName'),
    floor_id: pickNumber(obj, 'floor_id', 'floorId'),
    floor_name: pickString(obj, 'floor_name', 'floorName'),
    floor_number: pickNumber(obj, 'floor_number', 'floorNumber'),
    assignment_status: pickString(
      obj,
      'assignment_status',
      'assignmentStatus',
      'status',
    ),
    assigned_at: pickString(obj, 'assigned_at', 'assignedAt'),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Trạng thái phiên — chỉ nhận 9 giá trị hợp lệ của BE. */
/** Trạng thái thu hoạch — BE chỉ dùng `NOT_READY` / `HARVEST_READY`. */
function pickHarvestStatus(
  obj: Record<string, unknown>,
): SessionHarvestStatus | null {
  const status = pickString(obj, 'harvest_status', 'harvestStatus')?.toUpperCase()
  if (status === 'HARVEST_READY') return 'HARVEST_READY'
  if (status === 'NOT_READY') return 'NOT_READY'
  return null
}

/** Giai đoạn sinh trưởng — chỉ nhận 4 giá trị hợp lệ của BE. */
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

function pickBoolean(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return false
}
