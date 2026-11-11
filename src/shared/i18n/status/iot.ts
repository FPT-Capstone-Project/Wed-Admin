/**
 * Từ điển trạng thái — **IoT / thiết bị / tự động hoá**.
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái master (`online` / `offline`).
 *   - Trạng thái tầng (`FloorStatus`).
 *   - Trạng thái rơ-le (`ON` / `OFF`).
 *   - Trạng thái điều khiển của thuật toán tưới (`control_state`).
 *   - Trạng thái phiên chạy tự động (`run.status`).
 *   - Loại sự kiện nhật ký tự động hoá (`event_type`).
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** Trạng thái bộ điều khiển trung tâm (`IotMaster.reportedStatus`). */
export type MasterStatusKey = 'online' | 'offline'

/** Trạng thái tầng (`cultivation_floors.status`). */
export type FloorStatusKey = 'ACTIVE' | 'INACTIVE'

/** Trạng thái rơ-le (`desired_state` / `reported_state`). */
export type SsrStateKey = 'ON' | 'OFF'

/**
 * Trạng thái thuật toán tưới tự động (`AutoControlRuntime.control_state`).
 *
 * ⚠ ENUM trong DB — dùng để biết đang chờ OFF hay đang tưới.
 */
export type ControlStateKey =
  | 'DISABLED'
  | 'IDLE'
  | 'ON_REQUESTED'
  | 'MISTING'
  | 'OFF_PENDING'
  | 'COOLDOWN'
  | 'SENSOR_FAULT'
  | 'DEVICE_OFFLINE'
  | 'FAULT'

/** Trạng thái phiên chạy tự động (`iot_auto_control_runs.status`). */
export type AutoControlRunStatusKey = 'RUNNING' | 'STOPPED' | 'FAULT'

/** Trạng thái lệnh rơ-le thủ công (`IotCommand.status`). */
export type IotCommandStatusKey =
  | 'PENDING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'TIMED_OUT'

/**
 * Tình trạng số đo của cảm biến (`IotSensor.ok`).
 *
 * ⚠ BE trả **boolean** (`true` / `false`) ⇒ chuẩn hoá sang 2 khoá này trước
 *   khi tra cứu (xem `presentStatus` trong `registry.ts`).
 */
export type SensorValidityKey = 'VALID' | 'INVALID'

/**
 * Trạng thái master.
 *
 * ⚠ `offline` dùng tone `danger` — mất kết nối là lỗi vận hành cần xử lý.
 */
export const MASTER_STATUS_DICTIONARY: Record<MasterStatusKey, StatusPresentation> =
  {
    online: { tone: 'ok', label: 'Đang hoạt động' },
    offline: { tone: 'danger', label: 'Mất kết nối' },
  }

/** Trạng thái tầng. */
export const FLOOR_STATUS_DICTIONARY: Record<
  FloorStatusKey,
  StatusPresentation
> = {
  ACTIVE: { tone: 'ok', label: 'Đang hoạt động' },
  INACTIVE: { tone: 'muted', label: 'Ngưng hoạt động' },
}

/** Trạng thái rơ-le. */
export const SSR_STATE_DICTIONARY: Record<SsrStateKey, StatusPresentation> = {
  ON: { tone: 'ok', label: 'Đang mở' },
  OFF: { tone: 'muted', label: 'Đang đóng' },
}

/**
 * Trạng thái thuật toán tưới tự động.
 *
 * ⚠ Phân biệt rõ:
 *   - `MISTING` / `ON_REQUESTED` → đang tưới (`info`).
 *   - `OFF_PENDING`             → đã yêu cầu đóng nhưng **chưa xác nhận**
 *     (`warning`) — đây là trạng thái "chờ", KHÔNG phải "đã đóng".
 *   - `SENSOR_FAULT` / `DEVICE_OFFLINE` / `FAULT` → lỗi (`danger`).
 */
export const CONTROL_STATE_DICTIONARY: Record<
  ControlStateKey,
  StatusPresentation
> = {
  DISABLED: { tone: 'muted', label: 'Đã tắt' },
  IDLE: { tone: 'ok', label: 'Đang chờ' },
  ON_REQUESTED: { tone: 'info', label: 'Đang yêu cầu tưới' },
  MISTING: { tone: 'info', label: 'Đang phun sương' },
  OFF_PENDING: { tone: 'warning', label: 'Chờ xác nhận đóng van' },
  COOLDOWN: { tone: 'neutral', label: 'Đang nghỉ giữa hai lần tưới' },
  SENSOR_FAULT: { tone: 'danger', label: 'Lỗi cảm biến' },
  DEVICE_OFFLINE: { tone: 'danger', label: 'Thiết bị mất kết nối' },
  FAULT: { tone: 'danger', label: 'Lỗi hệ thống' },
}

/** Trạng thái phiên chạy tự động. */
export const AUTO_CONTROL_RUN_STATUS_DICTIONARY: Record<
  AutoControlRunStatusKey,
  StatusPresentation
> = {
  RUNNING: { tone: 'ok', label: 'Đang chạy' },
  STOPPED: { tone: 'muted', label: 'Đã dừng' },
  FAULT: { tone: 'danger', label: 'Lỗi hệ thống' },
}

/** Trạng thái lệnh rơ-le thủ công. */
export const IOT_COMMAND_STATUS_DICTIONARY: Record<
  IotCommandStatusKey,
  StatusPresentation
