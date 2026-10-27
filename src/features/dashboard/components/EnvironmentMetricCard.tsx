/**
 * EnvironmentMetricCard — thẻ chỉ số môi trường (Nhiệt độ / Độ ẩm).
 *
 * Refactor dùng `StatCard` từ shared/ui để đảm bảo nhất quán phân cấp thị giác
 * và không hardcode màu.
 *
 * Mapping tone:
 *   coral → danger (đỏ cam, nhiệt độ)
 *   teal  → info   (xanh teal, độ ẩm)
 */
import type { ReactNode } from 'react'
import { Flex } from 'antd'
import { StatCard, StatusBadge } from '../../../shared/ui'
import type { SemanticTone } from '../../../app/theme/tokens'

type EnvironmentTone = 'coral' | 'teal'

const TONE_MAP: Record<EnvironmentTone, SemanticTone> = {
  coral: 'danger',
  teal: 'info',
}

interface EnvironmentMetricCardProps {
  title: string
  value: number
  unit: string
  icon: ReactNode
  tone: EnvironmentTone
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
  tone,
  status,
  target,
  precision = 0,
}: EnvironmentMetricCardProps) {
  const semanticTone = TONE_MAP[tone]

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
      tone={semanticTone}
      description={
        <Flex vertical gap={6}>
          {/* Badge trạng thái — dùng StatusBadge, không hardcode màu */}
          <StatusBadge tone={semanticTone} label={status} />
          {/* Ngưỡng mục tiêu */}
          <span>{target}</span>
        </Flex>
      }
    />
  )
}
