/**
 * Điều hướng tới **đúng tab** của Trung tâm "Cảnh báo & Thông báo".
 *
 * ⚠ Vì sao cần module này?
 *   Trung tâm gộp 2 danh sách vào 1 trang có 2 tab:
 *     - Tab "Cảnh báo vi khí hậu & IoT" → cảnh báo **kỹ thuật** (IoT).
 *     - Tab "Thông báo hệ thống"        → thông báo **nghiệp vụ**.
 *
 *   Trước đây mọi liên kết tới `/alerts` đều **mở thẳng tab "Thông báo hệ
 *   thống"** ⇒ người dùng click 1 cảnh báo IoT ở chuông thông báo / Dashboard
 *   nhưng lại bị đưa sang tab sai ⇒ phải tự tìm lại.
 *
 *   ⇒ Mọi nơi điều hướng tới trung tâm đều đi qua helper này ⇒ **1 nguồn sự
 *   thật** cho "type này nằm ở tab nào" + "URL nào mở đúng tab / mở đúng
 *   item".
 */
import type { OperationalAlert } from '../../alerts/types/alert.types'
import { isTechnicalNotificationType } from '../../notifications/utils/notification-classification'

/**
 * Key nội bộ của 2 tab (dùng làm `activeKey` của `Tabs`).
 *
 * ⚠ Không nhất thiết trùng với giá trị trong URL — xem
 *   `alertCenterTabParam()`.
 */
export type AlertCenterTabKey = 'alerts' | 'notifications'

/** Tab "Cảnh báo vi khí hậu & IoT". */
export const ALERT_CENTER_TAB_ALERTS: AlertCenterTabKey = 'alerts'

/** Tab "Thông báo hệ thống". */
export const ALERT_CENTER_TAB_NOTIFICATIONS: AlertCenterTabKey = 'notifications'

/** Giá trị `?tab=` tương ứng tab IoT. */
export const ALERT_CENTER_TAB_PARAM_IOT = 'iot'

/** Giá trị `?tab=` tương ứng tab thông báo hệ thống. */
export const ALERT_CENTER_TAB_PARAM_NOTIFICATIONS = 'notifications'

/** Path gốc của trung tâm. */
export const ALERT_CENTER_PATH = '/alerts'

/**
 * Chuẩn hoá giá trị `?tab=` (raw từ URL) → key tab nội bộ.
 *
 * ⚠ Chấp nhận **nhiều alias** để không gãy link cũ:
 *   - `iot` | `alerts` | `climate` → tab "Cảnh báo vi khí hậu & IoT".
 *   - `notifications` | `notification` | `system` → tab "Thông báo hệ thống".
 *   - Trống / lạ → mặc định tab IoT (tab mặc định của trung tâm).
 */
export function resolveAlertCenterTab(
  raw: string | null | undefined,
): AlertCenterTabKey {
  const value = (raw ?? '').trim().toLowerCase()

  if (
    value === ALERT_CENTER_TAB_PARAM_NOTIFICATIONS ||
    value === 'notification' ||
    value === 'system'
  ) {
    return ALERT_CENTER_TAB_NOTIFICATIONS
  }

  return ALERT_CENTER_TAB_ALERTS
}

/**
 * Key tab → giá trị `?tab=` sẽ ghi ra URL.
 *
 * ⚠ Tab IoT dùng `iot` (khớp tên hiển thị "Cảnh báo vi khí hậu & IoT") —
 *   `alerts` vẫn được chấp nhận khi **đọc** URL (link cũ).
 */
export function alertCenterTabParam(tab: AlertCenterTabKey): string {
  return tab === ALERT_CENTER_TAB_NOTIFICATIONS
    ? ALERT_CENTER_TAB_PARAM_NOTIFICATIONS
    : ALERT_CENTER_TAB_PARAM_IOT
}

/**
 * Thông báo (theo `notification_type`) nằm ở tab nào?
 *
 * ⚠ Dùng `isTechnicalNotificationType()` — **nguồn phân loại duy nhất**,
 *   khớp 100% với logic tách tab của `AlertCenterPage` ⇒ không thể lệch.
 */
export function tabForNotificationType(
  type: string | null | undefined,
): AlertCenterTabKey {
  return isTechnicalNotificationType(type)
    ? ALERT_CENTER_TAB_ALERTS
    : ALERT_CENTER_TAB_NOTIFICATIONS
}

/**
 * Cảnh báo vận hành nằm ở tab nào?
 *
 * ⚠ Cảnh báo từ nhật ký auto-control luôn thuộc tab IoT; cảnh báo dựng từ
 *   thông báo thì xét theo `notification_type` (như `filterTechnicalAlerts`).
 */
export function tabForAlert(alert: OperationalAlert): AlertCenterTabKey {
  if (alert.source === 'IOT_AUTO_CONTROL') return ALERT_CENTER_TAB_ALERTS
  if (alert.source === 'NOTIFICATION') {
    return tabForNotificationType(alert.notificationType)
  }
  return ALERT_CENTER_TAB_ALERTS
}

export interface AlertCenterHrefOptions {
  /** Tab cần mở. */
  tab?: AlertCenterTabKey
  /** ID thông báo của BE — mở thẳng Drawer chi tiết của item đó. */
  notificationId?: number | null
  /** ID cảnh báo vận hành (`OperationalAlert.id`) — mở thẳng Drawer. */
  alertId?: string | null
}

/**
 * Dựng URL tới trung tâm — mở **đúng tab** và (tuỳ chọn) mở thẳng **item**.
 *
 * ⚠ Query param dùng để deep-link:
 *   - `tab`     → `iot` | `notifications`.
 *   - `notification` → `notification_id` của BE (mở Drawer trong tab chứa nó).
 *   - `alert`       → `OperationalAlert.id` (mở Drawer cho cảnh báo IoT log).
 */
export function buildAlertCenterHref(
  options: AlertCenterHrefOptions = {},
): string {
  const tab = options.tab ?? ALERT_CENTER_TAB_ALERTS
  const params = new URLSearchParams()

  params.set('tab', alertCenterTabParam(tab))

  if (
    options.notificationId != null &&
    Number.isFinite(options.notificationId)
  ) {
    params.set('notification', String(options.notificationId))
  }

  if (options.alertId) {
    params.set('alert', options.alertId)
  }

  return `${ALERT_CENTER_PATH}?${params.toString()}`
}
