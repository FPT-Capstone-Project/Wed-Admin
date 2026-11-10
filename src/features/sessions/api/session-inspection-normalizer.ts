/**
 * Chuẩn hoá response kiểm tra khay — **hàm thuần**, không phụ thuộc axios.
 *
 * ⚠ Tách riêng khỏi `session-inspection.api.ts` để:
 *   1. Test được bằng Node test runner (không cần mock axios).
 *   2. API layer chỉ lo gọi mạng; logic chuẩn hoá nằm 1 nơi.
 *
 * ⚠ Module này **không import runtime** từ module khác ⇒ chạy được trong
 *   Node test runner (`--experimental-strip-types`) mà không cần loader.
 */
import type {
  DailyInspection,
  DailyInspectionImage,
  DailyInspectionSessionInfo,
  DailyInspectionTrayInfo,
} from '../types/session-inspection.types'

/** Chuẩn hoá 1 lần kiểm tra khay + ảnh kèm theo. */
export function normalizeDailyInspection(raw: unknown): DailyInspection {
  const obj = asRecord(raw) ?? {}

  return {
    inspection_id: pickNumber(obj, 'inspection_id', 'inspectionId', 'id') ?? 0,
    session_tray_id: pickNumber(obj, 'session_tray_id', 'sessionTrayId'),
    tray_id: pickNumber(obj, 'tray_id', 'trayId'),
    tray_code: pickString(obj, 'tray_code', 'trayCode'),
    tray_name: pickString(obj, 'tray_name', 'trayName'),
    assignment_status: pickString(obj, 'assignment_status', 'assignmentStatus'),
    inspection_date: pickString(obj, 'inspection_date', 'inspectionDate'),
    growth_stage: pickString(obj, 'growth_stage', 'growthStage'),
    growth_progress: pickNumber(obj, 'growth_progress', 'growthProgress'),
    tray_condition: pickString(obj, 'tray_condition', 'trayCondition'),
    mushroom_condition: pickString(
      obj,
      'mushroom_condition',
      'mushroomCondition',
    ),
    notes: pickString(obj, 'notes'),
    inspected_by: pickNumber(obj, 'inspected_by', 'inspectedBy'),
    inspected_by_name: pickString(obj, 'inspected_by_name', 'inspectedByName'),
    images: asArray(obj.images ?? obj.image_urls).map(
      normalizeDailyInspectionImage,
    ),
  }
}

/** Chuẩn hoá 1 ảnh kiểm tra khay. */
export function normalizeDailyInspectionImage(
  raw: unknown,
): DailyInspectionImage {
  const obj = asRecord(raw) ?? {}
  return {
    image_id: pickNumber(obj, 'image_id', 'imageId', 'id'),
    image_url: pickString(obj, 'image_url', 'imageUrl', 'url', 'secure_url'),
    caption: pickString(obj, 'caption'),
    uploaded_at: pickString(obj, 'uploaded_at', 'uploadedAt', 'created_at'),
  }
}

/** Chuẩn hoá thông tin phiên đi kèm (response cấp session). */
export function normalizeDailyInspectionSession(
  raw: unknown,
): DailyInspectionSessionInfo | null {
  const obj = asRecord(raw)
  if (!obj) return null
  return {
    session_id: pickNumber(obj, 'session_id', 'sessionId'),
    start_at: pickString(obj, 'start_at', 'startAt'),
    end_at: pickString(obj, 'end_at', 'endAt'),
    status: pickString(obj, 'status'),
  }
}

/** Chuẩn hoá thông tin gán khay đi kèm (response cấp khay). */
export function normalizeDailyInspectionTray(
  raw: unknown,
): DailyInspectionTrayInfo | null {
  const obj = asRecord(raw)
  if (!obj) return null
  return {
    session_tray_id: pickNumber(obj, 'session_tray_id', 'sessionTrayId'),
    session_id: pickNumber(obj, 'session_id', 'sessionId'),
    tray_id: pickNumber(obj, 'tray_id', 'trayId'),
    assignment_status: pickString(obj, 'assignment_status', 'assignmentStatus'),
    tray_code: pickString(obj, 'tray_code', 'trayCode'),
    tray_name: pickString(obj, 'tray_name', 'trayName'),
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
