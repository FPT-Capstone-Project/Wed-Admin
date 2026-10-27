import { useMemo, useState } from 'react'
import {
  CheckOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  message,
} from 'antd'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useAlertStore } from '../../stores/alert.store'
import { useRoomStore } from '../../stores/room.store'
import { getCustomerTrayIds } from '../../features/rooms/utils/tray-customer.utils'
import { AlertItemRow } from './components/AlertItemRow'
import { ActionButton, EmptyState, PageHeader, StatCard, StatusBadge } from '../../shared/ui'
import type {
  AlertAcknowledgementFilter,
  AlertCategory,
  AlertReadFilter,
  AlertSeverity,
  SystemAlert,
} from '../../types/alert.types'

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Nghiêm trọng' },
  { value: 'WARNING', label: 'Cảnh báo' },
  { value: 'INFO', label: 'Thông tin' },
] satisfies Array<{ value: AlertSeverity; label: string }>

const CATEGORY_OPTIONS = [
  { value: 'TEMPERATURE', label: 'Nhiệt độ' },
  { value: 'HUMIDITY', label: 'Độ ẩm' },
  { value: 'DEVICE_OFFLINE', label: 'Node STM32 mất kết nối' },
  { value: 'HARDWARE_FAULT', label: 'Lỗi phần cứng' },
] satisfies Array<{ value: AlertCategory; label: string }>

const READ_OPTIONS = [
  { value: 'UNREAD', label: 'Chưa đọc' },
  { value: 'READ', label: 'Đã đọc' },
] satisfies Array<{ value: Exclude<AlertReadFilter, 'ALL'>; label: string }>

const ACKNOWLEDGEMENT_OPTIONS = [
  { value: 'UNACKNOWLEDGED', label: 'Chưa xử lý' },
  { value: 'ACKNOWLEDGED', label: 'Đã xử lý' },
] satisfies Array<{
  value: Exclude<AlertAcknowledgementFilter, 'ALL'>
  label: string
}>

function canManageAlerts(role: string | undefined) {
  const normalizedRole = role?.toUpperCase()

  return (
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'OPERATOR' ||
    normalizedRole === 'FARM_MANAGER'
  )
}

