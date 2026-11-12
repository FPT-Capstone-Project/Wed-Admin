import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Select,
  Skeleton,
  Typography,
} from 'antd'
import {
  ActionButton,
  DataTable,
  MetadataBadge,
  StatCard,
} from '../../../shared/ui'
import { formatDate } from '../../../shared/utils/date'
import { AlertItemRow } from '../../alerts/components/AlertItemRow'
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_CONFIG,
} from '../../alerts/components/alert-status.config'
import { useTechnicalAlerts } from '../../alerts/hooks/useOperationalAlerts'
import type {
  AlertReadFilter,
  OperationalAlert,
  OperationalAlertCategory,
  OperationalAlertSeverity,
} from '../../alerts/types/alert.types'
import { useNotificationActions } from '../../notifications/hooks/useNotifications'
import { markAlertsAsRead } from '../utils/mark-alerts-as-read'

const SEVERITY_OPTIONS = (
  Object.keys(ALERT_SEVERITY_CONFIG) as OperationalAlertSeverity[]
).map((value) => ({ value, label: ALERT_SEVERITY_CONFIG[value].label }))

const CATEGORY_OPTIONS = (
  Object.keys(ALERT_CATEGORY_LABELS) as OperationalAlertCategory[]
).map((value) => ({ value, label: ALERT_CATEGORY_LABELS[value] }))

const READ_OPTIONS: Array<{ value: AlertReadFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả trạng thái đọc' },
  { value: 'UNREAD', label: 'Chưa đọc' },
  { value: 'READ', label: 'Đã đọc' },
]

/**
 * Tab 1 của Trung tâm "Cảnh báo & Thông báo" — **Cảnh báo vi khí hậu & IoT**.
 *
 * ⚠ **Phạm vi dữ liệu (tách biệt hoàn toàn với tab 2)**:
 *   Chỉ hiển thị cảnh báo thuộc nhóm **kỹ thuật**:
 *     - Sự kiện từ **nhật ký auto-control** của tầng (luôn thuộc tab 1).
 *     - Thông báo có `notification_type` thuộc nhóm kỹ thuật (IoT / thiết bị /
 *       cảm biến / vi khí hậu) — vd `DEVICE_ISSUE`, `SENSOR_ALERT`.
 *
 *   ⇒ Dùng `useTechnicalAlerts()` (lọc sẵn ở tầng hook) ⇒ cùng 1 bản ghi
 *   **không thể** xuất hiện ở tab 2 (thông báo nghiệp vụ).
 *
 * ⚠ Tái sử dụng nguyên vẹn logic fetch + hiển thị của trang `/alerts` cũ
 *   (`useOperationalAlerts` + `AlertItemRow`). Chỉ bổ sung:
 *   - Chuẩn hoá màu nền dòng theo trạng thái đọc (đỏ nhạt / xám nhạt).
 *   - Nút "Xem chi tiết" (Drawer read-only).
 *   - Nút "Đánh dấu đã đọc" cho cảnh báo có nguồn `NOTIFICATION`
 *     (cảnh báo từ nhật ký auto-control không có trạng thái đọc ở BE).
 */
