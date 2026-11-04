import { ChartFrame, ChartLegend, ChartTooltipSurface } from '../../../shared/ui/charts/ChartPrimitives'
import { useChartMotion } from '../../../shared/ui/charts/useChartMotion'
import { chartTickStyle } from '../../../shared/ui/charts/chart-styles'
import { formatMeasurement } from '../../../shared/utils/measurement-format'
import '../device-industrial.css'
import {
  CloudOutlined,
  CompressOutlined,
  ExpandOutlined,
  NodeIndexOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Tooltip as AntTooltip, Typography } from 'antd'
import { useState } from 'react'
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps, TooltipValueType } from 'recharts'
import type {
  OrderStatusLog,
  OrderStatusLogType,
  RentalSession,
  TelemetryMetric,
  TelemetryPoint,
} from '../../../types/iot-history'
import { formatTelemetryTimestamp } from '../utils/iot-history.utils'

const METRICS: Array<{
  key: TelemetryMetric
  label: string
  color: string
  unit: string
  dash?: string
}> = [
  {
    key: 'temperature',
    label: 'Nhiệt độ',
    color: 'var(--mcms-chart-temperature)',
    unit: '°C',
  },
  {
    key: 'humidity',
    label: 'Độ ẩm',
    color: 'var(--mcms-chart-humidity)',
    unit: '%RH',
    dash: '7 4',
  },
]

/**
 * Bảng mapping sự kiện tác động -> vị trí & màu marker trên biểu đồ.
 * Tái sử dụng ngữ nghĩa từ `OrderStatusLogType` để đảm bảo nhất quán giữa
 * chart markers và bảng "Nhật ký tác động" bên dưới.
 */
const EVENT_MARKER_CONFIG: Record<
  OrderStatusLogType,
  {
    color: string
    label: string
    icon: React.ReactNode
    /** YAxisId nơi marker nên được vẽ để tránh trùng với line khác */
    anchor: 'temperature' | 'humidity'
  }
> = {
  ORDER_STARTED: {
    color: 'var(--mcms-blue, #1677ff)',
    label: 'Khởi tạo Order',
    icon: <PlayCircleOutlined />,
    anchor: 'temperature',
  },
  STAGE_CHANGED: {
    color: 'var(--mcms-primary)',
    label: 'Chuyển giai đoạn',
    icon: <NodeIndexOutlined />,
    anchor: 'temperature',
  },
  IRRIGATION: {
    color: 'var(--mcms-blue, #1677ff)',
    label: 'Tưới ẩm',
    icon: <CloudOutlined />,
    anchor: 'humidity',
  },
  VENTILATION: {
    color: 'var(--mcms-teal)',
    label: 'Thông gió',
    icon: <ThunderboltOutlined />,
    anchor: 'temperature',
  },
  CLIMATE_ALERT: {
    color: 'var(--mcms-amber)',
    label: 'Cảnh báo',
    icon: <WarningOutlined />,
    anchor: 'humidity',
  },
  HARVEST_COMPLETED: {
    color: 'var(--mcms-primary)',
    label: 'Thu hoạch',
    icon: <PlayCircleOutlined />,
    anchor: 'temperature',
  },
  ORDER_OVERDUE: {
    color: 'var(--mcms-coral)',
    label: 'Quá hạn',
    icon: <WarningOutlined />,
    anchor: 'temperature',
  },
}

interface ChartEventPoint {
  timestamp: string
  value: number
  log: OrderStatusLog
}

function getMarkerValue(
  point: TelemetryPoint | undefined,
  anchor: 'temperature' | 'humidity',
) {
  if (!point) {
    return anchor === 'temperature' ? 24 : 85
  }
  return anchor === 'temperature' ? point.temperature : point.humidity
}

interface IoTTelemetryChartProps {
  session: RentalSession
  data: TelemetryPoint[]
}

function formatAxisTimestamp(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
  }).format(new Date(value))
}

function TelemetryTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload as TelemetryPoint | undefined

  return (
    <ChartTooltipSurface className="telemetry-tooltip">
      <strong>{formatTelemetryTimestamp(String(label))}</strong>
      {point && (
        <span className="telemetry-tooltip-stage">
          Giai đoạn: <strong>{point.stageName}</strong>
        </span>
      )}
      <div className="telemetry-tooltip-values">
        {payload.map((entry) => {
          const metric = METRICS.find((item) => item.key === entry.dataKey)
          return (
            <span key={String(entry.dataKey)}>
              <i style={{ background: entry.color }} aria-hidden="true" />
              {entry.name}: {formatMeasurement(entry.value == null ? null : Number(entry.value))} {metric?.unit}
            </span>
          )
        })}
      </div>
      <div className="telemetry-relay-state">
        <span className={point?.irrigationActive ? 'is-active' : ''}>
          <CloudOutlined aria-hidden="true" />
          Van tưới: {point?.irrigationActive ? 'Bật' : 'Tắt'}
        </span>
        <span className={point?.fanActive ? 'is-active' : ''}>
          <ThunderboltOutlined aria-hidden="true" />
          Quạt: {point?.fanActive ? 'Bật' : 'Tắt'}
        </span>
      </div>
    </ChartTooltipSurface>
  )
}

