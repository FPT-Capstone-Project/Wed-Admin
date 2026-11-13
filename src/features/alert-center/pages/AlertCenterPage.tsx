import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Tabs } from 'antd'
import { PageHeader } from '../../../shared/ui'
import { useTechnicalAlerts } from '../../alerts/hooks/useOperationalAlerts'
import { useAllNotifications } from '../../notifications/hooks/useNotifications'
import { isBusinessNotificationType } from '../../notifications/utils/notification-classification'
import { AlertsPanel } from '../components/AlertsPanel'
import { NotificationsPanel } from '../components/NotificationsPanel'
import {
  ALERT_CENTER_TAB_ALERTS,
  ALERT_CENTER_TAB_NOTIFICATIONS,
  alertCenterTabParam,
  resolveAlertCenterTab,
  type AlertCenterTabKey,
} from '../utils/alert-center-navigation'
import '../alert-center-industrial.css'

/**
 * Trung tâm **"Cảnh báo & Thông báo"** — gộp 2 phân hệ cũ:
 *   - `/alerts`        → Cảnh báo vi khí hậu & IoT (tab 1).
 *   - `/notifications` → Thông báo hệ thống (tab 2).
 *
 * ⚠ Vì sao gộp?
 *   Hai danh sách cùng bản chất là "hộp thư sự kiện" và dùng chung 1 khái
 *   niệm trạng thái đọc (`is_read`). Tách làm 2 mục menu ⇒ người dùng phải
 *   mở 2 trang để biết "còn việc gì cần xem".
 *
 * ⚠ Deep-link: hỗ trợ
 *   - `?tab=iot|alerts`           → tab "Cảnh báo vi khí hậu & IoT".
 *   - `?tab=notifications`        → tab "Thông báo hệ thống".
 *   - `?notification=<id>`        → mở thẳng Drawer chi tiết của thông báo đó.
 *   - `?alert=<alertId>`          → mở thẳng Drawer chi tiết của cảnh báo đó.
 *
 *   ⇒ Chuông thông báo (Header) & widget "Cảnh báo gần đây" (Dashboard) đều
 *   điều hướng tới **đúng tab** + **đúng item** (xem
 *   `features/alert-center/utils/alert-center-navigation.ts`).
 */
export function AlertCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = useMemo<AlertCenterTabKey>(
    () => resolveAlertCenterTab(searchParams.get('tab')),
    [searchParams],
  )

  /**
   * Item cần mở thẳng khi vào trang (deep-link từ chuông / Dashboard).
   *
   * ⚠ `notification` là **ID thông báo của BE** (`notification_id`).
   * ⚠ `alert` là **ID cảnh báo vận hành** (`OperationalAlert.id`, vd `notif:12`).
   */
  const focusNotificationId = useMemo(() => {
    const raw = searchParams.get('notification')
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [searchParams])

  const focusAlertId = useMemo(
    () => searchParams.get('alert')?.trim() || null,
    [searchParams],
  )

  /**
   * Badge đếm số chưa đọc cho từng tab.
   *
   * ⚠ **Mỗi tab đếm trên đúng tập dữ liệu của chính nó** (không dùng chung
   *   1 con số toàn cục) — nếu không, badge sẽ lệch với nội dung hiển thị:
   *
   *   - Tab 1 (`useTechnicalAlerts`) → cảnh báo **kỹ thuật**: sự kiện nhật ký
   *     auto-control + thông báo có `notification_type` thuộc nhóm IoT /
   *     thiết bị / cảm biến / vi khí hậu.
   *
   *   - Tab 2 (`useAllNotifications` + `isBusinessNotificationType`) → thông báo
   *     **nghiệp vụ**: đơn hàng, thu hoạch, phiên canh tác, bệnh hại, hệ
   *     thống chung — **loại trừ** toàn bộ nhóm kỹ thuật của tab 1.
   *
   * ⚠ `useTechnicalAlerts` dùng **cùng query key** với `useOperationalAlerts`
   *   ⇒ TanStack Query tự dedupe ⇒ chỉ 1 request cho cả trang.
   */
  const alertsQuery = useTechnicalAlerts()
  const unreadAlerts = alertsQuery.data?.counts.unread ?? 0

  const notificationsQuery = useAllNotifications()
  const unreadNotifications = useMemo(() => {
    const items = notificationsQuery.data?.items ?? []
    return items.filter(
      (item) =>
        isBusinessNotificationType(item.notification_type) && !item.is_read,
    ).length
  }, [notificationsQuery.data])

  /**
   * Đổi tab — luôn **ghi rõ** `?tab=` để link chia sẻ luôn mở đúng tab.
   *
   * ⚠ Xóa luôn `notification` / `alert` ⇒ chuyển tab thủ công không bị "mở
   *   nhầm" Drawer của item ở tab trước.
   */
  const handleChange = (key: string) => {
    const next = resolveAlertCenterTab(key)
    setSearchParams({ tab: alertCenterTabParam(next) }, { replace: true })
  }

  return (
    <div className="mcms-alert-center">
      <PageHeader
        title="Cảnh báo & Thông báo"
        description="Trung tâm theo dõi sự kiện của trang trại: cảnh báo vi khí hậu & IoT và thông báo vận hành (đơn hàng, canh tác, thu hoạch)."
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleChange}
        items={[
          {
            key: ALERT_CENTER_TAB_ALERTS,
            label: (
              <Badge
                count={unreadAlerts}
                overflowCount={99}
                offset={[10, -2]}
                size="small"
              >
                <span>Cảnh báo vi khí hậu &amp; IoT</span>
              </Badge>
            ),
            children: (
              <AlertsPanel
                focusNotificationId={focusNotificationId}
                focusAlertId={focusAlertId}
              />
            ),
          },
          {
            key: ALERT_CENTER_TAB_NOTIFICATIONS,
            label: (
              <Badge
                count={unreadNotifications}
                overflowCount={99}
                offset={[10, -2]}
                size="small"
              >
                <span>Thông báo hệ thống</span>
              </Badge>
            ),
            children: (
              <NotificationsPanel focusNotificationId={focusNotificationId} />
            ),
          },
        ]}
      />
    </div>
  )
}
