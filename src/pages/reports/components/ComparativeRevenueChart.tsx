import { formatVND } from '../../../shared/utils/currency'
import { ChartFrame, ChartLegend, ChartTooltipSurface } from '../../../shared/ui/charts/ChartPrimitives'
import { useChartMotion } from '../../../shared/ui/charts/useChartMotion'
import { chartTickStyle } from '../../../shared/ui/charts/chart-styles'
import '../../../styles/reports-users-industrial.css'
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
import { tones, chartSeries } from '../../../app/theme/tokens'
import type { MonthlyRevenuePoint } from '../../../features/analytics/utils/executive-report.utils'

interface ComparativeRevenueChartProps {
  data: MonthlyRevenuePoint[]
  currentLabel: string
  previousLabel: string
  height?: number
}

const CURRENT_COLOR = chartSeries.revenue
const PREVIOUS_COLOR = chartSeries.revenuePrevious

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
  const previous = payload.find((p) => p.dataKey === 'previous')?.value
  const hasPrevious = previous != null
  const difference = hasPrevious ? current - previous : 0
  const deltaPercent = hasPrevious && previous > 0 ? (difference / previous) * 100 : 0
  const isImprovement = difference >= 0

  return (
    <ChartTooltipSurface>
      <TypographyMonth label={label} />
      <TooltipRow
        color={CURRENT_COLOR}
        label="Doanh thu kỳ này"
        value={formatVND(current)}
      />
      <TooltipRow
        color={PREVIOUS_COLOR}
        label="Doanh thu kỳ trước"
        value={hasPrevious ? formatVND(previous) : 'Chưa có dữ liệu kỳ trước'}
      />
      {hasPrevious && <>
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
          {formatVND(difference)}
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
      </>}
    </ChartTooltipSurface>
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
  const animate = useChartMotion()
  const totals = useMemo(() => {
    return data.reduce(
      (acc, point) => {
        acc.current += point.current
        acc.previous += point.previous ?? 0
        return acc
      },
      { current: 0, previous: 0 },
    )
  }, [data])

  const hasPreviousData = data.some((point) => point.previous != null)

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
            {formatVND(totals.current)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--mcms-text-muted)' }}>So với kỳ trước</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: !hasPreviousData ? 'var(--mcms-text-muted)' : totalDelta >= 0 ? tones.ok.text : tones.danger.text,
            }}
          >
            {hasPreviousData
              ? `${totalDelta >= 0 ? '+' : ''}${totalDelta.toFixed(1)}%`
              : 'Chưa có dữ liệu kỳ trước'}
          </div>
        </div>
      </div>

      {/*
        ── Container cố định cho ResponsiveContainer ──────────────────────
        Width/height bằng pixel (không %) để Recharts tính đúng layout
        ngay từ mount đầu tiên — tránh height=0 hoặc resize loop trong Flex.
      */}
      <ChartFrame height={height} label="So sánh doanh thu theo kỳ" empty={data.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mcms-border)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={chartTickStyle}
              axisLine={{ stroke: 'var(--mcms-border)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatVND(v, { compact: true })}
              tick={chartTickStyle}
              axisLine={{ stroke: 'var(--mcms-border)' }}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--mcms-surface-hover)' }}
            />
            <Legend content={() => <ChartLegend items={[
              ...(hasPreviousData ? [{ key: 'previous', label: previousLabel, color: PREVIOUS_COLOR }] : []),
              { key: 'current', label: currentLabel, color: CURRENT_COLOR },
            ]} />} />
            {hasPreviousData && <Bar
              isAnimationActive={animate}
              dataKey="previous"
              name="previous"
              fill={PREVIOUS_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />}
            <Bar
              isAnimationActive={animate}
              dataKey="current"
              name="current"
              fill={CURRENT_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
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
