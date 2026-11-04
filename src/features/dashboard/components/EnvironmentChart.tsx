import { useEffect, useState } from 'react'
import { Alert, Card, Col, Empty, Row, Spin, Typography } from 'antd'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartSeries, tones } from '../../../app/theme/tokens'
import { formatMeasurement } from '../../../shared/utils/measurement-format'
import { evaluateHumidity, evaluateTemperature } from '../../rooms/utils/tray-climate.utils'
import { getClimateDirection, getClimateTone } from '../../rooms/utils/climate-tone.utils'
import { useMasterList } from '../../devices/hooks/useIoT'
import type { FloorEnvironmentPoint } from '../hooks/useFloorEnvironmentOverview'
import { useFloorHistory } from '../hooks/useFloorHistory'
import type { FloorHistoryPoint } from '../utils/floor-history.utils'
import { climateAxis } from '../utils/climate-axis.utils'

const REFRESH_MS = 5 * 60_000
const WINDOW_MS = 24 * 60 * 60_000
const timeLabel = (value: number) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

export function EnvironmentChart({ data = [] }: { data?: FloorEnvironmentPoint[] }) {
  const masters = useMasterList({ staleTime: 60_000 })
  const [to, setTo] = useState(() => Math.floor(Date.now() / REFRESH_MS) * REFRESH_MS)
  useEffect(() => {
    const timer = window.setInterval(() => setTo(Math.floor(Date.now() / REFRESH_MS) * REFRESH_MS), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [])
  if (!data.length) return <Empty description="Chưa có dữ liệu tầng" />
  return <Row gutter={[12, 12]}>
    {data.map(floor => <Col xs={24} lg={12} key={floor.floorId}>
      <FloorChart floor={floor} masterId={masters.data?.find(master => master.id === floor.masterDbId)?.masterId ?? null} from={to - WINDOW_MS} to={to} />
    </Col>)}
  </Row>
}

function ClimateHistoryTooltip({ active, payload, floor }: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: FloorHistoryPoint }>
  floor: FloorEnvironmentPoint
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return <div style={{ background: 'var(--mcms-surface)', padding: 12, border: '1px solid var(--mcms-border)' }}>
    <strong>{timeLabel(point.timestamp)}</strong>
    {(['temperature', 'humidity'] as const).map(metric => {
      const reading = (metric === 'temperature' ? evaluateTemperature : evaluateHumidity)(point[metric], floor.thresholds)
      const direction = getClimateDirection(reading)
      const tone = getClimateTone(metric, direction)
      const unit = metric === 'temperature' ? '°C' : '%RH'
      const target = [reading.min == null ? null : `≥ ${formatMeasurement(reading.min)}${unit}`,
        reading.max == null ? null : `≤ ${formatMeasurement(reading.max)}${unit}`].filter(Boolean).join(', ') || 'Chưa có ngưỡng'
      return <div key={metric}>
        <span style={{ color: tones[tone].text }}>{metric === 'temperature' ? 'Nhiệt độ' : 'Độ ẩm'}: {formatMeasurement(tone === 'muted' ? null : point[metric])}{tone !== 'muted' && unit} {direction === 'high' ? '▲' : direction === 'low' ? '▼' : ''}</span>
        <div>Mục tiêu: {target}</div>
        {(direction === 'high' || direction === 'low') && <div>{direction === 'high' ? 'Cao' : 'Thấp'} hơn ngưỡng {formatMeasurement(reading.deviation)}{unit}</div>}
      </div>
    })}
  </div>
}

function FloorChart({ floor, masterId, from, to }: { floor: FloorEnvironmentPoint; masterId: string | null; from: number; to: number }) {
  const history = useFloorHistory(masterId, floor.nodeId, floor.sensorIds, from, to)
  const points = history.data?.points ?? []
  const hasData = points.some(point => point.temperature != null || point.humidity != null)
  const temperatureAxis = climateAxis(points.map(point => point.temperature))
  const humidityAxis = climateAxis(points.map(point => point.humidity))
  return <Card size="small" className="environment-chart-card" style={{ height: '100%' }}>
    <Typography.Title level={3} style={{ fontSize: 14 }}>{floor.floorName}</Typography.Title>
    {history.isFetching && <Spin size="small" />}
    {!!history.data?.failedSensors && <Alert type="warning" title={`${history.data.failedSensors} cảm biến không tải được lịch sử`} />}
    {!hasData ? <Empty description="Chưa có dữ liệu" /> :
      <div role="img" aria-label={`${floor.floorName}: nhiệt độ và độ ẩm trong 24 giờ, trung bình mỗi 15 phút; đường đứt là độ ẩm, khoảng trống là thiếu dữ liệu.`} style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--mcms-border)" strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" type="number" domain={[from, to]} tickFormatter={timeLabel} minTickGap={45} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="temperature" {...temperatureAxis} width={48} tickFormatter={formatMeasurement} unit="°C" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="humidity" {...humidityAxis} orientation="right" width={64} tickFormatter={formatMeasurement} unit="%RH" tick={{ fontSize: 11 }} />
            <Tooltip content={props => <ClimateHistoryTooltip active={props.active} payload={props.payload} floor={floor} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="temperature" dataKey="temperature" name="Nhiệt độ (°C)" stroke={chartSeries.temperature} type="linear" dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
            <Line yAxisId="humidity" dataKey="humidity" name="Độ ẩm (%RH)" stroke={chartSeries.humidity} strokeDasharray="7 4" type="linear" dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>}
  </Card>
}
