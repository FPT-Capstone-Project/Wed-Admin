import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Tabs } from 'antd'
import { PageHeader } from '../../../shared/ui'
import { useTechnicalAlerts } from '../../alerts/hooks/useOperationalAlerts'
import { useAllNotifications } from '../../notifications/hooks/useNotifications'
import { isBusinessNotificationType } from '../../notifications/utils/notification-classification'
import { AlertsPanel } from '../components/AlertsPanel'
import { NotificationsPanel } from '../components/NotificationsPanel'
import '../alert-center-industrial.css'

/** 2 tab của trung tâm cảnh báo. */
export type AlertCenterTab = 'alerts' | 'notifications'

const TAB_ALERTS: AlertCenterTab = 'alerts'
const TAB_NOTIFICATIONS: AlertCenterTab = 'notifications'

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
 * ⚠ Deep-link: hỗ trợ `?tab=alerts|notifications` để các liên kết cũ
 *   (quả chuông trên Header, nút "Xem tất cả" ở Dashboard) mở đúng tab.
 */
export function AlertCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = useMemo<AlertCenterTab>(() => {
    const raw = searchParams.get('tab')
    return raw === TAB_NOTIFICATIONS ? TAB_NOTIFICATIONS : TAB_ALERTS
  }, [searchParams])

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

  const handleChange = (key: string) => {
    const next = key === TAB_NOTIFICATIONS ? TAB_NOTIFICATIONS : TAB_ALERTS
    setSearchParams(next === TAB_ALERTS ? {} : { tab: next }, { replace: true })
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
            key: TAB_ALERTS,
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
            children: <AlertsPanel />,
          },
          {
            key: TAB_NOTIFICATIONS,
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
            children: <NotificationsPanel />,
          },
        ]}
      />
    </div>
  )
}
