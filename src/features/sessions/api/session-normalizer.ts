import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type { CultivationSession, SessionTray } from '../types/session.types'
export function normalizeSession(raw: unknown): CultivationSession {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    session_id: pickNumber(obj, 'session_id', 'sessionId', 'id') ?? 0,
    harvest_status: pickString(obj, 'harvest_status'),
    order_item_id: pickNumber(obj, 'order_item_id'),
    spawn_quantity: pickNumber(obj, 'spawn_quantity'),
    last_inspected_at: pickString(obj, 'last_inspected_at'),
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
    start_date: pickString(obj, 'start_at', 'start_date', 'startDate'),
    end_date: pickString(obj, 'end_date', 'endDate'),
    expected_harvest_date: pickString(
      obj,
      'harvest_date',
      'expected_harvest_date',
      'expectedHarvestDate',
    ),
    tray_count: pickNumber(obj, 'tray_quantity', 'tray_count', 'trayCount', 'trays_count'),
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
