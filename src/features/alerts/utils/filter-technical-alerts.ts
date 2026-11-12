import { isTechnicalNotificationType } from '../../notifications/utils/notification-classification'
import type { OperationalAlert } from '../types/alert.types'

/**
 * Lọc cảnh báo cho **tab 1** — "Cảnh báo vi khí hậu & IoT".
 *
 * ⚠ Quy tắc:
 *   1. Cảnh báo từ **nhật ký auto-control** (`IOT_AUTO_CONTROL`) → luôn thuộc
 *      tab 1 (đây là sự kiện kỹ thuật của hệ thống tưới tự động).
 *   2. Cảnh báo dựng từ **thông báo** (`NOTIFICATION`) → chỉ thuộc tab 1 khi
 *      `notification_type` thuộc nhóm kỹ thuật (IoT / thiết bị / cảm biến /
 *      vi khí hậu) — xem `isTechnicalNotificationType()`.
 *
 * ⚠ Hàm này là **phía đối xứng** với `isBusinessNotificationType()` dùng ở
 *   tab 2 ⇒ 2 tab **loại trừ lẫn nhau**, không bao giờ hiển thị trùng.
 */
export function filterTechnicalAlerts(
  alerts: readonly OperationalAlert[],
): OperationalAlert[] {
  return alerts.filter((alert) => {
    if (alert.source === 'IOT_AUTO_CONTROL') return true
    if (alert.source === 'NOTIFICATION') {
      return isTechnicalNotificationType(alert.notificationType)
    }
    return false
  })
}
