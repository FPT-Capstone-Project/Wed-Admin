/**
 * Từ điển nhãn dùng chung — **tham chiếu chéo & thông báo**.
 *
 * ⚠ Bao gồm các enum **không thuộc 1 miền nghiệp vụ cụ thể** nhưng lại xuất
 *   hiện ở nhiều nơi:
 *   - `reference_type` của thông báo / cảnh báo (trỏ tới đối tượng khác).
 *   - `notification_type` của BE.
 *   - Mức độ / nhóm / nguồn cảnh báo vận hành.
 *   - Trạng thái gói thuê (`rental_packages.status`).
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** Loại tham chiếu chéo (`notifications.reference_type`). */
export type ReferenceTypeKey =
  | 'CULTIVATION_SESSION'
  | 'ORDER'
  | 'HARVEST'
  | 'ISSUE'
  | 'NOTIFICATION'
  | 'IOT_AUTO_CONTROL_LOG'
  | 'DEVICE'
  | 'TRAY'

/** Loại thông báo của BE (`notifications.notification_type`). */
export type NotificationTypeKey =
  | 'CULTIVATION_STARTED'
  | 'CULTIVATION_PROGRESS'
  | 'CULTIVATION_COMPLETED'
  | 'CULTIVATION_CANCELLED'
  | 'CULTIVATION_STATUS'
  | 'MUSHROOM_DISEASE'
  | 'DEVICE_ISSUE'
  | 'SENSOR_ALERT'
  | 'MICROCLIMATE_ALERT'
  | 'OPERATOR_MESSAGE'
  | 'PAYMENT_STATUS'
  | 'PAYMENT_REFUND_REQUIRED'

/** Mức độ cảnh báo vận hành. */
export type AlertSeverityKey = 'CRITICAL' | 'WARNING' | 'INFO'

/** Nhóm cảnh báo vận hành. */
export type AlertCategoryKey =
  | 'AUTO_CONTROL_FAULT'
  | 'DEVICE_OFFLINE'
  | 'SENSOR_FAULT'
  | 'RETRY_WAIT'
  | 'MUSHROOM_DISEASE'
  | 'DEVICE_ISSUE'
  | 'SENSOR_ALERT'
  | 'MICROCLIMATE_ALERT'
  | 'IOT_ALERT'
  | 'OPERATOR_MESSAGE'

/** Nguồn phát sinh cảnh báo. */
export type AlertSourceKey = 'IOT_AUTO_CONTROL' | 'NOTIFICATION'

/**
 * Loại tham chiếu chéo — dùng để dựng link "Phiên #12" / "Đơn #34".
 *
 * ⚠ `neutral` vì đây là **metadata**, không phải trạng thái sức khoẻ.
 */
export const REFERENCE_TYPE_DICTIONARY: Record<
  ReferenceTypeKey,
  StatusPresentation
> = {
  CULTIVATION_SESSION: { tone: 'neutral', label: 'Phiên canh tác' },
  ORDER: { tone: 'neutral', label: 'Đơn hàng' },
  HARVEST: { tone: 'neutral', label: 'Vụ thu hoạch' },
  ISSUE: { tone: 'neutral', label: 'Sự cố' },
  NOTIFICATION: { tone: 'neutral', label: 'Thông báo' },
  IOT_AUTO_CONTROL_LOG: { tone: 'neutral', label: 'Nhật ký tự động hoá' },
  DEVICE: { tone: 'neutral', label: 'Thiết bị' },
  TRAY: { tone: 'neutral', label: 'Khay' },
}

/** Loại thông báo của BE. */
export const NOTIFICATION_TYPE_DICTIONARY: StatusDictionary = {
  CULTIVATION_STARTED: { tone: 'info', label: 'Bắt đầu canh tác' },
  CULTIVATION_PROGRESS: { tone: 'info', label: 'Tiến độ canh tác' },
  CULTIVATION_COMPLETED: { tone: 'success', label: 'Hoàn thành canh tác' },
  CULTIVATION_CANCELLED: { tone: 'danger', label: 'Hủy canh tác' },
  CULTIVATION_STATUS: { tone: 'info', label: 'Cập nhật trạng thái canh tác' },
  MUSHROOM_DISEASE: { tone: 'warning', label: 'Nấm bệnh / mốc' },
  DEVICE_ISSUE: { tone: 'danger', label: 'Sự cố cảm biến & thiết bị' },
  SENSOR_ALERT: { tone: 'danger', label: 'Cảnh báo cảm biến' },
  MICROCLIMATE_ALERT: { tone: 'warning', label: 'Cảnh báo vi khí hậu' },
  OPERATOR_MESSAGE: { tone: 'neutral', label: 'Thông báo từ nhân viên' },
  PAYMENT_STATUS: { tone: 'info', label: 'Trạng thái thanh toán' },
  PAYMENT_REFUND_REQUIRED: { tone: 'warning', label: 'Cần hoàn tiền đơn hàng' },
}

/**
 * Mức độ cảnh báo vận hành.
 *
 * ⚾ `CRITICAL` = đỏ, `WARNING` = vàng, `INFO` = xanh dương — thứ bậc thị
 *   giác: đỏ (khẩn cấp) > vàng (cần xem) > xanh dương (thông thường).
 */
export const ALERT_SEVERITY_DICTIONARY: Record<
  AlertSeverityKey,
  StatusPresentation
> = {
  CRITICAL: { tone: 'danger', label: 'Nghiêm trọng' },
  WARNING: { tone: 'warning', label: 'Cảnh báo' },
  INFO: { tone: 'info', label: 'Thông tin' },
}

/** Nhóm cảnh báo vận hành. */
export const ALERT_CATEGORY_DICTIONARY: Record<
  AlertCategoryKey,
  StatusPresentation
> = {
  AUTO_CONTROL_FAULT: { tone: 'danger', label: 'Lỗi hệ thống tưới tự động' },
  DEVICE_OFFLINE: { tone: 'danger', label: 'Thiết bị mất kết nối' },
  SENSOR_FAULT: { tone: 'danger', label: 'Cảm biến bất thường' },
  RETRY_WAIT: { tone: 'warning', label: 'Tạm dừng do lỗi cảm biến' },
  MUSHROOM_DISEASE: { tone: 'warning', label: 'Nấm bệnh / mốc' },
  DEVICE_ISSUE: { tone: 'danger', label: 'Sự cố thiết bị' },
  SENSOR_ALERT: { tone: 'danger', label: 'Cảnh báo cảm biến' },
  MICROCLIMATE_ALERT: { tone: 'warning', label: 'Cảnh báo vi khí hậu' },
  IOT_ALERT: { tone: 'danger', label: 'Cảnh báo thiết bị & vi khí hậu' },
  OPERATOR_MESSAGE: { tone: 'neutral', label: 'Thông báo từ nhân viên' },
}

/** Nguồn phát sinh cảnh báo. */
export const ALERT_SOURCE_DICTIONARY: Record<
  AlertSourceKey,
  StatusPresentation
> = {
  IOT_AUTO_CONTROL: { tone: 'neutral', label: 'Nhật ký IoT' },
  NOTIFICATION: { tone: 'neutral', label: 'Thông báo hệ thống' },
}

/**
 * Trạng thái gói thuê.
 *
 * ⚠ Nhãn khớp với màn hình "Gói thuê" (`pages/packages`) — 1 nguồn sự thật.
 *
 * ⚠ **Re-export** từ `./package` để không có 2 bảng trùng nhau (2.C).
 */
export { PACKAGE_STATUS_DICTIONARY } from './package'
export type { PackageStatusKey } from './package'
