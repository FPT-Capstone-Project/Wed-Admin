/**
 * RecentAlertsTable — widget cảnh báo gần đây trên Dashboard.
 *
 * Cải thiện:
 *   - Chuyển đổi các mã phần cứng kỹ thuật (vd: "node-stm32-01", "node-stm32-04")
 *     thành nhãn vị trí thân thiện với chủ trang trại ("Cụm cảm biến Tầng 1", "Cụm cảm biến Tầng 4").
 *   - Bảng compact và nút icon-only dùng DataTable / ActionButton chung.
 *   - Sử dụng StatusBadge cho mức độ cảnh báo.
 */
import {
  ArrowRightOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { Card, Flex, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlertStore } from '../../../stores/alert.store'
import type { AlertSeverity, SystemAlert } from '../../../types/alert.types'
import type { SemanticTone } from '../../../app/theme/tokens'
import { ActionButton, DataTable, StatusBadge } from '../../../shared/ui'
import { formatFriendlyDeviceLocation } from '../../../shared/i18n/terms'

interface SeverityConfig {
  label: string
  tone: SemanticTone
}

/**
 * Cấu hình mức độ cảnh báo dùng tokens thay vì hardcode hex.
 * CRITICAL → danger, WARNING → warning, INFO → xám trung tính.
 */
const SEVERITY_CONFIG: Record<AlertSeverity, SeverityConfig> = {
  CRITICAL: {
    label: 'Nghiêm trọng',
    tone: 'danger',
  },
  WARNING: {
    label: 'Cảnh báo',
    tone: 'warning',
  },
  INFO: {
    label: 'Thông tin',
    tone: 'info',
  },
}

/** Số cảnh báo hiển thị tối đa trong widget trên Dashboard. */
const MAX_VISIBLE_ALERTS = 3

export function RecentAlertsTable() {
  const navigate = useNavigate()
  const alerts = useAlertStore((state) => state.alerts)

  const recentAlerts = useMemo<SystemAlert[]>(
    () =>
      [...alerts]
        .filter((alert) => !alert.isAcknowledged)
        .sort(
          (left, right) =>
            dayjs(right.timestamp).valueOf() - dayjs(left.timestamp).valueOf(),
        )
        .slice(0, MAX_VISIBLE_ALERTS),
    [alerts],
  )

  /**
   * Tổng unacknowledged (toàn hệ thống) — dùng cho mô tả tiêu đề,
   * đảm bảo luôn khớp với thẻ KPI "Cảnh báo chờ xử lý".
   */
  const totalUnacknowledged = useMemo(
    () => alerts.filter((alert) => !alert.isAcknowledged).length,
    [alerts],
  )

  const columns: ColumnsType<SystemAlert> = [
    {
      title: 'Mức độ',
      key: 'severity',
      width: 150,
      render: (_, alert) => {
        const config = SEVERITY_CONFIG[alert.severity]
        return <StatusBadge tone={config.tone} label={config.label} />
      },
    },
    {
      title: 'Nội dung / vị trí',
      key: 'message',
      render: (_, alert) => (
        <Flex vertical gap={4}>
          <Typography.Text strong>{alert.message}</Typography.Text>
          <Flex gap={8} wrap style={{ color: 'var(--mcms-text-muted)', fontSize: 12 }}>
            <span><EnvironmentOutlined aria-hidden="true" /> {alert.trayName}</span>
            <Tooltip title={`Mã kỹ thuật: ${alert.deviceId}`}>
              <span><ClusterOutlined aria-hidden="true" /> {formatFriendlyDeviceLocation(alert.deviceId)}</span>
            </Tooltip>
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Thời gian',
      key: 'timestamp',
      width: 150,
      render: (_, alert) => (
        <Tooltip title={dayjs(alert.timestamp).format('DD/MM/YYYY HH:mm:ss')}>
          <span style={{ color: 'var(--mcms-text-muted)', fontSize: 12 }}>
            <ClockCircleOutlined aria-hidden="true" /> {formatRelativeTime(alert.timestamp)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      className: 'ant-table-cell-action',
      width: 96,
      render: (_, alert) => (
        <Flex gap={4}>
          <ActionButton
            variant="text"
            icon={<CheckOutlined />}
            label="Xác nhận"
            description={`Xác nhận cảnh báo: ${alert.message}`}
            hideLabel
            onClick={() => navigate('/alerts')}
          />
          <ActionButton
            variant="text"
            icon={<ArrowRightOutlined />}
            label="Xem"
            description="Xem chi tiết tại trang Quản lý cảnh báo"
            hideLabel
            onClick={() => navigate('/alerts')}
          />
        </Flex>
      ),
    },
  ]

  return (
    <Card className="recent-alerts-card" size="small">
      <div className="recent-alerts-header">
        <div>
          <Typography.Title level={2} style={{ fontSize: 15 }}>Cảnh báo gần đây</Typography.Title>
          <Typography.Text type="secondary">
            {totalUnacknowledged > 0
              ? `${totalUnacknowledged} sự cố chưa được xác nhận`
              : 'Không có sự cố đang chờ'}
          </Typography.Text>
        </div>
        <ActionButton
          variant="text"
          icon={<ArrowRightOutlined />}
          label="Xem tất cả"
          onClick={() => navigate('/alerts')}
        />
      </div>
      <DataTable<SystemAlert>
        columns={columns}
        dataSource={recentAlerts}
        rowKey="id"
        pagination={false}
        scrollX={720}
        emptyTitle="Không có cảnh báo đang chờ xử lý"
      />
    </Card>
  )
}

function formatRelativeTime(timestamp: string): string {
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