export function AlertsPanel() {
  const [searchText, setSearchText] = useState('')
  const [severityFilter, setSeverityFilter] =
    useState<OperationalAlertSeverity | undefined>()
  const [categoryFilter, setCategoryFilter] =
    useState<OperationalAlertCategory | undefined>()
  const [readFilter, setReadFilter] = useState<AlertReadFilter>('ALL')
  const [detail, setDetail] = useState<OperationalAlert | null>(null)

  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useTechnicalAlerts()
  const { read, pending } = useNotificationActions()

  /**
   * Đánh dấu đã đọc — **optimistic**.
   *
   * ⚠ Cập nhật cache của query cảnh báo ngay ⇒ dòng tương ứng chuyển từ
   *   nền "chưa đọc" (đỏ nhạt) sang nền "đã đọc" (xám nhạt) **ngay lập tức**,
   *   không chờ round-trip mạng. BE vẫn là nguồn sự thật (invalidate sau).
   */
  const markRead = (notificationId: number) => {
    markAlertsAsRead(queryClient, [notificationId])
    read.mutate(notificationId)
  }

  const alerts = useMemo(() => data?.alerts ?? [], [data])
  const counts = data?.counts

  const filteredAlerts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return alerts.filter((alert) => {
      const matchesSearch = keyword
        ? [alert.title, alert.message, alert.floorName ?? '', alert.deviceId ?? '']
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(keyword))
        : true
      const matchesSeverity = severityFilter
        ? alert.severity === severityFilter
        : true
      const matchesCategory = categoryFilter
        ? alert.category === categoryFilter
        : true
      const matchesRead =
        readFilter === 'ALL'
          ? true
          : readFilter === 'READ'
            ? alert.isRead
            : !alert.isRead

      return matchesSearch && matchesSeverity && matchesCategory && matchesRead
    })
  }, [alerts, categoryFilter, readFilter, searchText, severityFilter])

  /** Cảnh báo có nguồn thông báo ⇒ hỗ trợ đánh dấu đã đọc. */
  const isMarkable = (alert: OperationalAlert) =>
    alert.source === 'NOTIFICATION' && !alert.isRead

  return (
    <div>
      <Flex gap={12} wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm nội dung, tầng hoặc thiết bị"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          style={{ width: 320, maxWidth: '100%' }}
        />

        <Select<OperationalAlertSeverity>
          allowClear
          placeholder="Mức độ"
          options={SEVERITY_OPTIONS}
          value={severityFilter}
          onChange={setSeverityFilter}
          style={{ width: 170 }}
        />

        <Select<OperationalAlertCategory>
          allowClear
          placeholder="Loại cảnh báo"
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 200 }}
        />

        <Select<AlertReadFilter>
          placeholder="Trạng thái đọc"
          options={READ_OPTIONS}
          value={readFilter}
          onChange={setReadFilter}
          style={{ width: 190 }}
        />
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <StatCard
          title="Tổng cảnh báo"
          value={counts?.total ?? 0}
          tone="neutral"
          description="Trong toàn bộ hệ thống"
        />
        <StatCard
          title="Nghiêm trọng"
          value={counts?.critical ?? 0}
          tone="danger"
          highlightValue
          description="Cần can thiệp thiết bị ngay"
        />
        <StatCard
          title="Cảnh báo"
          value={counts?.warning ?? 0}
          tone="warning"
          highlightValue
          description="Cần theo dõi sát"
        />
        <StatCard
          title="Chưa đọc"
          value={counts?.unread ?? 0}
          tone="danger"
          highlightValue
          description="Cảnh báo chưa được mở xem"
        />
      </Flex>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <DataTable<OperationalAlert>
          rowKey="id"
          dataSource={filteredAlerts}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scrollX={900}
          loading={false}
          rowClassName={(alert) =>
            alert.isRead ? 'mcms-center-row-read' : 'mcms-center-row-unread'
          }
          columns={[
            {
              key: 'alert',
              title: 'Cảnh báo / Nội dung',
              render: (_, alert) => <AlertItemRow alert={alert} />,
            },
            {
              title: 'Thao tác',
              key: 'actions',
              width: 230,
              align: 'right',
              render: (_, alert) => (
                <Flex gap={4} wrap justify="flex-end">
                  <ActionButton
                    icon={<EyeOutlined />}
                    label="Xem chi tiết"
                    onClick={() => setDetail(alert)}
                  />
                  {isMarkable(alert) && (
                    <ActionButton
                      icon={<CheckCircleOutlined />}
                      label="Đánh dấu đã đọc"
                      disabled={pending}
                      onClick={() => {
                        if (alert.notificationId == null) return
                        markRead(alert.notificationId)
                      }}
                    />
                  )}
                </Flex>
              ),
            },
          ]}
          error={
            isError
              ? {
                  message:
                    error?.message ??
                    'Không tải được danh sách cảnh báo. Lỗi không xác định.',
                }
              : undefined
          }
          onRetry={() => void refetch()}
          emptyTitle="Không có cảnh báo phù hợp"
          emptyDescription="Hệ thống đang hoạt động bình thường — không có sự kiện bất thường nào được ghi nhận."
        />
      )}

      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Chi tiết cảnh báo"
        width={520}
        className="mcms-alert-center-drawer"
        footer={
          <Flex justify="end" gap={8}>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            {detail && isMarkable(detail) && (
              <Button
                type="primary"
                loading={read.isPending}
                onClick={() => {
                  if (detail.notificationId == null) return
                  markRead(detail.notificationId)
                  setDetail(null)
                }}
              >
                Đánh dấu đã đọc
              </Button>
            )}
          </Flex>
        }
      >
        {detail && (
          <Flex vertical gap="var(--mcms-space-4)">
            <Flex gap={8} wrap align="center">
              <MetadataBadge
                label={ALERT_SEVERITY_CONFIG[detail.severity].label}
                icon={<ExclamationCircleOutlined />}
              />
              <MetadataBadge
                label={
                  detail.isRead ? 'Đã đọc' : 'Chưa đọc'
                }
                icon={<FilterOutlined />}
              />
              <MetadataBadge label={ALERT_CATEGORY_LABELS[detail.category]} />
            </Flex>

            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                {detail.title}
              </Typography.Title>
              <div className="mcms-alert-center-detail-body">{detail.message}</div>
            </div>

            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                {
                  key: 'timestamp',
                  label: 'Thời gian',
                  children: formatDate(detail.timestamp, 'HH:mm DD/MM/YYYY'),
                },
                {
                  key: 'floor',
                  label: 'Tầng',
                  children: detail.floorName ?? '—',
                },
                {
                  key: 'device',
                  label: 'Thiết bị',
                  children: detail.deviceId ?? '—',
                },
                {
                  key: 'value',
                  label: 'Giá trị tại thời điểm sự kiện',
                  children:
                    detail.currentValue != null
                      ? `${detail.currentValue.toFixed(1)}%RH`
                      : '—',
                },
                {
                  key: 'reference',
                  label: 'Đối tượng liên quan',
                  children: detail.referenceId
                    ? `#${detail.referenceId}`
                    : '—',
                },
              ]}
            />
          </Flex>
        )}
      </Drawer>
    </div>
  )
}
