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
  Empty,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useTenantStore } from '../../features/tenants/store/tenant.store'
import { useAlertStore } from '../../stores/alert.store'
import { AlertItemRow } from './components/AlertItemRow'
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
  { value: 'CO2', label: 'CO₂' },
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
  const tenants = useTenantStore((state) => state.tenants)
  const canManage = canManageAlerts(authUser?.role)

  const [searchText, setSearchText] = useState('')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | undefined>()
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | undefined>()
  const [readFilter, setReadFilter] = useState<AlertReadFilter>('ALL')
  const [acknowledgementFilter, setAcknowledgementFilter] =
    useState<AlertAcknowledgementFilter>('UNACKNOWLEDGED')

  const customerTrayIds = useMemo(() => {
    if (!authUser) {
      return []
    }

    return tenants
      .filter((tenant) => tenant.name === authUser.fullName)
      .map((tenant) => tenant.assignedTrayId)
  }, [authUser, tenants])

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
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Cảnh báo vi khí hậu
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi sự cố môi trường và Node STM32 theo từng tầng, từng khay
          </Typography.Text>
        </div>

        <Space wrap>
          <Badge count={unacknowledgedCount} overflowCount={99}>
            <Tag icon={<ExclamationCircleOutlined />} color="error">
              Chưa xử lý
            </Tag>
          </Badge>
          <Badge count={unreadCount} overflowCount={99}>
            <Tag icon={<FilterOutlined />} color="gold">
              Chưa đọc
            </Tag>
          </Badge>
        </Space>
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
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

      {canManage && (
        <Flex gap={8} wrap style={{ marginBottom: 16 }}>
          <Button
            icon={<CheckOutlined />}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Đánh dấu tất cả đã đọc
          </Button>
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
          padding: '0 16px',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#ffffff',
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
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có cảnh báo phù hợp"
            style={{ padding: '48px 0' }}
          />
        )}
      </div>
    </div>
  )
}
