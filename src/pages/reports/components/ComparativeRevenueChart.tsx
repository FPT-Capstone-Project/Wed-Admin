import { memo, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { tones } from '../../../app/theme/tokens'

interface ComparativeChartPoint {
  month: string
  current: number
  previous: number
}

interface ComparativeRevenueChartProps {
  data: ComparativeChartPoint[]
  currentLabel: string
  previousLabel: string
  height?: number
}

const VND_COMPACT = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

const VND_FULL = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const CURRENT_COLOR = tones.ok.solid
const PREVIOUS_COLOR = tones.muted.border

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const current = (payload.find((p) => p.dataKey === 'current')?.value ?? 0)
  const previous = (payload.find((p) => p.dataKey === 'previous')?.value ?? 0)
  const difference = current - previous
  const deltaPercent = previous > 0 ? (difference / previous) * 100 : 0
  const isImprovement = difference >= 0

  return (
    <div
      style={{
        background: 'var(--mcms-surface)',
        border: '1px solid var(--mcms-border)',
        borderRadius: 'var(--mcms-radius-lg)',
        padding: 12,
        boxShadow: 'var(--mcms-shadow-sm)',
        minWidth: 220,
      }}
    >
      <TypographyMonth label={label} />
      <TooltipRow
        color={CURRENT_COLOR}
        label="Doanh thu kỳ này"
        value={VND_FULL.format(current)}
      />
      <TooltipRow
        color={PREVIOUS_COLOR}
        label="Doanh thu kỳ trước"
        value={VND_FULL.format(previous)}
      />
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid var(--mcms-border-soft)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--mcms-text-muted)' }}>Chênh lệch tuyệt đối:</span>
        <span
          style={{
            color: isImprovement ? tones.ok.text : tones.danger.text,
            fontWeight: 600,
          }}
        >
          {difference >= 0 ? '+' : ''}
          {VND_FULL.format(difference)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginTop: 2,
        }}
      >
        <span style={{ color: 'var(--mcms-text-muted)' }}>Chênh lệch tỷ lệ:</span>
        <span
          style={{
            color: isImprovement ? tones.ok.text : tones.danger.text,
            fontWeight: 600,
          }}
        >
          {deltaPercent >= 0 ? '+' : ''}
          {deltaPercent.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function TypographyMonth({ label }: { label?: string }) {
  return (
    <div
      style={{
        fontWeight: 600,
        fontSize: 13,
        color: 'var(--mcms-text)',
        marginBottom: 8,
      }}
    >
      Tháng {label}
    </div>
  )
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        marginBottom: 4,
      }}
    >
      <span style={{ color: 'var(--mcms-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: 2,
            background: color,
          }}
        />
        {label}
      </span>
      <span style={{ fontWeight: 600, color: 'var(--mcms-text)' }}>{value}</span>
    </div>
  )
}

function ComparativeRevenueChartInner({
  data,
  currentLabel,
  previousLabel,
  height = 320,
}: ComparativeRevenueChartProps) {
  const totals = useMemo(() => {
    return data.reduce(
      (acc, point) => {
        acc.current += point.current
        acc.previous += point.previous
        return acc
      },
      { current: 0, previous: 0 },
    )
  }, [data])

  const totalDelta =
    totals.previous > 0
      ? ((totals.current - totals.previous) / totals.previous) * 100
      : 0

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: 'var(--mcms-text-muted)' }}>Tổng doanh thu kỳ này</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--mcms-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {VND_FULL.format(totals.current)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--mcms-text-muted)' }}>So với kỳ trước</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: totalDelta >= 0 ? tones.ok.text : tones.danger.text,
            }}
          >
            {totalDelta >= 0 ? '+' : ''}
            {totalDelta.toFixed(1)}%
          </div>
        </div>
      </div>

      {/*
        ── Container cố định cho ResponsiveContainer ──────────────────────
        Width/height bằng pixel (không %) để Recharts tính đúng layout
        ngay từ mount đầu tiên — tránh height=0 hoặc resize loop trong Flex.
      */}
      <div style={{ width: '100%', height, minHeight: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mcms-border-soft)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--mcms-text-muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--mcms-border)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${VND_COMPACT.format(v)}`}
              tick={{ fill: 'var(--mcms-text-muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--mcms-border)' }}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--mcms-surface-hover)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
              formatter={(value) =>
                value === 'current' ? currentLabel : previousLabel
              }
            />
            <Bar
              dataKey="previous"
              name="previous"
              fill={PREVIOUS_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="current"
              name="current"
              fill={CURRENT_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * Bọc memo để tránh re-mount chart khi parent render không liên quan.
 * - Nếu `data` array tham chiếu ổn định (đã useMemo bên ngoài) → memo skip re-render.
 * - Nếu parent setState không đổi props → memo bỏ qua render hoàn toàn.
 *
 * Defensive: kiểm tra function tồn tại trước khi wrap memo —
 * tránh lỗi runtime "Component is not a function" nếu bị hot-reload lỗi.
 */
const SafeInner = (
  typeof ComparativeRevenueChartInner === 'function'
    ? ComparativeRevenueChartInner
    : (() => null)
) as typeof ComparativeRevenueChartInner

export const ComparativeRevenueChart = memo(SafeInner)
