import dayjs from 'dayjs'
import { Flex, Tooltip, Typography } from 'antd'
import { MetadataBadge, StatusBadge } from '../../../shared/ui'
import {
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_CONFIG,
  ALERT_SOURCE_LABELS,
} from './alert-status.config'
import type { OperationalAlert } from '../types/alert.types'

interface AlertItemRowProps {
  alert: OperationalAlert
}

/**
 * Một dòng cảnh báo vận hành — **read-only**.
 *
 * ⚠ Không có nút "đánh dấu đã đọc" / "xác nhận xử lý": Web Admin chỉ quan
 * sát, mọi thao tác ghi do nhân viên thực hiện trên app.
 */
export function AlertItemRow({ alert }: AlertItemRowProps) {
  const severityConfig = ALERT_SEVERITY_CONFIG[alert.severity]
  const timestamp = alert.timestamp
    ? dayjs(alert.timestamp).format('DD/MM/YYYY HH:mm:ss')
    : '—'

  return (
    <Flex align="flex-start" justify="space-between" gap={16} wrap>
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
            <Typography.Text strong>{alert.title}</Typography.Text>
            {!alert.isRead && <MetadataBadge label="Chưa đọc" />}
          </Flex>

          <Typography.Paragraph
            style={{ margin: '4px 0 0', fontSize: 13 }}
            type="secondary"
          >
            {alert.message}
          </Typography.Paragraph>

          <Flex gap={8} wrap style={{ marginTop: 6, fontSize: 12 }}>
            <Typography.Text type="secondary">
              {ALERT_CATEGORY_LABELS[alert.category] ?? alert.category}
              {' · '}
              {ALERT_SOURCE_LABELS[alert.source]}
            </Typography.Text>
            {alert.floorName && (
              <Typography.Text type="secondary">· {alert.floorName}</Typography.Text>
            )}
            <Tooltip title={timestamp}>
              <Typography.Text type="secondary">· {timestamp}</Typography.Text>
            </Tooltip>
          </Flex>

          {alert.currentValue != null && (
            <Typography.Paragraph style={{ margin: '4px 0 0', fontSize: 12 }}>
              Độ ẩm tại thời điểm sự kiện:{' '}
              <strong>{alert.currentValue.toFixed(1)}%RH</strong>
            </Typography.Paragraph>
          )}
        </div>
      </Flex>

      <Flex gap={8} wrap align="center">
        <MetadataBadge label={ALERT_SOURCE_LABELS[alert.source]} />
      </Flex>
    </Flex>
  )
}
