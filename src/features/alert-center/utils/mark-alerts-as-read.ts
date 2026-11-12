import type { QueryClient } from '@tanstack/react-query'
import { alertKeys } from '../../alerts/hooks/useOperationalAlerts'
import type { BuiltAlerts } from '../../alerts/api/alert.api'
import { filterTechnicalAlerts } from '../../alerts/utils/filter-technical-alerts'

/**
 * Đánh dấu đã đọc cho cảnh báo có nguồn `NOTIFICATION` — **optimistic**.
 *
 * ⚠ Vì sao cần helper dùng chung?
 *   Trung tâm "Cảnh báo & Thông báo" có 2 tab:
 *     - Tab 1 (Cảnh báo) — cảnh báo kỹ thuật (IoT) + nhật ký auto-control.
 *     - Tab 2 (Thông báo) — thông báo nghiệp vụ.
 *
 *   ⇒ Cùng 1 thông báo **kỹ thuật** có thể xuất hiện ở **cả 2 tab** (tab 2
 *   gọi `markAlertsAsRead` chỉ để đồng bộ cache, không hiển thị). Đánh dấu
 *   đọc ở tab nào cũng phải cập nhật cache của tab kia, nếu không badge
 *   "chưa đọc" ở tab còn lại sẽ bị **stale** ⇒ người dùng tưởng còn việc
 *   chưa xem dù đã xem rồi.
 *
 * @param client TanStack Query client.
 * @param notificationIds Danh sách ID thông báo vừa được đánh dấu đọc.
 */
export function markAlertsAsRead(
  client: QueryClient,
  notificationIds: number[],
): void {
  if (notificationIds.length === 0) return

  const ids = new Set(notificationIds.filter((id) => Number.isFinite(id)))

  client.setQueryData<BuiltAlerts>(alertKeys.operational(), (previous) => {
    if (!previous) return previous

    let changed = false
    const alerts = previous.alerts.map((alert) => {
      if (
        alert.source === 'NOTIFICATION' &&
        alert.notificationId != null &&
        ids.has(alert.notificationId) &&
        !alert.isRead
      ) {
        changed = true
        return { ...alert, isRead: true }
      }
      return alert
    })

    if (!changed) return previous

    /*
     * ⚠ `counts` phải được tính lại trên **tập đã lọc của tab 1** ⇒ badge
     *   của tab 1 luôn khớp với những gì tab 1 hiển thị.
     */
    const technicalAlerts = filterTechnicalAlerts(alerts)

    return {
      ...previous,
      alerts,
      counts: {
        ...previous.counts,
        total: technicalAlerts.length,
        critical: technicalAlerts.filter(
          (alert) => alert.severity === 'CRITICAL',
        ).length,
        warning: technicalAlerts.filter(
          (alert) => alert.severity === 'WARNING',
        ).length,
        info: technicalAlerts.filter((alert) => alert.severity === 'INFO').length,
        unread: technicalAlerts.filter((alert) => !alert.isRead).length,
        fromIot: technicalAlerts.filter(
          (alert) => alert.source === 'IOT_AUTO_CONTROL',
        ).length,
        fromNotifications: technicalAlerts.filter(
          (alert) => alert.source === 'NOTIFICATION',
        ).length,
      },
    }
  })
}
