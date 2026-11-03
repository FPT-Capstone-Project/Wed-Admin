import { autoMistingApi } from '../../devices/api/iot.api'
import { notificationApi } from '../../notifications/api/notification.api'
import { OPERATIONAL_NOTIFICATION_TYPES } from '../../notifications/types/notification.types'
import type { AutoControlLogEntry, CultivationFloorMapping } from '../../../types/iot'
import type {
  OperationalAlert,
  OperationalAlertCategory,
  OperationalAlertSeverity,
} from '../types/alert.types'

/**
 * Alert service — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *
 * Gộp 2 nguồn thật:
 *   1. Nhật ký auto-control của tầng → sự kiện lỗi/bất thường.
 *   2. Thông báo nghiệp vụ (`MUSHROOM_DISEASE`, `DEVICE_ISSUE`,
 *      `OPERATOR_MESSAGE`).
 */

/**
 * Sự kiện auto-control được coi là **cảnh báo**.
 *
 * BE trả đủ các loại sự kiện (DECISION, START, STOP, ON_REQUESTED,
 * OFF_REQUESTED, PULSE_RESERVED, OFF_CONFIRMED, RETRY_WAIT, CONFIG_SAVED,
 * FAULT, MANUAL_OVERRIDE). Chỉ những loại thể hiện **bất thường** mới được
 * đưa vào trang cảnh báo.
 */
const ALERT_EVENT_TYPES: ReadonlySet<string> = new Set([
  'FAULT',
  'SENSOR_FAULT',
  'DEVICE_OFFLINE',
  'RETRY_WAIT',
  'MANUAL_OVERRIDE',
])

/** Ánh xạ `event_type` → mức độ. */
const EVENT_SEVERITY: Record<string, OperationalAlertSeverity> = {
  FAULT: 'CRITICAL',
  SENSOR_FAULT: 'CRITICAL',
  DEVICE_OFFLINE: 'CRITICAL',
  RETRY_WAIT: 'WARNING',
  MANUAL_OVERRIDE: 'INFO',
}

/** Ánh xạ `event_type` → nhóm cảnh báo. */
const EVENT_CATEGORY: Record<string, OperationalAlertCategory> = {
  FAULT: 'AUTO_CONTROL_FAULT',
  SENSOR_FAULT: 'SENSOR_FAULT',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  RETRY_WAIT: 'RETRY_WAIT',
  MANUAL_OVERRIDE: 'AUTO_CONTROL_FAULT',
}

/** Ánh xạ `notification_type` → nhóm cảnh báo. */
const NOTIFICATION_CATEGORY: Record<string, OperationalAlertCategory> = {
  MUSHROOM_DISEASE: 'MUSHROOM_DISEASE',
  DEVICE_ISSUE: 'DEVICE_ISSUE',
  OPERATOR_MESSAGE: 'OPERATOR_MESSAGE',
}

/** Ánh xạ `notification_type` → mức độ. */
const NOTIFICATION_SEVERITY: Record<string, OperationalAlertSeverity> = {
  MUSHROOM_DISEASE: 'CRITICAL',
  DEVICE_ISSUE: 'WARNING',
  OPERATOR_MESSAGE: 'INFO',
}

/** Tên tiếng Việt của `event_type`. */
const EVENT_LABELS: Record<string, string> = {
  FAULT: 'Lỗi hệ thống tưới tự động',
  SENSOR_FAULT: 'Cảm biến bất thường',
  DEVICE_OFFLINE: 'Thiết bị mất kết nối',
  RETRY_WAIT: 'Tạm dừng do lỗi cảm biến',
  MANUAL_OVERRIDE: 'Ghi đè thủ công',
}

/** Tên tiếng Việt của `notification_type`. */
const NOTIFICATION_LABELS: Record<string, string> = {
  MUSHROOM_DISEASE: 'Cảnh báo nấm bệnh',
  DEVICE_ISSUE: 'Sự cố thiết bị',
  OPERATOR_MESSAGE: 'Thông báo từ nhân viên',
}

export interface AlertFloorContext {
  floorId: number
  floorName: string
  masterId: string | null
}

export interface BuildAlertsInput {
  /** Nhật ký auto-control, đã gom từ nhiều tầng. */
  logs: Array<{ floorId: number; entries: AutoControlLogEntry[] }>
  /** Danh sách tầng để tra tên tầng. */
  floors: CultivationFloorMapping[]
  /** Thông báo nghiệp vụ đã lọc theo nhóm vận hành. */
  notifications: Array<{
    notification_id: number
    notification_type: string
    title: string | null
    message: string | null
    is_read: boolean
    created_at: string | null
    reference_type: string | null
    reference_id: number | null
  }>
}

export interface BuiltAlerts {
  alerts: OperationalAlert[]
  /** Đếm số cảnh báo theo nguồn — dùng cho StatCard. */
  counts: {
    total: number
    critical: number
    warning: number
    info: number
    unread: number
    fromIot: number
    fromNotifications: number
  }
}

