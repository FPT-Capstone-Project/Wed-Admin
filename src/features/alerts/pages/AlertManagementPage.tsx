import { useMemo, useState } from 'react'
import { ExclamationCircleOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons'
import { Flex, Input, Select, Skeleton } from 'antd'
import {
  DataTable,
  MetadataBadge,
  PageHeader,
  StatCard,
} from '../../../shared/ui'
import { AlertItemRow } from '../components/AlertItemRow'
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_CONFIG,
} from '../components/alert-status.config'
import { useOperationalAlerts } from '../hooks/useOperationalAlerts'
import type {
  AlertReadFilter,
  OperationalAlert,
  OperationalAlertCategory,
  OperationalAlertSeverity,
} from '../types/alert.types'

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
 * Trang cảnh báo vận hành — **100% READ-ONLY**.
 *
 * Dữ liệu đến từ 2 nguồn thật:
 *   - `GET /api/iot/floors/{floorId}/auto-control/logs` (sự kiện lỗi/bất thường)
 *   - `GET /api/notifications` (nhóm `MUSHROOM_DISEASE`, `DEVICE_ISSUE`,
 *     `OPERATOR_MESSAGE`)
 *
 * ⚠ Không có nút ghi (đánh dấu đã đọc / xác nhận xử lý) — việc đó do nhân
 * viên thực hiện trên app.
 */
export function AlertManagementPage() {
  const [searchText, setSearchText] = useState('')
  const [severityFilter, setSeverityFilter] =
    useState<OperationalAlertSeverity | undefined>()
  const [categoryFilter, setCategoryFilter] =
    useState<OperationalAlertCategory | undefined>()
  const [readFilter, setReadFilter] = useState<AlertReadFilter>('ALL')

  const { data, isLoading, isError, error, refetch } = useOperationalAlerts()

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

  return (
    <div>
      <PageHeader
        title="Cảnh báo vận hành"
        description="Tổng hợp sự kiện bất thường từ hệ thống IoT tưới tự động và thông báo nghiệp vụ của trang trại."
        actions={
          <Flex gap={8} wrap>
            <MetadataBadge
              label={`${counts?.total ?? 0} cảnh báo`}
              icon={<ExclamationCircleOutlined />}
            />
            <MetadataBadge
              label={`${counts?.unread ?? 0} chưa đọc`}
              icon={<FilterOutlined />}
            />
          </Flex>
        }
      />

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
          tone="info"
          highlightValue
          description="Thông báo chưa được mở xem"
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
          columns={[
            {
              key: 'alert',
              title: 'Cảnh báo / Nội dung',
              render: (_, alert) => <AlertItemRow alert={alert} />,
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
    </div>
  )
}