export function IoTTelemetryChart({
  session,
  data,
}: IoTTelemetryChartProps) {
  const animate = useChartMotion()
  const [visibleMetrics, setVisibleMetrics] = useState<
    Record<TelemetryMetric, boolean>
  >({ temperature: true, humidity: true })
  const [range, setRange] = useState({ startIndex: 0, endIndex: data.length - 1 })

  const toggleMetric = (metric: TelemetryMetric) => {
    setVisibleMetrics((current) => ({
      ...current,
      [metric]: !current[metric],
    }))
  }

  const zoomIn = () => {
    const visiblePointCount = range.endIndex - range.startIndex + 1
    const trimSize = Math.max(1, Math.floor(visiblePointCount * 0.15))
    if (visiblePointCount <= 8) return

    setRange({
      startIndex: Math.min(range.startIndex + trimSize, range.endIndex - 4),
      endIndex: Math.max(range.endIndex - trimSize, range.startIndex + 4),
    })
  }

  const zoomOut = () => {
    const visiblePointCount = range.endIndex - range.startIndex + 1
    const expandSize = Math.max(1, Math.floor(visiblePointCount * 0.2))
    setRange({
      startIndex: Math.max(0, range.startIndex - expandSize),
      endIndex: Math.min(data.length - 1, range.endIndex + expandSize),
    })
  }

  const resetZoom = () => {
    setRange({ startIndex: 0, endIndex: Math.max(0, data.length - 1) })
  }

  const visiblePoints = data.slice(range.startIndex, range.endIndex + 1)
  const chartEventPoints = buildChartPoints(session, visiblePoints)

  return (
    <section className="iot-chart-panel mcms-iot-chart" aria-labelledby="session-chart-heading">
      <div className="iot-chart-header">
        <div>
          <Typography.Title id="session-chart-heading" level={4}>
            Time-Series {session.orderId}
          </Typography.Title>
          <Typography.Text type="secondary">
            Mẻ {session.batchId} · {data.length} điểm đo · Chu kỳ lấy mẫu 4 giờ ·{' '}
            {session.trayId}
          </Typography.Text>
        </div>
        <div className="iot-chart-tools" aria-label="Điều khiển thu phóng biểu đồ">
          <AntTooltip title="Phóng to vùng thời gian">
            <Button
              type="text"
              icon={<ExpandOutlined />}
              aria-label="Phóng to biểu đồ"
              onClick={zoomIn}
            />
          </AntTooltip>
          <AntTooltip title="Thu nhỏ vùng thời gian">
            <Button
              type="text"
              icon={<CompressOutlined />}
              aria-label="Thu nhỏ biểu đồ"
              onClick={zoomOut}
            />
          </AntTooltip>
          <AntTooltip title="Đặt lại phạm vi">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              aria-label="Đặt lại phạm vi biểu đồ"
              onClick={resetZoom}
            />
          </AntTooltip>
        </div>
      </div>

      <ChartLegend items={METRICS.map(metric => ({ key: metric.key, label: metric.label, color: metric.color, dashed: !!metric.dash, visible: visibleMetrics[metric.key] }))} onToggle={key => toggleMetric(key as TelemetryMetric)} />

      <div className="growth-stage-band-legend" aria-label="Các giai đoạn sinh trưởng của mẻ">
        {session.stagesTimeline.map((stage) => (
          <span key={stage.id}>
            <i
              style={{ backgroundColor: stage.backgroundColor }}
              aria-hidden="true"
            />
            <span>
              <strong>{stage.stageName}</strong>
              <small>
                {formatAxisTimestamp(stage.startTime)} –{' '}
                {formatAxisTimestamp(stage.endTime)}
              </small>
            </span>
          </span>
        ))}
      </div>

      <ChartFrame
        className="iot-session-chart"
        empty={!data.some(point => point.temperature != null || point.humidity != null)}
        label={`Biểu đồ nhiệt độ và độ ẩm của ${session.tenantName} trong mẻ ${session.id}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 16, right: 10, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--mcms-border)"
            />
            {session.stagesTimeline.map((stage) => (
              <ReferenceArea
                key={stage.id}
                yAxisId="temperature"
                x1={stage.startTime}
                x2={stage.endTime}
                fill={stage.backgroundColor}
                fillOpacity={1}
                strokeOpacity={0}
                ifOverflow="hidden"
              />
            ))}
            <XAxis
              dataKey="timestamp"
              minTickGap={36}
              tickFormatter={formatAxisTimestamp}
              tick={chartTickStyle}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="temperature"
              domain={[18, 32]}
              unit="°"
              width={38}
              tick={chartTickStyle}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              domain={[60, 100]}
              unit="%"
              width={42}
              tick={chartTickStyle}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={TelemetryTooltip} />
            <Line
              yAxisId="temperature"
              dataKey="temperature"
              name="Nhiệt độ"
              type="monotone"
              stroke="var(--mcms-chart-temperature)"
              strokeWidth={2}
              dot={false}
              hide={!visibleMetrics.temperature}
              isAnimationActive={animate}
            />
            <Line
              yAxisId="humidity"
              dataKey="humidity"
              name="Độ ẩm"
              type="monotone"
              stroke="var(--mcms-chart-humidity)"
              strokeWidth={2}
              strokeDasharray="7 4"
              dot={false}
              hide={!visibleMetrics.humidity}
              isAnimationActive={animate}
            />
            {chartEventPoints.map((event) => {
              const config = EVENT_MARKER_CONFIG[event.log.type]
              return (
                <ReferenceDot
                  key={event.log.id}
                  yAxisId={config.anchor}
                  x={event.timestamp}
                  y={event.value}
                  r={5}
                  ifOverflow="extendDomain"
                  fill={config.color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  shape={(props: {
                    cx?: number
                    cy?: number
                    payload?: ChartEventPoint
                  }) => (
                    <EventMarkerShape
                      cx={props.cx ?? 0}
                      cy={props.cy ?? 0}
                      color={config.color}
                      payload={props.payload ?? event}
                    />
                  )}
                />
              )
            })}
            <Brush
              dataKey="timestamp"
              height={32}
              travellerWidth={10}
              stroke="var(--mcms-border-strong)"
              fill="var(--mcms-surface-muted)"
              startIndex={range.startIndex}
              endIndex={range.endIndex}
              tickFormatter={(value) =>
                new Intl.DateTimeFormat('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                }).format(new Date(String(value)))
              }
              onChange={(nextRange) => {
                if (
                  typeof nextRange.startIndex === 'number' &&
                  typeof nextRange.endIndex === 'number'
                ) {
                  setRange({
                    startIndex: nextRange.startIndex,
                    endIndex: nextRange.endIndex,
                  })
                }
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      {chartEventPoints.length > 0 && (
        <div className="chart-event-legend" aria-label="Chú thích marker sự kiện">
          <strong>Sự kiện đã đánh dấu trên timeline:</strong>
          <ul>
            {chartEventPoints.map((event) => {
              const config = EVENT_MARKER_CONFIG[event.log.type]
              return (
                <li key={event.log.id}>
                  <span
                    className="chart-event-legend-dot"
                    style={{ backgroundColor: config.color }}
                    aria-hidden="true"
                  />
                  <span className="chart-event-legend-title">{event.log.title}</span>
                  <small>
                    {formatAxisTimestamp(event.timestamp)} · {event.log.actor}
                  </small>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

interface EventMarkerShapeProps {
  cx: number
  cy: number
  color: string
  payload: ChartEventPoint
}

function EventMarkerShape({ cx, cy, color, payload }: EventMarkerShapeProps) {
  if (Number.isNaN(cx) || Number.isNaN(cy)) {
    return null
  }
  const config = EVENT_MARKER_CONFIG[payload.log.type]

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#ffffff"
        stroke={color}
        strokeWidth={1.5}
      />
      <circle cx={cx} cy={cy} r={2.6} fill={color} />
      <title>
        {config.label}: {payload.log.title} · {payload.log.actor}
      </title>
    </g>
  )
}

function buildChartPoints(
  session: RentalSession,
  visiblePoints: TelemetryPoint[],
): ChartEventPoint[] {
  if (visiblePoints.length === 0) {
    return []
  }

  const dataByTimestamp = new Map<string, TelemetryPoint>(
    visiblePoints.map((point) => [point.timestamp, point]),
  )
  const fallbackPoint = visiblePoints[0]

  return session.statusLogs
    .filter((log) => {
      const timestamp = new Date(log.timestamp).getTime()
      const start = new Date(session.startDate).getTime()
      const end = new Date(session.endDate).getTime()
      return timestamp >= start && timestamp <= end
    })
    .map((log) => {
      const config = EVENT_MARKER_CONFIG[log.type]
      const anchorPoint = dataByTimestamp.get(log.timestamp) ?? fallbackPoint
      return {
        timestamp: log.timestamp,
        value: getMarkerValue(anchorPoint, config.anchor),
        log,
      }
    })
}
