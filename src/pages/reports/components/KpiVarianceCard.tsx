import {
  ArrowDownOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import { Flex, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'
import { StatCard } from '../../../shared/ui'
import { tones, type SemanticTone } from '../../../app/theme/tokens'

interface KpiVarianceCardProps {
  icon: ReactNode
  /** Màu nền icon — lấy từ token, không hardcode hex. */
  iconBg: string
  /** Màu chữ icon — lấy từ token, không hardcode hex. */
  iconColor: string
  title: string
  currentLabel: string
  currentValue: string
  previousLabel: string
  previousValue: string
  /** Phần trăm chênh lệch (có thể âm) */
  deltaPercent: number
  /** Ngữ cảnh đánh giá — true = tăng là tốt, false = giảm mới là tốt */
  higherIsBetter?: boolean
  /** Sub-text phụ (vd: "10/12 khay") */
  subtitle?: string
}

/**
 * Thẻ KPI có chênh lệch so với kỳ trước.
 *
 * Mọi màu đều lấy từ `tokens.ts` (`tones`) nên bảo đảm tương phản WCAG AA
 * và đồng bộ theme, không hardcode hex.
 */
export function KpiVarianceCard({
  icon,
  title,
  currentLabel,
  currentValue,
  previousLabel,
  previousValue,
  deltaPercent,
  higherIsBetter = true,
  subtitle,
}: KpiVarianceCardProps) {
  const isImprovement = higherIsBetter
    ? deltaPercent >= 0
    : deltaPercent <= 0

  const tone: SemanticTone = isImprovement ? 'ok' : 'danger'
  const palette = tones[tone]
  const ArrowIcon = deltaPercent >= 0 ? ArrowUpOutlined : ArrowDownOutlined
  const formattedDelta = `${Math.abs(deltaPercent).toFixed(1)}%`
  const directionSign = deltaPercent >= 0 ? '+' : '-'

  return (
    <StatCard
      title={title}
      value={currentValue}
      icon={icon}
      description={currentLabel}
      style={{ height: '100%' }}
      extra={
        <Flex vertical gap={4}>
          {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
          <Flex align="center" gap={8} wrap>
            <Tooltip title={`${previousLabel}: ${previousValue}`}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {previousLabel}: <strong>{previousValue}</strong>
              </Typography.Text>
            </Tooltip>
            <span style={{ color: palette.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              <ArrowIcon aria-hidden="true" /> {directionSign}{formattedDelta}
            </span>
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {isImprovement ? 'Đang cải thiện so với kỳ trước' : 'Cần chú ý so với kỳ trước'}
          </Typography.Text>
        </Flex>
      }
    />
  )
}
