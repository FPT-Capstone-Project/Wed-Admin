import { ChartFrame, ChartLegend, ChartTooltipSurface } from '../../../shared/ui/charts/ChartPrimitives'
import { useChartMotion } from '../../../shared/ui/charts/useChartMotion'
import { chartTickStyle } from '../../../shared/ui/charts/chart-styles'
import { useMemo } from 'react'
import { Card, Col, Empty, Row, Typography } from 'antd'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartSeries, tones } from '../../../app/theme/tokens'
import { formatMeasurement } from '../../../shared/utils/measurement-format'
import { evaluateHumidity, evaluateTemperature } from '../../rooms/utils/tray-climate.utils'
import { getClimateDirection } from '../../rooms/utils/climate-tone.utils'
import type { EnvironmentChartFloor } from '../utils/environment-history.utils'
import { climateAxis } from '../utils/climate-axis.utils'

/**
 * EnvironmentChart — biểu đồ giám sát môi trường theo tầng.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/analytics/dashboard/environment-history`
 *   (một request cho **mọi** tầng) — xem `useEnvironmentHistory`.
 *
 * Mỗi tầng là **một** biểu đồ đường:
 *   - Trục tung **trái**  = nhiệt độ (°C) — đường liền, **đỏ**.
 *   - Trục tung **phải** = độ ẩm (%RH) — đường **đứt**, **xanh dương**.
 *   - Trục hoành        = thời gian (bucket 15 phút), nhãn `HH:mm` kiểu vi-VN.
 *
 * ⚠ Màu chữ trong tooltip **theo đúng màu đường** (`chartSeries`) ⇒ nhận diện
 *   chỉ số bằng màu giống hệt đường vẽ, không dùng màu tone trạng thái
 *   (xanh lá "ổn") vốn dễ gây nhầm với màu đường.
 *
 * Mỗi metric được gộp theo bucket **bởi BE** (trung bình theo cảm biến rồi
 * trung bình đều giữa các cảm biến) ⇒ FE không cần gom lại lần nữa.
 */

/** Bucket mặc định của BE (15 phút) — dùng khi BE không trả kích thước bucket. */
const DEFAULT_BUCKET_MS = 15 * 60_000

const timeLabel = (value: number) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

export interface EnvironmentChartProps {
  /** Các tầng đã sẵn sàng để vẽ. */
  data?: EnvironmentChartFloor[]
  /** Đầu cửa sổ (epoch ms) do BE trả — domain trục hoành. */
  from?: number
  /** Cuối cửa sổ **exclusive** (epoch ms) do BE trả — domain trục hoành. */
  to?: number
}

export function EnvironmentChart({ data = [], from, to }: EnvironmentChartProps) {
  if (!data.length) return <Empty description="Chưa có dữ liệu tầng" />
  return <Row gutter={[12, 12]}>
    {data.map(floor => <Col xs={24} lg={12} key={floor.floorId}>
      <FloorChart floor={floor} from={from} to={to} />
    </Col>)}
  </Row>
}

function ClimateHistoryTooltip({ active, payload, floor }: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: { timestamp: number; temperature: number | null; humidity: number | null } }>
  floor: EnvironmentChartFloor
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return <ChartTooltipSurface>
    <strong>{timeLabel(point.timestamp)}</strong>
    {(['temperature', 'humidity'] as const).map(metric => {
      const reading = (metric === 'temperature' ? evaluateTemperature : evaluateHumidity)(point[metric], floor.thresholds)
      const direction = getClimateDirection(reading)
      const unit = metric === 'temperature' ? '°C' : '%RH'
      const value = point[metric]
      const target = [reading.min == null ? null : `≥ ${formatMeasurement(reading.min)}${unit}`,
        reading.max == null ? null : `≤ ${formatMeasurement(reading.max)}${unit}`].filter(Boolean).join(', ') || 'Chưa có ngưỡng'
      return <div key={metric}>
        {/*
          ⚠ Màu chữ giá trị **theo màu đường biểu đồ** (nhiệt độ = đỏ, độ ẩm =
          xanh dương) ⇒ người dùng nhận diện chỉ số bằng màu giống hệt đường
          vẽ bên dưới, không phải màu tone trạng thái (xanh lá = "ổn") vốn
          gây nhầm lẫn với màu đường.

          ⚠ Chỉ dùng tone `muted` khi **thực sự thiếu dữ liệu** — tầng chưa
          có cấu hình ngưỡng (`direction === 'unknown'`) vẫn có số đo hợp lệ,
          không được hiển thị "—" (trước đây điều này làm mất dữ liệu thật).
        */}
        <span style={{ color: value == null ? tones.muted.text : chartSeries[metric] }}>
          {metric === 'temperature' ? 'Nhiệt độ' : 'Độ ẩm'}: {formatMeasurement(value)}{value != null && unit} {direction === 'high' ? '▲' : direction === 'low' ? '▼' : ''}
        </span>
        <div>Mục tiêu: {target}</div>
        {(direction === 'high' || direction === 'low') && <div style={{ color: value == null ? tones.muted.text : chartSeries[metric] }}>{direction === 'high' ? 'Cao' : 'Thấp'} hơn ngưỡng {formatMeasurement(reading.deviation)}{unit}</div>}
      </div>
    })}
  </ChartTooltipSurface>
}

