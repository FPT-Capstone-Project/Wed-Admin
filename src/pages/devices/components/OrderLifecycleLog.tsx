import {
CheckCircleOutlined,
CloudOutlined,
NodeIndexOutlined,
PlayCircleOutlined,
ThunderboltOutlined,
WarningOutlined
} from '@ant-design/icons'
import { Tag,Timeline } from 'antd'
import type {
OrderStatusLog,
OrderStatusLogType,
RentalSession,
} from '../../../types/iot-history'

interface OrderLifecycleLogProps {
  session: RentalSession
}

const LOG_PRESENTATION: Record<
  OrderStatusLogType,
  { color: string; icon: React.ReactNode; label: string }
> = {
  ORDER_STARTED: {
    color: 'blue',
    icon: <PlayCircleOutlined />,
    label: 'Khởi tạo',
  },
  STAGE_CHANGED: {
    color: 'green',
    icon: <NodeIndexOutlined />,
    label: 'Chuyển stage',
  },
  IRRIGATION: {
    color: 'cyan',
    icon: <CloudOutlined />,
    label: 'Tưới',
  },
  VENTILATION: {
    color: 'purple',
    icon: <ThunderboltOutlined />,
    label: 'Thông gió',
  },
  CLIMATE_ALERT: {
    color: 'orange',
    icon: <WarningOutlined />,
    label: 'Cảnh báo',
  },
  HARVEST_COMPLETED: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    label: 'Thu hoạch',
  },
  ORDER_OVERDUE: {
    color: 'red',
    icon: <WarningOutlined />,
    label: 'Quá hạn',
  },
}

function formatLogTimestamp(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function renderLog(log: OrderStatusLog) {
  const presentation = LOG_PRESENTATION[log.type]

  return {
    color: presentation.color,
    icon: <span className="order-log-dot">{presentation.icon}</span>,
    content: (
      <div className="order-lifecycle-log-entry">
        <div className="order-lifecycle-log-entry-heading">
          <strong>{log.title}</strong>
          <Tag color={presentation.color}>{presentation.label}</Tag>
        </div>
        <p>{log.description}</p>
        <span>
          {formatLogTimestamp(log.timestamp)} · {log.actor}
        </span>
      </div>
    ),
  }
}

export function OrderLifecycleLog({ session }: OrderLifecycleLogProps) {
  return (
    <section
      className="order-lifecycle-panel"
      aria-labelledby="order-lifecycle-heading"
    >
      <div className="order-lifecycle-header">
        <div>
          <span>
            <h3 id="order-lifecycle-heading">Nhật ký lifecycle Order / Mẻ</h3>
            <p>
              Toàn bộ mốc sinh trưởng và tác động vận hành của phiên đang chọn
            </p>
          </span>
        </div>
        <div className="order-lifecycle-context" aria-label="Định danh lifecycle">
          <Tag color="processing">{session.orderId}</Tag>
          <Tag>{session.batchId}</Tag>
          <Tag>{session.trayId}</Tag>
        </div>
      </div>

      <Timeline
        className="order-lifecycle-timeline"
        items={session.statusLogs.map(renderLog)}
      />
    </section>
  )
}
