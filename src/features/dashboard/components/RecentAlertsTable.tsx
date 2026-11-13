/**
 * RecentAlertsTable — widget cảnh báo gần đây trên Dashboard.
 *
 * ⚠ Dữ liệu đến từ API thật:
 *   - `GET /api/iot/floors/{floorId}/auto-control/logs` (sự kiện lỗi/bất thường)
 *   - `GET /api/notifications` (thông báo nghiệp vụ)
 *
 * → KHÔNG dùng `useAlertStore` (mock) nữa.
 */
import { ArrowRightOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Card, Flex, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOperationalAlerts } from '../../alerts/hooks/useOperationalAlerts'
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_CONFIG,
} from '../../alerts/components/alert-status.config'
import type { OperationalAlert } from '../../alerts/types/alert.types'
import {
  ALERT_CENTER_TAB_ALERTS,
  buildAlertCenterHref,
  tabForAlert,
} from '../../alert-center/utils/alert-center-navigation'
import { ActionButton, DataTable, StatusBadge } from '../../../shared/ui'

/** Số cảnh báo hiển thị tối đa trong widget trên Dashboard. */
const MAX_VISIBLE_ALERTS = 5

export function RecentAlertsTable() {
  const navigate = useNavigate()
  const { data, isLoading } = useOperationalAlerts()

  const alerts = useMemo(() => data?.alerts ?? [], [data])

  const recentAlerts = useMemo<OperationalAlert[]>(
    () =>
      [...alerts]
        .sort(
          (left, right) =>
            new Date(right.timestamp ?? 0).getTime() -
            new Date(left.timestamp ?? 0).getTime(),
        )
        .slice(0, MAX_VISIBLE_ALERTS),
    [alerts],
  )

  const columns: ColumnsType<OperationalAlert> = [
    {
      title: 'Mức độ',
      key: 'severity',
      width: 150,
      render: (_, alert) => {
        const config = ALERT_SEVERITY_CONFIG[alert.severity]
        return <StatusBadge tone={config.tone} label={config.label} />
      },
    },
    {
      title: 'Nội dung / vị trí',
      key: 'message',
      render: (_, alert) => (
        <Flex vertical gap={4}>
          <Typography.Text strong>{alert.title}</Typography.Text>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12 }}
            ellipsis={{ tooltip: alert.message }}
          >
            {alert.message}
          </Typography.Text>
          <Flex
            gap={8}
            wrap
            style={{ color: 'var(--mcms-text-muted)', fontSize: 12 }}
          >
            <span>
              {ALERT_CATEGORY_LABELS[alert.category] ?? alert.category}
            </span>
            {alert.floorName && <span>· {alert.floorName}</span>}
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Thời gian',
      key: 'timestamp',
      width: 150,
      render: (_, alert) => (
        <span style={{ color: 'var(--mcms-text-muted)', fontSize: 12 }}>
          <ClockCircleOutlined aria-hidden="true" />{' '}
          {formatRelativeTime(alert.timestamp)}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      className: 'ant-table-cell-action',
      width: 96,
      /*
       * ⚠ Điều hướng tới **đúng tab** + **đúng item** trong trung tâm
       *   "Cảnh báo & Thông báo".
       *
       *   Trước đây luôn `navigate('/alerts')` ⇒ mở tab mặc định ("Cảnh báo
       *   vi khí hậu & IoT") **không phải** item đang bấm ⇒ người dùng phải
       *   tự tìm lại trong danh sách.
       */
      render: (_, alert) => (
        <ActionButton
          variant="text"
          icon={<ArrowRightOutlined />}
          label="Xem"
          description="Xem chi tiết tại trung tâm Cảnh báo & Thông báo"
          hideLabel
          onClick={() =>
            navigate(
              buildAlertCenterHref({
                tab: tabForAlert(alert),
                notificationId: alert.notificationId,
                alertId: alert.source === 'NOTIFICATION' ? null : alert.id,
              }),
            )
          }
        />
      ),
    },
  ]

  return (
    <Card className="recent-alerts-card" size="small">
      <div className="recent-alerts-header">
        <div>
          <Typography.Title level={2} style={{ fontSize: 15 }}>
            Cảnh báo gần đây
          </Typography.Title>
          <Typography.Text type="secondary">
            {alerts.length > 0
              ? `${alerts.length} sự kiện bất thường được ghi nhận`
              : 'Không có sự kiện bất thường'}
          </Typography.Text>
        </div>
        <ActionButton
          variant="text"
          icon={<ArrowRightOutlined />}
          label="Xem tất cả"
          /*
           * ⚠ Widget này hiển thị **cảnh báo vận hành** (đa số là nhóm kỹ
           *   thuật: IoT / vi khí hậu / thiết bị) ⇒ mở tab "Cảnh báo vi khí
           *   hậu & IoT" thay vì để trang tự chọn tab mặc định.
           */
          onClick={() =>
            navigate(
              buildAlertCenterHref({ tab: ALERT_CENTER_TAB_ALERTS }),
            )
          }
        />
      </div>
      <DataTable<OperationalAlert>
        columns={columns}
        dataSource={recentAlerts}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        scrollX={720}
        emptyTitle="Không có cảnh báo đang chờ xử lý"
      />
    </Card>
  )
}

function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '—'
  const minutes = Math.floor(
    (Date.now() - dayjs(timestamp).valueOf()) / 60000,
  )
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return dayjs(timestamp).format('DD/MM HH:mm')
}
