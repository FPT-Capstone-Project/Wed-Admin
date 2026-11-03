/**
 * Cảnh báo vận hành (Operational Alert) — DTO **read-only** cho Web Admin.
 *
 * ⚠ Đây là model **thống nhất**, gộp 2 nguồn dữ liệu thật:
 *
 *   1. `GET /api/iot/floors/{floorId}/auto-control/logs`
 *      → sự kiện lỗi/bất thường của hệ thống tưới phun sương tự động
 *        (`FAULT`, `SENSOR_FAULT`, `DEVICE_OFFLINE`, `RETRY_WAIT`, ...).
 *
 *   2. `GET /api/notifications`
 *      → thông báo nghiệp vụ (`MUSHROOM_DISEASE`, `DEVICE_ISSUE`,
 *        `OPERATOR_MESSAGE`) do hệ thống/nhân viên phát sinh.
 *
 * Trước đây trang `/alerts` dùng `useAlertStore` (mock). Nay toàn bộ dữ liệu
 * đến từ API thật ⇒ **không có** cờ `isAcknowledged` / `acknowledgedBy`
 * vì BE không cung cấp endpoint xác nhận xử lý cho Admin.
 */

/** Mức độ cảnh báo. */
export type OperationalAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

/**
 * Nguồn phát sinh cảnh báo.
 *
 * - `IOT_AUTO_CONTROL` → nhật ký auto-misting của tầng.
 * - `NOTIFICATION`     → thông báo từ BE.
 */
export type OperationalAlertSource = 'IOT_AUTO_CONTROL' | 'NOTIFICATION'

/**
 * Nhóm cảnh báo — dùng cho bộ lọc.
 *
 * ⚠ `AUTO_CONTROL` là nhóm mới (thay cho các nhóm mock trước đây như
 *   `TEMPERATURE` / `HUMIDITY` / `DEVICE_OFFLINE` / `HARDWARE_FAULT` vốn không
 *   có dữ liệu thật nào từ BE).
 */
export type OperationalAlertCategory =
  | 'AUTO_CONTROL_FAULT'
  | 'DEVICE_OFFLINE'
  | 'SENSOR_FAULT'
  | 'RETRY_WAIT'
  | 'MUSHROOM_DISEASE'
  | 'DEVICE_ISSUE'
  | 'OPERATOR_MESSAGE'

/** Bộ lọc trạng thái đọc. */
export type AlertReadFilter = 'ALL' | 'UNREAD' | 'READ'

/** Một cảnh báo đã chuẩn hoá (từ cả 2 nguồn). */
export interface OperationalAlert {
  /** ID ổn định, duy nhất theo nguồn — vd `iot:123`, `notif:45`. */
  id: string
  source: OperationalAlertSource
  category: OperationalAlertCategory
  severity: OperationalAlertSeverity
  /** Tiêu đề ngắn. */
  title: string
  /** Mô tả chi tiết. */
  message: string
  /** Tầng liên quan (nếu có). */
  floorId: number | null
  floorName: string | null
  /** Master / node liên quan (nếu có). */
  deviceId: string | null
  /** Thời điểm xảy ra (ISO). */
  timestamp: string | null
  /** Chỉ có ý nghĩa với nguồn `NOTIFICATION`. */
  isRead: boolean
  /** Giá trị đo được tại thời điểm sự kiện (độ ẩm TB). */
  currentValue: number | null
  /** Ngưỡng liên quan — BE có thể không trả. */
  thresholdValue: number | null
  /** ID tham chiếu (session / notification). */
  referenceId: number | null
  referenceType: string | null
}
