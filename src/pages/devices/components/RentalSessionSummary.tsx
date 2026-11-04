import {
  CalendarOutlined,
  CloudOutlined,
  ExperimentOutlined,
  FireOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { RentalSession } from '../../../types/iot-history'
import { getClimateTone } from '../../../features/rooms/utils/climate-tone.utils'
import { tones } from '../../../app/theme/tokens'
import {
  formatHistoryDate,
  formatRentalDurationLabel,
} from '../utils/iot-history.utils'

interface RentalSessionSummaryProps {
  session: RentalSession
  irrigationCount: number
}

export function RentalSessionSummary({
  session,
  irrigationCount,
}: RentalSessionSummaryProps) {
  const metrics = [
    {
      key: 'tenant',
      label: 'Khách thuê',
      value: session.tenantName,
      detail: session.tenantId,
      icon: <UserOutlined />,
      tone: 'forest',
    },
    {
      key: 'mushroom',
      label: 'Loại nấm',
      value: session.mushroomType,
      detail: `${session.orderId} · ${session.batchId}`,
      icon: <ExperimentOutlined />,
      tone: 'forest',
    },
    {
      key: 'duration',
      label: 'Thời gian thuê',
      value: formatRentalDurationLabel(session.startDate, session.endDate),
      detail: `${formatHistoryDate(session.startDate)} – ${formatHistoryDate(session.endDate)}`,
      icon: <CalendarOutlined />,
      tone: 'amber',
    },
    {
      key: 'temperature',
      label: 'Nhiệt độ TB',
      value: '—',
      detail: 'Chưa có ngưỡng lịch sử',
      icon: <FireOutlined />,
      tone: 'muted',
    },
    {
      key: 'humidity',
      label: 'Độ ẩm TB',
      value: '—',
      detail: 'Chưa có ngưỡng lịch sử',
      icon: <CloudOutlined />,
      tone: 'muted',
    },
    {
      key: 'irrigation',
      label: 'Số lần tưới',
      value: `${irrigationCount} lần`,
      detail: 'Ghi nhận từ relay',
      icon: <CloudOutlined />,
      tone: 'blue',
    },
  ] as const

  return (
    <div className="session-summary-grid">
      {metrics.map((metric) => (
        <article
          key={metric.key}
          className={`session-summary-card session-summary-card--${metric.tone}`}
        >
          <span className="session-summary-icon" aria-hidden="true">
            {metric.icon}
          </span>
          <span className="session-summary-label">{metric.label}</span>
          <strong style={metric.key === 'temperature' || metric.key === 'humidity' ? { color: tones[getClimateTone(metric.key, 'unknown')].text } : undefined}>{metric.value}</strong>
          <small>{metric.detail}</small>
        </article>
      ))}
    </div>
  )
}
