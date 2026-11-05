/**
 * Chuông thông báo trên Header — badge số chưa đọc + popover tóm tắt.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/notifications` (BE trả `meta.unread_count`).
 *   Badge đếm từ `notification.store` (được interceptor axios đẩy vào khi
 *   BE trả `meta.unread_count`) ⇒ **mọi** request đều cập nhật badge, kể cả
 *   khi user không mở popover.
 *
 * ⚠ Popover chỉ tải danh sách khi **mở** (`enabled: open`) ⇒ không dội
 *   request khi admin chỉ đang làm việc ở trang khác.
 */
import { Alert, Badge, Button, Empty, Flex, Popover, Spin, Typography } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useNotifications,
  useNotificationActions,
  useUnreadNotificationCount,
} from '../hooks/useNotifications'
import { useNotificationStore } from '../store/notification.store'
import {
  notificationCategory,
  notificationCategoryMeta,
  notificationTypeLabel,
} from './notification-status.config'
import { formatRelativeTime } from '../../../shared/utils/date'
import '../notifications-industrial.css'

/** Số thông báo tóm tắt trong popover. */
const PREVIEW_COUNT = 5

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const query = useNotifications(
    { page: 1, pageSize: PREVIEW_COUNT },
    { enabled: open },
  )
  const { read, pending } = useNotificationActions()

  /**
   * Poll số chưa đọc mỗi 60 s.
   *
   * ⚠ Vì sao cần? Badge phải đúng ngay cả khi admin không mở popover và
   *   không vào trang thông báo. Response của `GET /api/notifications` có
   *   `meta.unread_count` ⇒ interceptor tự đẩy vào store ⇒ badge tự cập
   *   nhật sau mỗi lần poll.
   */
  useUnreadNotificationCount({ refetchInterval: 60_000 })

  // Badge đếm từ store (cập nhật bởi interceptor) — luôn có số chính xác
  // kể cả khi popover đang đóng.
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  const items = query.data?.items ?? []

  const handleOpenAll = () => {
    setOpen(false)
    navigate('/notifications')
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      title={null}
      // Không padding sẵn của container ⇒ danh sách dán sát mép.
      styles={{ container: { padding: 0 } }}
      classNames={{ content: 'mcms-notification-popover-content' }}
      content={
        <div className="mcms-notification-popover">
          <div className="mcms-notification-popover-header">
            <Typography.Text strong>Thông báo</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 'var(--mcms-font-small)' }}>
              {unreadCount ? `${unreadCount} chưa đọc` : 'Đã đọc hết'}
            </Typography.Text>
          </div>

          {query.isLoading ? (
            <div style={{ padding: 'var(--mcms-space-4)' }}>
              <Spin />
            </div>
          ) : query.isError ? (
            <div style={{ padding: 'var(--mcms-space-3)' }}>
              <Alert
                type="error"
                showIcon
                message="Không tải được thông báo"
                action={
                  <Button size="small" onClick={() => void query.refetch()}>
                    Thử lại
                  </Button>
                }
              />
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 'var(--mcms-space-4)' }}>
              <Empty description="Chưa có thông báo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <div className="mcms-notification-popover-list">
              {items.map((item) => {
                const category = notificationCategory(item.notification_type)
                const meta = notificationCategoryMeta(item.notification_type)
                const relative = formatRelativeTime(item.created_at)

                return (
                  <button
                    key={item.notification_id}
                    type="button"
                    className="mcms-notification-popover-item"
                    data-unread={item.is_read ? 'false' : 'true'}
                    data-alert={category === 'iot' ? 'true' : 'false'}
                    data-alert-kind={category}
                    disabled={pending}
                    onClick={() => {
                      if (!item.is_read) read.mutate(item.notification_id)
                    }}
                  >
                    <Flex vertical gap={2}>
                      <Flex align="center" gap={6} wrap>
                        <span className="mcms-notification-popover-title">
                          {item.title ?? notificationTypeLabel(item.notification_type)}
                        </span>
                        {category === 'iot' && (
                          <Typography.Text
                            type="danger"
                            style={{ fontSize: 'var(--mcms-font-small)', fontWeight: 600 }}
                          >
                            {meta.label}
                          </Typography.Text>
                        )}
                      </Flex>
                      <span className="mcms-notification-popover-message">
                        {item.message ?? '—'}
                      </span>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 'var(--mcms-font-small)' }}
                      >
                        {notificationTypeLabel(item.notification_type)}
                        {relative ? ` · ${relative}` : ''}
                      </Typography.Text>
                    </Flex>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mcms-notification-popover-footer">
            <Button type="link" block onClick={handleOpenAll}>
              Xem tất cả
            </Button>
          </div>
        </div>
      }
    >
      <Badge
        count={unreadCount ?? 0}
        size="small"
        overflowCount={99}
        // Class đặt trên Badge (không phải Button) vì `.ant-badge-count` là
        // **anh em** của button, không phải con ⇒ selector hậu duệ phải bám
        // vào chính Badge.
        className="mcms-notification-bell"
      >
        <Button
          type="text"
          icon={<BellOutlined />}
          aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`}
        />
      </Badge>
    </Popover>
  )
}
