/**
 * RecentAlertsTable — widget cảnh báo gần đây trên Dashboard.
 *
 * Cải thiện:
 *   - Chuyển đổi các mã phần cứng kỹ thuật (vd: "node-stm32-01", "node-stm32-04")
 *     thành nhãn vị trí thân thiện với chủ trang trại ("Cụm cảm biến Tầng 1", "Cụm cảm biến Tầng 4").
 *   - Các nút "Xác nhận" và "Xem" tuân thủ chiều cao dễ bấm (comfort height >= 32px),
 *     đồng bộ với ActionButton và token màu sắc từ tokens.ts.
 *   - Sử dụng StatusBadge cho mức độ cảnh báo.
 */
import {
  ArrowRightOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
  WarningFilled,
} from '@ant-design/icons'
import { Badge, Button, Card, Empty, List, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlertStore } from '../../../stores/alert.store'
import type { AlertSeverity, SystemAlert } from '../../../types/alert.types'
import { tones, type SemanticTone } from '../../../app/theme/tokens'
import { ActionButton, StatusBadge } from '../../../shared/ui'
import { formatFriendlyDeviceLocation } from '../../../shared/i18n/terms'

interface SeverityConfig {
  Icon: typeof ExclamationCircleFilled
  label: string
  tone: SemanticTone
  bg: string
  color: string
}

/**
 * Cấu hình mức độ cảnh báo dùng tokens thay vì hardcode hex.
 * danger → coral, WARNING → amber, INFO → teal.
 */
const SEVERITY_CONFIG: Record<AlertSeverity, SeverityConfig> = {
  CRITICAL: {
    Icon: ExclamationCircleFilled,
    label: 'Nghiêm trọng',
    tone: 'danger',
    bg: tones.danger.bg,
    color: tones.danger.solid,
  },
  WARNING: {
    Icon: WarningFilled,
    label: 'Cảnh báo',
    tone: 'warning',
    bg: tones.warning.bg,
    color: tones.warning.solid,
  },
  INFO: {
    Icon: InfoCircleFilled,
    label: 'Thông tin',
    tone: 'info',
    bg: tones.info.bg,
    color: tones.info.solid,
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
   * Tổng unacknowledged (toàn hệ thống) — dùng cho badge tiêu đề,
   * đảm bảo luôn khớp với thẻ KPI "Cảnh báo chờ xử lý".
   */
  const totalUnacknowledged = useMemo(
    () => alerts.filter((alert) => !alert.isAcknowledged).length,
    [alerts],
  )

  return (
    <Card className="recent-alerts-card">
      <div className="recent-alerts-header">
        <div className="recent-alerts-title">
          <span className="recent-alerts-icon" aria-hidden="true">
            <ExclamationCircleFilled />
          </span>
          <div>
            <Typography.Title level={4}>Cảnh báo gần đây</Typography.Title>
            <Typography.Text type="secondary">
              {totalUnacknowledged > 0
                ? `${totalUnacknowledged} sự cố chưa được xác nhận`
                : 'Không có sự cố đang chờ'}
            </Typography.Text>
          </div>
          <Badge count={totalUnacknowledged} className="recent-alerts-count" />
        </div>

        <Tooltip title="Mở trang quản lý cảnh báo">
          <Button
            type="link"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            onClick={() => navigate('/alerts')}
          >
            Xem tất cả
          </Button>
        </Tooltip>
      </div>

      {recentAlerts.length === 0 ? (
        <Empty description="Không có cảnh báo đang chờ xử lý" />
      ) : (
        <List<SystemAlert>
          className="recent-alerts-list"
          itemLayout="horizontal"
          dataSource={recentAlerts}
          rowKey={(item) => item.id}
          renderItem={(alert) => (
            <RecentAlertItem
              alert={alert}
              onView={() => navigate('/alerts')}
            />
          )}
        />
      )}
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Item hiển thị 1 cảnh báo thu gọn — dùng trong widget Dashboard
 * ────────────────────────────────────────────────────────────────────────── */
interface RecentAlertItemProps {
  alert: SystemAlert
  onView: () => void
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

function RecentAlertItem({ alert, onView }: RecentAlertItemProps) {
  const config = SEVERITY_CONFIG[alert.severity]
  const friendlyDevice = formatFriendlyDeviceLocation(alert.deviceId)

  return (
    <List.Item className="recent-alerts-list-item">
      <div className="recent-alert-row">
        {/* StatusBadge cho mức độ cảnh báo */}
        <StatusBadge
          tone={config.tone}
          label={config.label}
          icon={<config.Icon aria-hidden="true" />}
        />

        {/* Khối nội dung chính */}
        <div className="recent-alert-content">
          <Typography.Text strong className="recent-alert-message">
            {alert.message}
          </Typography.Text>
          <div className="recent-alert-meta">
            {/* Vị trí */}
            <span className="recent-alert-meta-chip" title="Vị trí">
              <EnvironmentOutlined aria-hidden="true" />
              {alert.trayName}
            </span>
            {/* Vị trí phần cứng thân thiện (kèm tooltip mã thiết bị) */}
            <Tooltip title={`Mã kỹ thuật: ${alert.deviceId}`}>
              <span className="recent-alert-meta-chip" title="Cụm thiết bị">
                <ClusterOutlined aria-hidden="true" />
                <strong>{friendlyDevice}</strong>
              </span>
            </Tooltip>
            {/* Thời gian */}
            <Tooltip title={dayjs(alert.timestamp).format('DD/MM/YYYY HH:mm:ss')}>
              <span className="recent-alert-meta-chip recent-alert-meta-time">
                <ClockCircleOutlined aria-hidden="true" />
                {formatRelativeTime(alert.timestamp)}
              </span>
            </Tooltip>
          </div>
        </div>

        {/* Nút thao tác chuẩn ActionButton với chiều cao dễ bấm */}
        <div className="recent-alert-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ActionButton
            variant="primary"
            size="middle"
            icon={<CheckOutlined />}
            label="Xác nhận"
            description={`Xác nhận cảnh báo: ${alert.message}`}
            onClick={onView}
          />
          <ActionButton
            variant="default"
            size="middle"
            icon={<ArrowRightOutlined />}
            label="Xem"
            description="Xem chi tiết tại trang Quản lý cảnh báo"
            onClick={onView}
          />
        </div>
      </div>
    </List.Item>
  )
}
