/**
 * Nhật ký hoạt động thiết bị IoT của phiên canh tác — DTO **read-only**.
 *
 * ⚠ **Nguồn**: `GET /api/iot/floors/{floorId}/auto-control/logs`
 *   (bảng `iot_auto_control_logs` của BE).
 *
 * ## Vì sao không dùng `/iot-history` nữa?
 *
 * ⚠ BE đã **gỡ bỏ** `GET /api/cultivation-sessions/admin/{sessionId}/iot-history`
 *   (commit `4e136253`) ⇒ trả **404**. Nhật ký quyết định của hệ thống tưới
 *   phun tự động nay nằm ở `iot_auto_control_logs`, đọc **theo tầng** ⇒ ta gộp
 *   log của các tầng thuộc phiên rồi lọc theo khoảng thời gian của phiên.
 */

/**
 * Loại sự kiện trong nhật ký auto-control.
 *
 * ⚠ Giá trị thực tế BE ghi vào `iot_auto_control_logs.event_type`:
 *   `DECISION`, `START`, `STOP`, `ON_REQUESTED`, `OFF_REQUESTED`,
 *   `PULSE_RESERVED`, `OFF_CONFIRMED`, `RETRY_WAIT`, `CONFIG_SAVED`, `FAULT`,
 *   `MANUAL_OVERRIDE`, `AUTO_PAUSED`, `INTERRUPTION_STOP`.
 */
export type SessionDeviceEventType =
  | 'DECISION'
  | 'START'
  | 'STOP'
  | 'ON_REQUESTED'
  | 'OFF_REQUESTED'
  | 'PULSE_RESERVED'
  | 'OFF_CONFIRMED'
  | 'RETRY_WAIT'
  | 'CONFIG_SAVED'
  | 'FAULT'
  | 'MANUAL_OVERRIDE'
  | 'AUTO_PAUSED'
  | 'INTERRUPTION_STOP'

/**
 * Một dòng nhật ký thiết bị (đã chuẩn hoá từ `iot_auto_control_logs`).
 *
 * ⚠ Tên field giữ **snake_case** cho khớp phần còn lại của module
 *   `features/sessions`.
 */
export interface SessionDeviceEvent {
  /** `iot_auto_control_logs.id`. */
  event_id: number | null
  /** Tầng phát sinh sự kiện. */
  floor_id: number | null
  /** Loại sự kiện — xem `SessionDeviceEventType`. */
  event_type: SessionDeviceEventType | null
  /** Mô tả / lý do của quyết định (tiếng Việt, do BE sinh). */
  reason: string | null
  /** Thời điểm ghi nhận (ISO 8601). */
  created_at: string | null
  /** Lệnh SSR được phát sinh (nếu có). */
  command_id: string | null
  /** Nhiệt độ trung bình tại thời điểm ghi nhận (°C). */
  average_temperature: number | null
  /** Độ ẩm trung bình tại thời điểm ghi nhận (%RH). */
  average_humidity: number | null
  /**
   * Snapshot cảm biến tại thời điểm quyết định (BE lưu JSON string).
   *
   * ⚠ BE chỉ ghi snapshot cho **một số** loại sự kiện (`DECISION`,
   *   `PULSE_RESERVED`, `FAULT`) ⇒ có thể `null`.
   *
   * ⚠ Dùng làm **fallback** khi `average_temperature` / `average_humidity`
   *   không có (BE chỉ ghi cột nhiệt độ từ migration 012).
   */
  sensor_values_json: unknown
}

/** Query cho nhật ký thiết bị. */
export interface SessionDeviceActivityQuery {
  /** Chỉ lấy log trong cửa sổ này (epoch ms) — mặc định lấy hết. */
  from?: number
  /** Cuối cửa sổ (epoch ms). */
  to?: number
}