function FloorChart({ floor, from, to }: { floor: EnvironmentChartFloor; from?: number; to?: number }) {
  const animate = useChartMotion()
  const points = floor.points
  const hasData = points.some(point => point.temperature != null || point.humidity != null)

  // Domain trục Y suy ra từ dữ liệu thật (bước 1/2/5×10ⁿ) — không hardcode.
  const temperatureAxis = useMemo(() => climateAxis(points.map(point => point.temperature)), [points])
  const humidityAxis = useMemo(() => climateAxis(points.map(point => point.humidity)), [points])

  /**
   * Trục hoành là thang số thực (epoch ms).
   *
   * Ưu tiên cửa sổ BE trả (`from`/`to`); thiếu thì suy ra từ điểm đầu/cuối
   * cộng 1 bucket. Nhờ vậy đường biểu diễn trải hết bề ngang, kể cả bucket
   * cuối không có dữ liệu (trục không bị co lại theo dữ liệu).
   */
  const xDomain = useMemo<[number, number]>(() => {
    if (from != null && to != null && to > from) return [from, to]
    const first = points[0]?.timestamp ?? 0
    const last = points[points.length - 1]?.timestamp ?? 0
    return [first, last + DEFAULT_BUCKET_MS]
  }, [from, to, points])

  return <Card size="small" className="environment-chart-card" style={{ height: '100%' }}>
    <Typography.Title level={3} style={{ fontSize: 14 }}>{floor.floorName}</Typography.Title>
    {<ChartFrame empty={!hasData} label={`${floor.floorName}: nhiệt độ và độ ẩm trong 24 giờ, trung bình mỗi 15 phút; đường đứt là độ ẩm, khoảng trống là thiếu dữ liệu.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--mcms-border)" strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" type="number" domain={xDomain} tickFormatter={timeLabel} minTickGap={45} tick={chartTickStyle} />
            <YAxis yAxisId="temperature" {...temperatureAxis} width={48} tickFormatter={formatMeasurement} unit="°C" tick={chartTickStyle} />
            <YAxis yAxisId="humidity" {...humidityAxis} orientation="right" width={64} tickFormatter={formatMeasurement} unit="%RH" tick={chartTickStyle} />
            <Tooltip content={props => <ClimateHistoryTooltip active={props.active} payload={props.payload} floor={floor} />} />
            <Legend content={() => <ChartLegend items={[
                { key: 'temperature', label: 'Nhiệt độ (°C)', color: chartSeries.temperature },
                { key: 'humidity', label: 'Độ ẩm (%RH)', color: chartSeries.humidity, dashed: true },
              ]} />} />
            <Line yAxisId="temperature" dataKey="temperature" name="Nhiệt độ (°C)" stroke={chartSeries.temperature} type="linear" dot={{ r: 2 }} connectNulls={false} isAnimationActive={animate} />
            <Line yAxisId="humidity" dataKey="humidity" name="Độ ẩm (%RH)" stroke={chartSeries.humidity} strokeDasharray="7 4" type="linear" dot={{ r: 2 }} connectNulls={false} isAnimationActive={animate} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>}
  </Card>
}
