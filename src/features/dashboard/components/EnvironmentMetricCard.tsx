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
import { Flex } from 'antd'
import { StatCard, StatusBadge } from '../../../shared/ui'
import type { SemanticTone } from '../../../app/theme/tokens'

type EnvironmentTone = 'coral' | 'teal'

interface EnvironmentMetricCardProps {
  title: string
  value: number
  unit: string
  icon: ReactNode
  tone: EnvironmentTone
  /** Operational health is independent of the telemetry category. */
  statusTone?: SemanticTone
  /** Nhãn trạng thái ngắn — "Ổn định", "Tối ưu", "An toàn". */
  status: string
  /** Ngưỡng mục tiêu hiển thị dưới giá trị. */
  target: string
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
  precision = 0,
}: EnvironmentMetricCardProps) {
  const formattedValue = value.toLocaleString('vi-VN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })

  return (
    <StatCard
      title={title}
      value={formattedValue}
      suffix={unit}
      icon={icon}
      tone={statusTone}
      description={
        <Flex vertical gap={4}>
          {/* Badge trạng thái — dùng StatusBadge, không hardcode màu */}
          <StatusBadge tone={statusTone} label={status} />
          {/* Ngưỡng mục tiêu */}
          <span>{target}</span>
        </Flex>
      }
    />
  )
}
