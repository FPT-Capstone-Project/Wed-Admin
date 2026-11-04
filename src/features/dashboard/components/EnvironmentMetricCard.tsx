/**
 * EnvironmentMetricCard — thẻ chỉ số môi trường (Nhiệt độ / Độ ẩm).
 *
 * Refactor dùng `StatCard` từ shared/ui để đảm bảo nhất quán phân cấp thị giác
 * và không hardcode màu.
 *
 * `tone` giữ tương thích với nơi gọi; `statusTone` biểu diễn trạng thái
 * vận hành độc lập với loại chỉ số (nhiệt độ, độ ẩm, CO₂, ánh sáng).
 */
import type { ReactNode } from 'react'
import { Tooltip } from 'antd'
import { formatMeasurement, formatMeasurementDetails } from '../../../shared/utils/measurement-format'
import { StatCard, StatusBadge } from '../../../shared/ui'
import type { SemanticTone } from '../../../app/theme/tokens'

type EnvironmentTone = 'coral' | 'teal'

interface EnvironmentMetricCardProps {
  title: string
  value: number | null
  unit: string
  icon: ReactNode
  tone: EnvironmentTone
  /** Operational health is independent of the telemetry category. */
  statusTone?: SemanticTone
  /** Nhãn trạng thái ngắn — "Ổn định", "Tối ưu", "An toàn". */
  status: string
  /** Ngưỡng mục tiêu hiển thị dưới giá trị. */
  target: string
  details?: string[]
  precision?: number
}

export function EnvironmentMetricCard({
  title,
  value,
  unit,
  icon,
  statusTone = 'neutral',
  status,
  target,
  details = [],
}: EnvironmentMetricCardProps) {
  const formattedValue = formatMeasurement(value)
  const explanation = [title, `${formattedValue}${value == null ? '' : unit}`, status,
    target, ...details.map(formatMeasurementDetails)].join('. ')

  return (
    <Tooltip title={explanation} trigger={['hover', 'focus']}>
    <div tabIndex={0} aria-label={explanation} style={{ height: '100%' }}>
    <StatCard
      title={title}
      value={<>{formattedValue}{details.some(detail => detail.includes('>')) && <small aria-hidden="true"> ▲</small>}{details.some(detail => detail.includes('<')) && <small aria-hidden="true"> ▼</small>}</>}
      suffix={unit}
      icon={icon}
      tone={statusTone}
      highlightValue
      description={
          <StatusBadge tone={statusTone} label={status} />
      }
    />
    </div>
    </Tooltip>
  )
}
