import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import {
  CheckOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { Flex, Popconfirm, Space, Typography } from 'antd'
import { ActionButton, StatusBadge } from '../../../shared/ui'
import { formatFriendlyDeviceLocation } from '../../../shared/i18n/terms'
import type {
  AlertCategory,
  AlertSeverity,
  SystemAlert,
} from '../../../types/alert.types'

interface AlertItemRowProps {
  alert: SystemAlert
  canManage: boolean
  onMarkRead: (alert: SystemAlert) => void
  onAcknowledge: (alert: SystemAlert) => void
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { tone: 'info' | 'warning' | 'danger'; label: string; icon: ReactNode }
> = {
  INFO: {
    tone: 'info',
    label: 'Thông tin',
    icon: <InfoCircleOutlined />,
  },
  WARNING: {
    tone: 'warning',
    label: 'Cảnh báo',
    icon: <ExclamationCircleOutlined />,
  },
  CRITICAL: {
    tone: 'danger',
    label: 'Nghiêm trọng',
    icon: <SafetyOutlined />,
  },
}

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  TEMPERATURE: 'Nhiệt độ',
  HUMIDITY: 'Độ ẩm không khí',
  DEVICE_OFFLINE: 'ESP32 mất kết nối',
  HARDWARE_FAULT: 'Lỗi phần cứng',
  ORDER_OVERDUE: 'Mẻ quá hạn thu hoạch',
  CONTAMINATION: 'Nhiễm bệnh / Mốc',
}

function formatValue(alert: SystemAlert) {
  if (alert.currentValue === null) {
    return null
  }

  // ORDER_OVERDUE & CONTAMINATION đã có nội dung trong `message` — tránh in "11 giây" lố
  if (alert.category === 'ORDER_OVERDUE') {
    return `${alert.currentValue} ngày quá hạn`
  }
  if (alert.category === 'CONTAMINATION') {
    return alert.currentValue >= 1 ? 'Đã phát hiện' : 'Đang theo dõi'
  }

  const unit =
    alert.category === 'TEMPERATURE'
      ? '°C'
      : alert.category === 'HUMIDITY'
        ? '%RH'
        : alert.category === 'DEVICE_OFFLINE'
          ? ' phút'
          : ' giây'

  return `${alert.currentValue}${unit}`
}

export function AlertItemRow({
  alert,
  canManage,
  onMarkRead,
  onAcknowledge,
}: AlertItemRowProps) {
  const severityConfig = SEVERITY_CONFIG[alert.severity]
  const currentValue = formatValue(alert)
  const thresholdValue = alert.thresholdValue
    ? formatValue({ ...alert, currentValue: alert.thresholdValue })
    : null

  // Mã thiết bị kỹ thuật (vd: "node-stm32-01") → tên vị trí dễ hiểu.
  const friendlyDevice = formatFriendlyDeviceLocation(alert.deviceId)

  const acknowledgeButton = (
    <ActionButton
      icon={alert.isAcknowledged ? <CheckCircleOutlined /> : <CheckOutlined />}
      label={alert.isAcknowledged ? 'Đã xử lý' : 'Xác nhận xử lý'}
      description={
        alert.isAcknowledged
          ? 'Cảnh báo này đã được xác nhận xử lý.'
          : 'Xác nhận đã xử lý cảnh báo này.'
      }
      variant={alert.isAcknowledged ? 'default' : 'primary'}
      size="small"
      disabled={alert.isAcknowledged}
      onClick={() => onAcknowledge(alert)}
    />
  )

  return (
    <Flex
      align="flex-start"
      justify="space-between"
      gap={16}
      wrap
      style={{
        padding: 'var(--mcms-space-4) 0',
        borderBottom: '1px solid var(--mcms-border-soft)',
        opacity: alert.isAcknowledged ? 0.72 : 1,
        background: alert.isRead
          ? undefined
          : 'var(--mcms-tone-warning-bg)',
      }}
    >
      <Flex align="flex-start" gap={12} style={{ flex: '1 1 560px' }}>
        <div style={{ marginTop: 2, whiteSpace: 'nowrap' }}>
          <StatusBadge
            tone={severityConfig.tone}
            label={severityConfig.label}
            icon={severityConfig.icon}
          />
        </div>

        <div>
          <Flex align="center" gap={8} wrap>
            <Typography.Text strong>{alert.message}</Typography.Text>
            {!alert.isRead && (
              <StatusBadge tone="warning" label="Chưa đọc" dot={false} />
            )}
          </Flex>

          <Typography.Text type="secondary">
            {alert.trayName} · {alert.trayId} · {friendlyDevice}
          </Typography.Text>

          <br />

          <Typography.Text type="secondary">
            {CATEGORY_LABELS[alert.category]} ·{' '}
            {dayjs(alert.timestamp).format('DD/MM/YYYY HH:mm:ss')}
          </Typography.Text>

          {(currentValue || thresholdValue) && (
            <Typography.Paragraph style={{ margin: '4px 0 0' }}>
              Hiện tại: <strong>{currentValue}</strong>
              {thresholdValue && <> · Ngưỡng: {thresholdValue}</>}
            </Typography.Paragraph>
          )}

          {alert.isAcknowledged && alert.acknowledgedBy && (
            <Typography.Text type="secondary">
              Đã xử lý bởi {alert.acknowledgedBy} lúc{' '}
              {alert.acknowledgedAt
                ? dayjs(alert.acknowledgedAt).format('DD/MM/YYYY HH:mm')
                : 'không rõ'}
            </Typography.Text>
          )}
        </div>
      </Flex>

      {canManage && (
        <Space size={8} wrap>
          <ActionButton
            icon={<CheckOutlined />}
            label={alert.isRead ? 'Đã đọc' : 'Đánh dấu đã đọc'}
            description={
              alert.isRead
                ? 'Cảnh báo này đã được đánh dấu đã đọc.'
                : 'Đánh dấu cảnh báo này là đã đọc.'
            }
            variant="text"
            size="small"
            disabled={alert.isRead}
            onClick={() => onMarkRead(alert)}
          />

          {alert.severity === 'CRITICAL' && !alert.isAcknowledged ? (
            <Popconfirm
              title="Xác nhận đã xử lý cảnh báo nghiêm trọng?"
              description="Chỉ xác nhận sau khi đã kiểm tra và can thiệp thiết bị."
              okText="Xác nhận"
              cancelText="Hủy"
              onConfirm={() => onAcknowledge(alert)}
            >
              {acknowledgeButton}
            </Popconfirm>
          ) : (
            acknowledgeButton
          )}
        </Space>
      )}
    </Flex>
  )
}