export function AlertManagementPage() {
  const alerts = useAlertStore((state) => state.alerts)
  const markAlertRead = useAlertStore((state) => state.markAlertRead)
  const markAllRead = useAlertStore((state) => state.markAllRead)
  const acknowledgeAlert = useAlertStore((state) => state.acknowledgeAlert)
  const acknowledgeAll = useAlertStore((state) => state.acknowledgeAll)
  const authUser = useAuthStore((state) => state.user)
  const tiers = useRoomStore((state) => state.tiers)
  const canManage = canManageAlerts(authUser?.role)

  const [searchText, setSearchText] = useState('')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | undefined>()
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | undefined>()
  const [readFilter, setReadFilter] = useState<AlertReadFilter>('ALL')
  const [acknowledgementFilter, setAcknowledgementFilter] =
    useState<AlertAcknowledgementFilter>('UNACKNOWLEDGED')

  const customerTrayIds = useMemo(
    () => getCustomerTrayIds(tiers, authUser?.fullName),
    [authUser, tiers],
  )

  const scopedAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) => canManage || customerTrayIds.includes(alert.trayId),
      ),
    [alerts, canManage, customerTrayIds],
  )

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return scopedAlerts.filter((alert) => {
      const matchesSearch = normalizedSearch
        ? [alert.message, alert.trayName, alert.trayId, alert.deviceId].some(
            (value) => value.toLowerCase().includes(normalizedSearch),
          )
        : true
      const matchesSeverity = severityFilter
        ? alert.severity === severityFilter
        : true
      const matchesCategory = categoryFilter
        ? alert.category === categoryFilter
        : true
      const matchesRead =
        readFilter === 'ALL' ||
        (readFilter === 'READ' ? alert.isRead : !alert.isRead)
      const matchesAcknowledgement =
        acknowledgementFilter === 'ALL' ||
        (acknowledgementFilter === 'ACKNOWLEDGED'
          ? alert.isAcknowledged
          : !alert.isAcknowledged)

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesCategory &&
        matchesRead &&
        matchesAcknowledgement
      )
    })
  }, [
    acknowledgementFilter,
    categoryFilter,
    readFilter,
    scopedAlerts,
    searchText,
    severityFilter,
  ])

  const unacknowledgedCount = scopedAlerts.filter(
    (alert) => !alert.isAcknowledged,
  ).length
  const unreadCount = scopedAlerts.filter((alert) => !alert.isRead).length
  const criticalCount = scopedAlerts.filter(
    (alert) => alert.severity === 'CRITICAL',
  ).length
  const acknowledgedBy = authUser?.fullName ?? 'Quản trị viên MCMS'

  const handleMarkRead = (alert: SystemAlert) => {
    markAlertRead(alert.id)
  }

  const handleAcknowledge = (alert: SystemAlert) => {
    acknowledgeAlert(alert.id, acknowledgedBy)
    message.success('Đã xác nhận xử lý cảnh báo.')
  }

  const handleMarkAllRead = () => {
    markAllRead()
    message.success('Đã đánh dấu toàn bộ cảnh báo là đã đọc.')
  }

  const handleAcknowledgeAll = () => {
    acknowledgeAll(acknowledgedBy)
    message.success('Đã xác nhận xử lý toàn bộ cảnh báo.')
  }

  return (
    <div>
      <PageHeader
        title="Cảnh báo vi khí hậu"
        description="Theo dõi sự cố môi trường và Node STM32 theo từng tầng, từng khay"
        actions={
          <Space wrap>
            <Badge count={unacknowledgedCount} overflowCount={99}>
              <StatusBadge
                tone="danger"
                label="Chưa xử lý"
                icon={<ExclamationCircleOutlined />}
              />
            </Badge>
            <Badge count={unreadCount} overflowCount={99}>
              <StatusBadge
                tone="warning"
                label="Chưa đọc"
                icon={<FilterOutlined />}
              />
            </Badge>
          </Space>
        }
      />

      <Flex gap={12} wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm nội dung, mã khay hoặc Node STM32"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          style={{ width: 320, maxWidth: '100%' }}
        />

        <Select<AlertSeverity>
          allowClear
          placeholder="Mức độ"
          options={SEVERITY_OPTIONS}
          value={severityFilter}
          onChange={setSeverityFilter}
          style={{ width: 170 }}
        />

        <Select<AlertCategory>
          allowClear
          placeholder="Loại cảnh báo"
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 180 }}
        />

        <Select<AlertReadFilter>
          placeholder="Trạng thái đọc"
          options={[{ value: 'ALL', label: 'Tất cả trạng thái đọc' }, ...READ_OPTIONS]}
          value={readFilter}
          onChange={setReadFilter}
          style={{ width: 190 }}
        />

        <Select<AlertAcknowledgementFilter>
          placeholder="Trạng thái xử lý"
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái xử lý' },
            ...ACKNOWLEDGEMENT_OPTIONS,
          ]}
          value={acknowledgementFilter}
          onChange={setAcknowledgementFilter}
          style={{ width: 190 }}
        />
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <StatCard
          title="Tổng cảnh báo"
          value={scopedAlerts.length}
          tone="neutral"
          description="Cảnh báo trong phạm vi bạn được xem"
        />
        <StatCard
          title="Nghiêm trọng"
          value={criticalCount}
          tone="danger"
          highlightValue
          description="Cần can thiệp thiết bị ngay"
        />
        <StatCard
          title="Chưa xử lý"
          value={unacknowledgedCount}
          tone="warning"
          highlightValue
          description="Chờ người vận hành xác nhận"
        />
        <StatCard
          title="Chưa đọc"
          value={unreadCount}
          tone="info"
          highlightValue
          description="Chưa được mở xem"
        />
      </Flex>

      {canManage && (
        <Flex gap={8} wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
          <ActionButton
            icon={<CheckOutlined />}
            label="Đánh dấu tất cả đã đọc"
            description="Đánh dấu toàn bộ cảnh báo trong phạm vi là đã đọc."
            variant="default"
            size="middle"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
          />
          <Popconfirm
            title="Xác nhận xử lý toàn bộ cảnh báo?"
            description="Chỉ sử dụng sau khi đã kiểm tra các khay và thiết bị liên quan."
            okText="Xác nhận"
            cancelText="Hủy"
            onConfirm={handleAcknowledgeAll}
          >
            <Button
              type="primary"
              disabled={unacknowledgedCount === 0}
            >
              Xác nhận tất cả
            </Button>
          </Popconfirm>
        </Flex>
      )}

      <div
        style={{
          padding: '0 var(--mcms-space-4)',
          border: '1px solid var(--mcms-border)',
          borderRadius: 'var(--mcms-radius-lg)',
          background: 'var(--mcms-surface)',
        }}
      >
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertItemRow
              key={alert.id}
              alert={alert}
              canManage={canManage}
              onMarkRead={handleMarkRead}
              onAcknowledge={handleAcknowledge}
            />
          ))
        ) : (
          <div style={{ padding: 'var(--mcms-space-8) 0' }}>
            <EmptyState
              title="Không có cảnh báo phù hợp"
              description="Thử đổi bộ lọc hoặc xem lại các cảnh báo đã xử lý."
              icon={<ExclamationCircleOutlined />}
            />
          </div>
        )}
      </div>
    </div>
  )
}
