import { formatReportMoney as formatVND, formatReportMillions, formatReportNumber, formatReportPercent, formatReportPeriod, niceRevenueTicks } from '../report-format'
import {
  ChartFrame,
  ChartTooltipSurface,
} from '../../../shared/ui/charts/ChartPrimitives'
import { chartTickStyle } from '../../../shared/ui/charts/chart-styles'
import '../../../styles/reports-users-industrial.css'
import { memo, useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { tones, chartSeries, tokens } from '../../../app/theme/tokens'
import { Empty } from 'antd'
import type { MonthlyRevenuePoint } from '../../../features/analytics/utils/executive-report.utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Granularity = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'

interface ComparativeRevenueChartProps {
  data: MonthlyRevenuePoint[]
  currentLabel: string
  previousLabel: string
  height?: number
  granularity?: Granularity
  onGranularityChange?: (g: Granularity) => void
}

// ─── Colour tokens ────────────────────────────────────────────────────────────

const CURRENT_COLOR = chartSeries.revenue
const PREVIOUS_COLOR = chartSeries.revenuePrevious
const CUMULATIVE_COLOR = tones.warning.solid // #d97706

// ─── Internal row type (adds cumulative) ─────────────────────────────────────

interface ChartRow {
  month: string
  current: number
  previous: number | null
  cumulative: number | null
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  hasPreviousData,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
  hasPreviousData: boolean
}) {
  if (!active || !payload || payload.length === 0) return null

  const current = payload.find((p) => p.dataKey === 'current')?.value ?? 0
  const previous = payload.find((p) => p.dataKey === 'previous')?.value ?? null
  const cumulative = payload.find((p) => p.dataKey === 'cumulative')?.value ?? 0

  return (
    <ChartTooltipSurface>
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--mcms-text)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <TooltipRow
        color={CURRENT_COLOR}
        label="Doanh thu kỳ này"
        value={formatVND(current)}
      />

      {hasPreviousData && previous != null && (
        <TooltipRow
          color={PREVIOUS_COLOR}
          label="Kỳ trước"
          value={formatVND(previous)}
        />
      )}

      <TooltipRow
        color={CUMULATIVE_COLOR}
        label="Lũy kế"
        value={formatVND(cumulative)}
        isLine
      />
    </ChartTooltipSurface>
  )
}

