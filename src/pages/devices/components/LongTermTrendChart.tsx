import '../device-industrial.css'
import { CloudOutlined, FireOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import { useState } from 'react'
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HistoryGranularity } from '../../../types/iot-history'
import type {
  AggregatedTelemetryPoint,
  ComparisonTelemetryPoint,
} from '../utils/iot-history.utils'

interface LongTermTrendChartProps {
  aggregatedData: AggregatedTelemetryPoint[]
  comparisonData: ComparisonTelemetryPoint[]
  /** Cặp năm được so sánh (cũ → mới). */
  comparisonYears: [number, number] | null
  granularity: HistoryGranularity
  isComparison: boolean
  trayId: string
}

interface TrendLineDefinition {
  key: string
  label: string
  color: string
  yAxisId: 'temperature' | 'humidity'
  dash?: string
}

interface LongTermChartDatum {
  label: string
  period: number
  temperature?: number
  humidity?: number
  temperatureYearA?: number
  temperatureYearB?: number
  humidityYearA?: number
  humidityYearB?: number
}

const STANDARD_LINES: TrendLineDefinition[] = [
  {
    key: 'temperature',
    label: 'Nhiệt độ TB',
    color: 'var(--mcms-chart-temperature)',
    yAxisId: 'temperature',
  },
  {
    key: 'humidity',
    label: 'Độ ẩm TB',
    color: 'var(--mcms-chart-humidity)',
    yAxisId: 'humidity',
    dash: '7 4',
  },
]

/**
 * Dựng 4 chuỗi so sánh (nhiệt độ / độ ẩm của 2 năm) theo cặp năm thực tế.
 */
function buildComparisonLines(
  years: [number, number] | null,
): TrendLineDefinition[] {
  if (!years) return []
  const [yearA, yearB] = years

  return [
    {
      key: 'temperatureYearA',
      label: `Nhiệt độ ${yearA}`,
      color: 'var(--mcms-chart-temperature)',
      yAxisId: 'temperature',
      dash: '7 4',
    },
    {
      key: 'temperatureYearB',
      label: `Nhiệt độ ${yearB}`,
      color: 'var(--mcms-chart-temperature)',
      yAxisId: 'temperature',
    },
    {
      key: 'humidityYearA',
      label: `Độ ẩm ${yearA}`,
      color: 'var(--mcms-chart-humidity)',
      yAxisId: 'humidity',
      dash: '2 5',
    },
    {
      key: 'humidityYearB',
      label: `Độ ẩm ${yearB}`,
      color: 'var(--mcms-chart-humidity)',
      yAxisId: 'humidity',
    },
  ]
}

export function LongTermTrendChart({
  aggregatedData,
  comparisonData,
  comparisonYears,
  granularity,
  isComparison,
  trayId,
}: LongTermTrendChartProps) {
  const lines = isComparison
    ? buildComparisonLines(comparisonYears)
    : STANDARD_LINES
  const data: LongTermChartDatum[] = isComparison
    ? comparisonData
    : aggregatedData
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({})

  return (
    <section className="iot-chart-panel mcms-iot-chart" aria-labelledby="long-term-chart-heading">
      <div className="iot-chart-header">
        <div>
          <Typography.Title id="long-term-chart-heading" level={4}>
            Xu hướng vi khí hậu dài hạn
          </Typography.Title>
          <Typography.Text type="secondary">
            Trung bình theo {granularity === 'MONTH' ? 'tháng' : 'tuần'} · {trayId}
          </Typography.Text>
        </div>
        <span className="long-term-chart-count">{data.length} mốc dữ liệu</span>
      </div>

      <div className="chart-toggle-legend" aria-label="Ẩn hoặc hiện chuỗi dữ liệu">
        {lines.map((line) => (
          <button
            key={line.key}
            type="button"
            className={!hiddenLines[line.key] ? 'is-visible' : ''}
            aria-pressed={!hiddenLines[line.key]}
            onClick={() =>
              setHiddenLines((current) => ({
                ...current,
                [line.key]: !current[line.key],
              }))
            }
          >
            <span
              style={{
                borderColor: line.color,
                borderTopStyle: line.dash ? 'dashed' : 'solid',
              }}
              aria-hidden="true"
            />
            {line.yAxisId === 'temperature' ? (
              <FireOutlined aria-hidden="true" />
            ) : (
              <CloudOutlined aria-hidden="true" />
            )}
            {line.label}
          </button>
        ))}
      </div>

      <div
        className="iot-long-term-chart"
        role="img"
        aria-label={`Biểu đồ xu hướng nhiệt độ và độ ẩm dài hạn của ${trayId}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 10, left: 0, bottom: 8 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--mcms-border)"
            />
            <XAxis
              dataKey="label"
              minTickGap={32}
              tick={{ fill: 'var(--mcms-nav-item-icon)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="temperature"
              domain={[18, 32]}
              unit="°"
              width={38}
              tick={{ fill: 'var(--mcms-nav-item-icon)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              domain={[60, 100]}
              unit="%"
              width={42}
              tick={{ fill: 'var(--mcms-nav-item-icon)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                border: '1px solid var(--mcms-border)',
                borderRadius: 6,
                background: 'var(--mcms-surface)',
                boxShadow: 'none',
                fontSize: 12,
              }}
              formatter={(value, name) => [
                `${Number(value).toLocaleString('vi-VN')} ${String(name).includes('Nhiệt') ? '°C' : '%RH'}`,
                name,
              ]}
            />
            {lines.map((line) => (
              <Line
                key={line.key}
                yAxisId={line.yAxisId}
                dataKey={line.key}
                name={line.label}
                type="monotone"
                stroke={line.color}
                strokeWidth={2}
                strokeDasharray={line.dash}
                connectNulls={false}
                dot={false}
                hide={Boolean(hiddenLines[line.key])}
                isAnimationActive={false}
              />
            ))}
            <Brush
              dataKey="label"
              height={30}
              travellerWidth={10}
              stroke="var(--mcms-border-strong)"
              fill="var(--mcms-surface-muted)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