> = {
  PENDING: { tone: 'warning', label: 'Đang chờ gửi' },
  PUBLISHED: { tone: 'info', label: 'Đã gửi lệnh' },
  FAILED: { tone: 'danger', label: 'Gửi thất bại' },
  TIMED_OUT: { tone: 'danger', label: 'Gửi quá hạn' },
}

/**
 * Tình trạng số đo của cảm biến.
 *
 * ⚠ `INVALID` dùng `warning` (chưa chắc hỏng hẳn) chứ không phải `danger`
 *   — số đo sai có thể do sai số cảm biến hoặc đang hiệu chuẩn.
 */
export const SENSOR_VALIDITY_DICTIONARY: Record<
  SensorValidityKey,
  StatusPresentation
> = {
  VALID: { tone: 'ok', label: 'Dữ liệu hợp lệ' },
  INVALID: { tone: 'warning', label: 'Sai số cảm biến' },
}

/** Hành động của quyết định tưới (`lastDecision.action`). */
export const AUTO_CONTROL_ACTION_DICTIONARY: StatusDictionary = {
  ON: { tone: 'ok', label: 'Mở van tưới' },
  OFF: { tone: 'muted', label: 'Đóng van tưới' },
  FAULT: { tone: 'danger', label: 'Lỗi hệ thống' },
  NONE: { tone: 'neutral', label: 'Không hành động' },
}

/**
 * Trạng thái phiên thuê (legacy `RentalSessionStatus` — dữ liệu lịch sử IoT).
 *
 * ⚠ Dùng **màu preset của antd** vì 2 chỗ dùng vẫn render bằng `Tag` của
 *   antd (`RentalHistoryTable`, `TrayIoTHistoryView`).
 */
export const RENTAL_SESSION_STATUS_DICTIONARY: StatusDictionary = {
  ACTIVE: { tone: 'ok', label: 'Đang vận hành' },
  COMPLETED: { tone: 'muted', label: 'Đã hoàn thành' },
  OVERDUE: { tone: 'danger', label: 'Quá hạn' },
}

/** Màu preset của antd tương ứng — dùng cho `Tag color`. */
export const RENTAL_SESSION_STATUS_ANTD_COLORS: Record<string, string> = {
  ACTIVE: 'success',
  COMPLETED: 'default',
  OVERDUE: 'error',
}

/**
 * Trạng thái phiên thuê theo **shape legacy** (`{ color, label }`).
 *
 * ⚠ Giữ lại để tương thích ngược với các `Tag color={...}` của antd đang
 *   tồn tại trong codebase (`RentalHistoryTable`, `TrayIoTHistoryView`).
 *   Màu ở đây là **preset của antd**, không phải tone ngữ nghĩa — dùng
 *   `RENTAL_SESSION_STATUS_DICTIONARY` cho badge mới.
 */
export interface RentalSessionLegacyOption {
  color: string
  label: string
}

/** Trạng thái phiên thuê — shape legacy `{ color, label }`. */
export const RENTAL_SESSION_STATUS_LEGACY_CONFIG: Record<
  string,
  RentalSessionLegacyOption
> = {
  ACTIVE: {
    color: RENTAL_SESSION_STATUS_ANTD_COLORS.ACTIVE,
    label: RENTAL_SESSION_STATUS_DICTIONARY.ACTIVE.label,
  },
  COMPLETED: {
    color: RENTAL_SESSION_STATUS_ANTD_COLORS.COMPLETED,
    label: RENTAL_SESSION_STATUS_DICTIONARY.COMPLETED.label,
  },
  OVERDUE: {
    color: RENTAL_SESSION_STATUS_ANTD_COLORS.OVERDUE,
    label: RENTAL_SESSION_STATUS_DICTIONARY.OVERDUE.label,
  },
}

/**
 * Loại sự kiện nhật ký tự động hoá (`iot_auto_control_logs.event_type`).
 *
 * ⚠ `DECISION` = "hệ thống đã đánh giá", **KHÔNG** phải "đã tưới" — sự
 *   kiện này được ghi cho MỌI lần đánh giá, kể cả khi kết luận là KHÔNG
 *   tưới. Vì vậy nhãn là "Đánh giá điều kiện".
 */
export const AUTO_CONTROL_EVENT_DICTIONARY: StatusDictionary = {
  DECISION: { tone: 'neutral', label: 'Đánh giá điều kiện' },
  START: { tone: 'ok', label: 'Bắt đầu phiên tự động' },
  STOP: { tone: 'muted', label: 'Dừng phiên tự động' },
  ON_REQUESTED: { tone: 'info', label: 'Yêu cầu mở van tưới' },
  OFF_REQUESTED: { tone: 'info', label: 'Yêu cầu đóng van tưới' },
  PULSE_RESERVED: { tone: 'info', label: 'Phun sương' },
  OFF_CONFIRMED: { tone: 'ok', label: 'Đã đóng van tưới' },
  RETRY_WAIT: { tone: 'warning', label: 'Tạm dừng — chờ thử lại' },
  CONFIG_SAVED: { tone: 'neutral', label: 'Lưu cấu hình' },
  FAULT: { tone: 'danger', label: 'Lỗi hệ thống' },
  OFF_FAILED: { tone: 'danger', label: 'Không đóng được van' },
  MANUAL_OVERRIDE: { tone: 'warning', label: 'Nhân viên ngắt tưới' },
}
