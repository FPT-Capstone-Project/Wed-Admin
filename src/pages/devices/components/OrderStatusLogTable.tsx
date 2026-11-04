import { DataTable } from '../../../shared/ui/DataTable'
import {
  CloudOutlined,
  CloudServerOutlined,
  NodeIndexOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ReactNode } from 'react'
import type {
  OrderStatusLog,
  OrderStatusLogType,
  RentalSession,
} from '../../../types/iot-history'
import { formatTelemetryTimestamp } from '../utils/iot-history.utils'

interface OrderStatusLogTableProps {
  session: RentalSession
}

type ActorCategory = 'IOT_AUTO' | 'STAFF' | 'CUSTOMER' | 'SYSTEM'

interface LogPresentation {
  label: string
  badgeColor: string
  tagColor: string
  icon: ReactNode
}

const LOG_PRESENTATION: Record<OrderStatusLogType, LogPresentation> = {
  ORDER_STARTED: {
    label: 'Khởi tạo Order',
    badgeColor: 'var(--mcms-blue)',
    tagColor: 'blue',
    icon: <PlayCircleOutlined />,
  },
  STAGE_CHANGED: {
    label: 'Chuyển giai đoạn',
    badgeColor: 'var(--mcms-primary)',
    tagColor: 'green',
    icon: <NodeIndexOutlined />,
  },
  IRRIGATION: {
    label: 'Tưới ẩm',
    badgeColor: 'var(--mcms-blue)',
    tagColor: 'cyan',
    icon: <CloudOutlined />,
  },
  VENTILATION: {
    label: 'Thông gió',
    badgeColor: 'var(--mcms-teal)',
    tagColor: 'purple',
    icon: <ThunderboltOutlined />,
  },
  CLIMATE_ALERT: {
    label: 'Cảnh báo khí hậu',
    badgeColor: 'var(--mcms-amber)',
    tagColor: 'orange',
    icon: <WarningOutlined />,
  },
  HARVEST_COMPLETED: {
    label: 'Hoàn tất thu hoạch',
    badgeColor: 'var(--mcms-primary)',
    tagColor: 'success',
    icon: <PlayCircleOutlined />,
  },
  ORDER_OVERDUE: {
    label: 'Quá hạn',
    badgeColor: 'var(--mcms-coral)',
    tagColor: 'error',
    icon: <WarningOutlined />,
  },
}

const ACTOR_PRESENTATION: Record<
  ActorCategory,
  { label: string; icon: ReactNode; tagColor: string }
> = {
  IOT_AUTO: {
    label: 'Tự động IoT',
    icon: <ThunderboltOutlined />,
    tagColor: 'blue',
  },
  STAFF: {
    label: 'Kỹ thuật viên',
    icon: <NodeIndexOutlined />,
    tagColor: 'green',
  },
  CUSTOMER: {
    label: 'Khách hàng',
    icon: <CloudOutlined />,
    tagColor: 'purple',
  },
  SYSTEM: {
    label: 'Hệ thống',
    icon: <CloudServerOutlined />,
    tagColor: 'default',
  },
}

function inferActorCategory(actor: string): ActorCategory {
  const normalized = actor.trim().toLowerCase()
  if (
    normalized.includes('relay') ||
    normalized.includes('auto') ||
    normalized.includes('iot') ||
    normalized.includes('tự động')
  ) {
    return 'IOT_AUTO'
  }
  if (
    normalized.includes('quy trình') ||
    normalized.includes('hệ thống') ||
    normalized.includes('system') ||
    normalized.includes('mcms')
  ) {
    return 'SYSTEM'
  }
  if (
    normalized.includes('khách') ||
    normalized.includes('tenant') ||
    normalized.includes('customer')
  ) {
    return 'CUSTOMER'
  }
  return 'STAFF'
}

interface StatusLogRow extends OrderStatusLog {
  actorCategory: ActorCategory
  severityTag: 'INFO' | 'SUCCESS' | 'WARNING'
}