function TooltipRow({
  color,
  label,
  value,
  isLine = false,
}: {
  color: string
  label: string
  value: string
  isLine?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        fontSize: 12,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          color: 'var(--mcms-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: '0 0 auto',
          whiteSpace: 'nowrap',
        }}
      >
        {isLine ? (
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 2,
              background: color,
              borderRadius: 1,
            }}
          />
        ) : (
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              background: color,
            }}
          />
        )}
        {label}
      </span>
      <span
        style={{
          fontWeight: 600,
          color: 'var(--mcms-text)',
          flex: '1 1 auto',
          minWidth: 0,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Bar label ───────────────────────────────────────────────────────────────

function renderBarLabel(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: unknown
}, nearCumulative = false) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const width = Number(props.width ?? 0)
  const value = Number(props.value ?? 0)
  if (!value || value <= 0) return null
  return (
    <text
      x={x + width / 2}
      y={y - (nearCumulative ? 14 : 4)}
      textAnchor="middle"
      fontSize={11}
      fill={tokens.color.textMuted}
    >
      {formatReportMillions(value)}
    </text>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function ComparativeRevenueChartInner({
  data,
  currentLabel,
  previousLabel,
  height = 300,
}: ComparativeRevenueChartProps) {
  const animate = false
  const showCumulative = data.length >= 4
  const chartHeight = height

  // Compute: cumulative, hasPreviousData, padding, totals
  const { chartData, hasPreviousData, totals } = useMemo(() => {
    const hasPrev = data.some((p) => p.previous != null)

    // Build rows with cumulative
    const lastRevenueIndex = data.findLastIndex(point => point.current > 0)
    const rows = data.reduce<ChartRow[]>((acc, p, index) => {
      acc.push({
        month: formatReportPeriod(p.month),
        current: p.current,
        previous: p.previous,
        cumulative: index <= lastRevenueIndex ? (acc.at(-1)?.cumulative ?? 0) + p.current : null,
      })
      return acc
    }, [])


    const totalCurrent = data.reduce((acc, p) => acc + p.current, 0)
    const totalPrevious = data.reduce((acc, p) => acc + (p.previous ?? 0), 0)

    return {
      chartData: rows,
      hasPreviousData: hasPrev,
      totals: { current: totalCurrent, previous: totalPrevious },
    }
  }, [data])
  const ticks = niceRevenueTicks(Math.max(totals.current, ...data.map(point => point.previous ?? 0)))
  const lastCumulativeIndex = chartData.findLastIndex(point => point.cumulative != null)
  const nearCumulative = (index: number) => {
    const row = chartData[index]
    if (!showCumulative || row?.cumulative == null) return false
    const plotHeight = Math.max(1, chartHeight - 100)
    return Math.abs(row.cumulative - row.current) / (ticks.at(-1) || 1) * plotHeight < 24
  }
  const renderCumulativeDot = ({ cx, cy, index, payload }: {
    cx?: number; cy?: number; index?: number; payload?: ChartRow
  }) => {
    if (cx == null || cy == null || index == null || !payload || payload.current <= 0 || payload.cumulative == null) return <g />
    const last = index === lastCumulativeIndex
    // Keep the end label inside the plot even when the final period is at its right edge.
    const atRightEdge = index >= chartData.length - 2
    return <g>
      <circle cx={cx} cy={cy} r={2.5} fill={CUMULATIVE_COLOR} />
      {last && <text
        x={cx + (atRightEdge ? -8 : 8)}
        y={cy - (nearCumulative(index) ? 30 : 12)}
        textAnchor={atRightEdge ? 'end' : 'start'}
        fill={CUMULATIVE_COLOR}
        fontSize={11}
        fontWeight={600}
        stroke="white"
        strokeWidth={3}
        paintOrder="stroke"
      >{`Lũy kế ${formatReportMillions(payload.cumulative)}`}</text>}
    </g>
  }

  // Empty state: no data, or all current === 0
  const isEmpty =
    data.length === 0 || data.every((p) => p.current === 0)

  const totalDelta =
    hasPreviousData && totals.previous > 0
      ? ((totals.current - totals.previous) / totals.previous) * 100
      : null

  // Legend items
  const legendItems = useMemo(
    () => [
      { key: 'current', label: currentLabel, color: CURRENT_COLOR },
      ...(hasPreviousData
        ? [{ key: 'previous', label: previousLabel, color: PREVIOUS_COLOR }]
        : []),
      ...(showCumulative ? [{ key: 'cumulative', label: 'Lũy kế', color: CUMULATIVE_COLOR, dashed: true }] : []),
    ],
    [hasPreviousData, currentLabel, previousLabel, showCumulative],
  )

  return (
    <div>
      {/* ── Summary row ─────────────────────────────────────────────────── */}
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
          <div style={{ fontSize: 12, color: 'var(--mcms-text-muted)' }}>
            Tổng doanh thu kỳ này
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--mcms-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatVND(totals.current)}
            {!showCumulative && <span style={{ fontSize: 13, marginLeft: 16, fontWeight: 400 }}>Lũy kế: {formatVND(totals.current)}</span>}
          </div>
        </div>

        {hasPreviousData && <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--mcms-text-muted)' }}>
            So với kỳ trước
          </div>
          {!hasPreviousData ? (
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--mcms-text-muted)' }}>
              — <span style={{ fontSize: 12, fontWeight: 400 }}>Chưa có kỳ trước</span>
            </div>
          ) : (
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color:
                  totalDelta == null
                    ? 'var(--mcms-text-muted)'
                    : totalDelta >= 0
                    ? tones.ok.text
                    : tones.danger.text,
              }}
            >
              {totalDelta == null
                ? '—'
                : `${totalDelta >= 0 ? '+' : ''}${formatReportPercent(totalDelta)}`}
            </div>
          )}
        </div>}
      </div>

      {/* ── Chart area ──────────────────────────────────────────────────── */}
      {isEmpty ? (
        <div
          style={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Empty description="Chưa có doanh thu trong khoảng thời gian này" />
        </div>
      ) : (
        <ChartFrame
          height={chartHeight}
          label="So sánh doanh thu theo kỳ"
          empty={false}
        >
          <ResponsiveContainer width="100%" minWidth={0} height={chartHeight}>
            <ComposedChart
              data={chartData}
              margin={{ top: 44, right: 24, left: 16, bottom: 8 }}
              barCategoryGap="30%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--mcms-border)"
                vertical={false}
              />

              <XAxis
                padding={{ left: 32, right: 32 }}
                dataKey="month"
                tick={chartTickStyle}
                axisLine={{ stroke: 'var(--mcms-border)' }}
                tickLine={false}
              />

              <YAxis
                domain={[0, ticks[ticks.length - 1]]}
                ticks={ticks}
                label={{ value: 'Triệu đồng', position: 'top', offset: 12 }}
                tickFormatter={(v: number) => formatReportNumber(v / 1e6, Math.max(1, -Math.floor(Math.log10((ticks[1] ?? 1e6) / 1e6))))}
                tick={chartTickStyle}
                axisLine={{ stroke: 'var(--mcms-border)' }}
                tickLine={false}
              />

              <Tooltip
                content={
                  <CustomTooltip hasPreviousData={hasPreviousData} />
                }
                cursor={{ fill: 'transparent' }}
              />

              <Legend
                content={() => <div className="reports-chart-legend">{legendItems.map(item => <span key={item.key}>{item.key === 'cumulative' ? <span className="reports-legend-line" /> : <span className="reports-legend-square" style={{ background: item.color, marginRight: 6 }} />}{item.key === 'current' ? 'Kỳ này' : item.label}</span>)}</div>}
              />

              {hasPreviousData && (
                <Bar
                  isAnimationActive={animate}
                  dataKey="previous"
                  name="previous"
                  fill={PREVIOUS_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              )}

              <Bar
                isAnimationActive={animate}
                dataKey="current"
                name="current"
                fill={CURRENT_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              >
                <LabelList dataKey="current" content={props => renderBarLabel(props, nearCumulative(Number(props.index)))} />
              </Bar>

              {showCumulative && <Line
                isAnimationActive={animate}
                type="stepAfter"
                dataKey="cumulative"
                name="cumulative"
                stroke={CUMULATIVE_COLOR}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={renderCumulativeDot}
                activeDot={false}
              />}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
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
