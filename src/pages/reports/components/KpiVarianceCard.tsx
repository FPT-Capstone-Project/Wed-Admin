import {
  ArrowDownOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import { Flex, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'
import { StatCard } from '../../../shared/ui'
import { tones, type SemanticTone } from '../../../app/theme/tokens'
import { formatReportPercent } from '../report-format'

interface KpiVarianceCardProps {
  icon: ReactNode
  iconBg: string
  iconColor: string
  title: ReactNode
  currentLabel: string
  currentValue: string
  previousLabel: string
  previousValue: string
  deltaPercent: number
  higherIsBetter?: boolean
  subtitle?: string
  hasPreviousData?: boolean
}

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
  hasPreviousData = false,
}: KpiVarianceCardProps) {
  const isImprovement = higherIsBetter
    ? deltaPercent >= 0
    : deltaPercent <= 0

  const tone: SemanticTone = isImprovement ? 'ok' : 'danger'
  const palette = tones[tone]
  const ArrowIcon = deltaPercent >= 0 ? ArrowUpOutlined : ArrowDownOutlined
  const formattedDelta = formatReportPercent(Math.abs(deltaPercent))
  const directionSign = deltaPercent >= 0 ? '+' : '-'

  return (
    <StatCard
      title={title}
      value={currentValue}
      icon={icon}
      description={hasPreviousData ? currentLabel : undefined}
      style={{ height: '100%' }}
      extra={
        <Flex vertical gap={4}>
          {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
          {hasPreviousData && <Flex align="center" gap={8} wrap>
            <Tooltip title={`${previousLabel}: ${previousValue}`}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {previousLabel}: <strong>{previousValue}</strong>
              </Typography.Text>
            </Tooltip>
            {hasPreviousData && (
              <span style={{ color: palette.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                <ArrowIcon aria-hidden="true" /> {directionSign}{formattedDelta}
              </span>
            )}
          </Flex>}
          {hasPreviousData ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {isImprovement ? 'Đang cải thiện so với kỳ trước' : 'Cần chú ý so với kỳ trước'}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              — Chưa có kỳ trước
            </Typography.Text>
          )}
        </Flex>
      }
    />
  )
}