export function OrderStatusLogTable({ session }: OrderStatusLogTableProps) {
  const rows: StatusLogRow[] = session.statusLogs.map((log) => ({
    ...log,
    actorCategory: inferActorCategory(log.actor),
    severityTag: log.severity,
  }))

  const actorSummary = rows.reduce<Record<ActorCategory, number>>(
    (current, row) => {
      current[row.actorCategory] = (current[row.actorCategory] ?? 0) + 1
      return current
    },
    { IOT_AUTO: 0, STAFF: 0, CUSTOMER: 0, SYSTEM: 0 },
  )

  const columns: ColumnsType<StatusLogRow> = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (value: string) => (
        <span className="status-log-time">
          {formatTelemetryTimestamp(value)}
        </span>
      ),
    },
    {
      title: 'Loại tác động',
      dataIndex: 'type',
      key: 'type',
      width: 200,
      filters: (Object.keys(LOG_PRESENTATION) as OrderStatusLogType[]).map(
        (key) => ({
          text: LOG_PRESENTATION[key].label,
          value: key,
        }),
      ),
      onFilter: (value, record) => record.type === value,
      render: (_value, record) => {
        const presentation = LOG_PRESENTATION[record.type]
        return (
          <span className="status-log-type">
            <span
              className="status-log-badge"
              style={{ backgroundColor: presentation.badgeColor }}
              aria-hidden="true"
            >
              {presentation.icon}
            </span>
            <Tag color={presentation.tagColor} className="status-log-type-tag">
              {presentation.label}
            </Tag>
          </span>
        )
      },
    },
    {
      title: 'Chi tiết thao tác',
      dataIndex: 'description',
      key: 'description',
      render: (_value, record) => (
        <div className="status-log-detail">
          <strong>{record.title}</strong>
          <span>{record.description}</span>
        </div>
      ),
    },
    {
      title: 'Mức độ',
      dataIndex: 'severityTag',
      key: 'severityTag',
      width: 120,
      filters: [
        { text: 'Thông tin', value: 'INFO' },
        { text: 'Thành công', value: 'SUCCESS' },
        { text: 'Cảnh báo', value: 'WARNING' },
      ],
      onFilter: (value, record) => record.severityTag === value,
      render: (severity: StatusLogRow['severityTag']) => {
        const map: Record<StatusLogRow['severityTag'], { color: string; label: string }> = {
          INFO: { color: 'blue', label: 'Thông tin' },
          SUCCESS: { color: 'success', label: 'Thành công' },
          WARNING: { color: 'warning', label: 'Cảnh báo' },
        }
        const config = map[severity]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: 'Tác nhân',
      dataIndex: 'actor',
      key: 'actor',
      width: 200,
      filters: (Object.keys(ACTOR_PRESENTATION) as ActorCategory[]).map(
        (key) => ({
          text: ACTOR_PRESENTATION[key].label,
          value: key,
        }),
      ),
      onFilter: (value, record) => record.actorCategory === value,
      render: (_value, record) => {
        const presentation = ACTOR_PRESENTATION[record.actorCategory]
        return (
          <span className="status-log-actor">
            <Tag
              color={presentation.tagColor}
              icon={presentation.icon}
              className="status-log-actor-tag"
            >
              {presentation.label}
            </Tag>
            <small>{record.actor}</small>
          </span>
        )
      },
    },
  ]

  return (
    <section
      className="status-log-table-panel"
      aria-labelledby="status-log-table-heading"
    >
      <div className="status-log-table-header">
        <div>
          <Typography.Title id="status-log-table-heading" level={5}>
            Nhật ký tác động & Sự kiện mẻ trồng
          </Typography.Title>
          <Typography.Text type="secondary">
            Toàn bộ thao tác của hệ thống IoT, kỹ thuật viên và khách hàng trong
            vòng đời của {session.orderId}.
          </Typography.Text>
        </div>
        <div className="status-log-summary" aria-label="Tổng quan tác nhân">
          {(Object.keys(ACTOR_PRESENTATION) as ActorCategory[])
            .filter((key) => actorSummary[key] > 0)
            .map((key) => {
              const presentation = ACTOR_PRESENTATION[key]
              return (
                <span key={key} className="status-log-summary-item">
                  <i
                    style={{ color: presentation.tagColor === 'default'
                      ? 'var(--mcms-text-muted)'
                      : presentation.tagColor === 'blue'
                        ? 'var(--mcms-blue)'
                        : presentation.tagColor === 'green'
                          ? 'var(--mcms-primary)'
                          : presentation.tagColor === 'purple'
                            ? 'var(--mcms-teal)'
                            : 'var(--mcms-amber)',
                    }}
                    aria-hidden="true"
                  >
                    {presentation.icon}
                  </i>
                  <small>{presentation.label}</small>
                  <strong>{actorSummary[key]}</strong>
                </span>
              )
            })}
        </div>
      </div>

      <DataTable<StatusLogRow>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={rows}
        pagination={{ hideOnSinglePage: false, pageSize: 6, showSizeChanger: false }}
        scroll={{ x: 920 }}
        locale={{
          emptyText: 'Chưa có sự kiện nào được ghi nhận cho mẻ này.',
        }}
      />
    </section>
  )
}
