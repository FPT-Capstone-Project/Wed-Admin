import {
  ArrowDownOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import { Card, Flex, Tooltip, Typography } from 'antd'
import type { ReactNode } from 'react'
import { StatusBadge } from '../../../shared/ui'
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
  iconBg,
  iconColor,
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
  const directionArrow = deltaPercent >= 0 ? '↑' : '↓'

  return (
    <Card
      hoverable
      style={{
        borderRadius: 'var(--mcms-radius-xl)',
        borderColor: 'var(--mcms-border)',
        height: '100%',
      }}
      styles={{ body: { padding: 20 } }}
    >
      <Flex align="flex-start" gap={12} style={{ marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--mcms-radius-lg)',
            background: iconBg,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {title}
          </Typography.Text>
          {subtitle && (
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, display: 'block' }}
            >
              {subtitle}
            </Typography.Text>
          )}
        </div>
      </Flex>

      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, display: 'block', marginBottom: 2 }}
      >
        {currentLabel}
      </Typography.Text>

      <Typography.Title
        level={2}
        style={{
          margin: '0 0 6px',
          color: 'var(--mcms-text)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {currentValue}
      </Typography.Title>

      <Flex align="center" gap={8} wrap>
        <Tooltip title={`${previousLabel}: ${previousValue}`}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {previousLabel}: <strong>{previousValue}</strong>
          </Typography.Text>
        </Tooltip>

        <StatusBadge
          tone={tone}
          label={`${directionArrow} ${formattedDelta}`}
          icon={<ArrowIcon style={{ fontSize: 10 }} />}
        />
      </Flex>

      <Typography.Text
        type="secondary"
        style={{ fontSize: 11, display: 'block', marginTop: 4 }}
      >
        {isImprovement ? 'Đang cải thiện so với kỳ trước' : 'Cần chú ý so với kỳ trước'}
      </Typography.Text>

      <span
        aria-hidden="true"
        style={{
          display: 'block',
          height: 3,
          marginTop: 8,
          borderRadius: 'var(--mcms-radius-pill)',
          background: palette.solid,
        }}
      />
    </Card>
  )
}
