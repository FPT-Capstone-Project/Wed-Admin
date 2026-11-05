/**
 * Cấu hình hiển thị cho thông báo (Notification).
 *
 * ⚠ Nguồn **duy nhất** để render là `notification_type` của BE
 *   (`GET /api/notifications`) — KHÔNG suy đoán từ nội dung/tiêu đề.
 *
 *   Lý do: nội dung thông báo là text tự do do BE sinh (có thể tiếng Việt
 *   hoặc tiếng Anh) ⇒ bắt từ khoá regex sẽ gắn nhãn sai và khó bảo trì.
 *   Chỉ `notification_type` mới là phân loại **chính thức** của hệ thống.
 */
import type { NotificationType } from '../types/notification.types'

/** Nhãn tiếng Việt của từng loại thông báo. */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  CULTIVATION_STARTED: 'Bắt đầu canh tác',
  CULTIVATION_PROGRESS: 'Tiến độ canh tác',
  CULTIVATION_COMPLETED: 'Hoàn thành canh tác',
  CULTIVATION_CANCELLED: 'Hủy canh tác',
  MUSHROOM_DISEASE: 'Nấm bệnh / mốc',
  DEVICE_ISSUE: 'Sự cố cảm biến & thiết bị',
  OPERATOR_MESSAGE: 'Thông báo từ nhân viên',
  PAYMENT_STATUS: 'Trạng thái thanh toán',
}

/** Nhãn fallback khi BE trả type lạ (chưa có trong bảng). */
export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type
}

/**
 * Nhóm hiển thị của một thông báo — suy ra **trực tiếp từ `type` của BE**.
 *
 * - `iot`         → thiết bị & cảm biến IoT (`DEVICE_ISSUE`, `SENSOR_ALERT`).
 * - `cultivation` → canh tác & bệnh hại (`MUSHROOM_DISEASE`).
 * - `system`      → còn lại (vòng đời canh tác, thanh toán, nhân viên…).
 */
export type NotificationCategory = 'iot' | 'cultivation' | 'system'

/** Metadata hiển thị cho từng nhóm. */
export interface NotificationCategoryMeta {
  /** Nhãn hiển thị trên Tag. */
  label: string
  /**
   * Màu Tag của antd.
   *
   * ⚠ `null` = mặc định (xám) — dùng cho nhóm `system` để phân cấp thị giác:
   *   đỏ (khẩn cấp) > cam (cần xem) > mặc định (thông thường).
   */
  color: string | null
  /** Icon đi kèm Tag. */
  icon: 'warning' | 'bug' | 'system'
  /** Mô tả dùng cho tooltip. */
  description: string
}

/**
 * Bảng metadata của 3 nhóm hiển thị.
 *
 * ⚠ `iot` dùng đỏ (`error`) — lỗi thiết bị / vượt ngưỡng cần xử lý ngay.
 * ⚠ `cultivation` dùng cam (`warning`) — cần theo dõi / chẩn đoán.
 */
export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  NotificationCategoryMeta
> = {
  iot: {
    label: 'Thiết bị IoT',
    color: 'error',
    icon: 'warning',
    description: 'Lỗi thiết bị / cảm biến / vi khí hậu — cần xử lý ngay.',
  },
  cultivation: {
    label: 'Canh tác / Bệnh hại',
    color: 'warning',
    icon: 'bug',
    description: 'Bệnh hại nấm hoặc vấn đề canh tác — cần chẩn đoán.',
  },
  system: {
    label: 'Hệ thống',
    color: null,
    icon: 'system',
    description: 'Thông báo vận hành chung của hệ thống.',
  },
}

/**
 * Mapping `notification_type` của BE → nhóm hiển thị.
 *
 * ⚠ Chỉ liệt kê type BE **thực sự phát sinh** (xem `notification.model.js`,
 *   `cultivationSession.model.js`, `diseaseManagement.model.js`,
 *   `payment.model.js`). Type lạ ⇒ rơi về `system` (mặc định) — an toàn.
 */
const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  DEVICE_ISSUE: 'iot',
  SENSOR_ALERT: 'iot',
  MUSHROOM_DISEASE: 'cultivation',
}

/**
 * Nhóm hiển thị của thông báo — **chỉ dựa vào `type` của BE**.
 *
 * @param type `notification_type` của BE.
 */
export function notificationCategory(
  type: NotificationType | string,
): NotificationCategory {
  return TYPE_TO_CATEGORY[type] ?? 'system'
}

/** Metadata hiển thị của nhóm (label / color / icon / description). */
export function notificationCategoryMeta(
  type: NotificationType | string,
): NotificationCategoryMeta {
  return NOTIFICATION_CATEGORY_META[notificationCategory(type)]
}

/**
 * Thông báo này là **cảnh báo IoT khẩn cấp** không?
 *
 * ⚠ Chỉ nhóm `iot` mới được tô nền hàng — nhóm `cultivation` và `system`
 *   giữ nền trắng bình thường để bảng không bị "nhiễu" màu.
 */
export function isIotDangerAlert(
  type: NotificationType | string,
): boolean {
  return notificationCategory(type) === 'iot'
}