/**
 * Chuẩn hoá toàn bộ nguồn dữ liệu thật thành danh sách cảnh báo thống nhất.
 */
export function buildOperationalAlerts(
  input: BuildAlertsInput,
): BuiltAlerts {
  const floorById = new Map<number, CultivationFloorMapping>()
  for (const floor of input.floors) {
    if (typeof floor.floor_id === 'number') {
      floorById.set(floor.floor_id, floor)
    }
  }

  const alerts: OperationalAlert[] = []

  // ── 1. Nhật ký auto-control ───────────────────────────────────────────
  for (const { floorId, entries } of input.logs) {
    const floor = floorById.get(floorId)
    const floorName = floor?.floor_name ?? `Tầng ${floor?.floor_number ?? floorId}`

    for (const entry of entries) {
      const eventType = (entry.event_type ?? '').toUpperCase()
      if (!ALERT_EVENT_TYPES.has(eventType)) continue

      alerts.push({
        id: `iot:${floorId}:${entry.id ?? `${eventType}-${entry.created_at ?? ''}`}`,
        source: 'IOT_AUTO_CONTROL',
        category: EVENT_CATEGORY[eventType] ?? 'AUTO_CONTROL_FAULT',
        severity: EVENT_SEVERITY[eventType] ?? 'WARNING',
        title: EVENT_LABELS[eventType] ?? eventType,
        message:
          entry.reason ??
          entry.safety_blocked_reason ??
          `Sự kiện ${eventType} được ghi nhận tại ${floorName}.`,
        floorId,
        floorName,
        deviceId: floor?.master_id != null ? String(floor.master_id) : null,
        timestamp: entry.created_at ?? null,
        isRead: true,
        currentValue: entry.average_humidity ?? null,
        thresholdValue: null,
        referenceId: entry.id ?? null,
        referenceType: 'IOT_AUTO_CONTROL_LOG',
      })
    }
  }

  // ── 2. Thông báo nghiệp vụ ────────────────────────────────────────────
  for (const notification of input.notifications) {
    const type = (notification.notification_type ?? '').toUpperCase()
    if (!OPERATIONAL_NOTIFICATION_TYPES.includes(type)) continue

    alerts.push({
      id: `notif:${notification.notification_id}`,
      source: 'NOTIFICATION',
      category: NOTIFICATION_CATEGORY[type] ?? 'OPERATOR_MESSAGE',
      severity: NOTIFICATION_SEVERITY[type] ?? 'INFO',
      title: notification.title ?? NOTIFICATION_LABELS[type] ?? type,
      message:
        notification.message ??
        notification.title ??
        'Thông báo từ hệ thống.',
      floorId: null,
      floorName: null,
      deviceId: null,
      timestamp: notification.created_at ?? null,
      isRead: notification.is_read,
      currentValue: null,
      thresholdValue: null,
      referenceId: notification.reference_id ?? notification.notification_id,
      referenceType: notification.reference_type ?? 'NOTIFICATION',
    })
  }

  // Mới nhất trước.
  alerts.sort(
    (left, right) =>
      new Date(right.timestamp ?? 0).getTime() -
      new Date(left.timestamp ?? 0).getTime(),
  )

  return {
    alerts,
    counts: {
      total: alerts.length,
      critical: alerts.filter((alert) => alert.severity === 'CRITICAL').length,
      warning: alerts.filter((alert) => alert.severity === 'WARNING').length,
      info: alerts.filter((alert) => alert.severity === 'INFO').length,
      unread: alerts.filter((alert) => !alert.isRead).length,
      fromIot: alerts.filter((alert) => alert.source === 'IOT_AUTO_CONTROL').length,
      fromNotifications: alerts.filter(
        (alert) => alert.source === 'NOTIFICATION',
      ).length,
    },
  }
}

/**
 * Tải nhật ký auto-control của nhiều tầng.
 *
 * ⚠ Chỉ gọi endpoint **read-only** `GET /api/iot/floors/{floorId}/auto-control/logs`.
 */
export async function fetchAutoControlLogs(
  floorIds: number[],
  limit = 100,
): Promise<Array<{ floorId: number; entries: AutoControlLogEntry[] }>> {
  const results = await Promise.all(
    floorIds.map(async (floorId) => {
      try {
        const response = await autoMistingApi.getAutoControlLogs(floorId, {
          limit,
          offset: 0,
        })
        return { floorId, entries: response?.logs ?? [] }
      } catch {
        // Một tầng lỗi không được làm hỏng cả trang → bỏ qua tầng đó.
        return { floorId, entries: [] }
      }
    }),
  )

  return results
}

/**
 * Tải thông báo nghiệp vụ liên quan vận hành.
 */
export async function fetchOperationalNotifications(pageSize = 50) {
  const result = await notificationApi.list({ page: 1, pageSize })
  return result.items.filter((item) =>
    OPERATIONAL_NOTIFICATION_TYPES.includes(
      (item.notification_type ?? '').toUpperCase(),
    ),
  )
}
