import { Card, Col, Empty, Row, Tooltip, Typography } from 'antd'
import { chartSeries, tones } from '../../../app/theme/tokens'
import { evaluateHumidity, evaluateTemperature, type ClimateThresholds } from '../../rooms/utils/tray-climate.utils'
import { formatMeasurement } from '../../../shared/utils/measurement-format'

export interface EnvironmentDataPoint {
  time: string
  temperature: number | null
  humidity: number | null
  thresholds: ClimateThresholds | null
}
interface EnvironmentChartProps {
  data?: EnvironmentDataPoint[]
  floorsWithData?: number
}

/** Floor snapshots, without interpolating unrelated floors into a time series. */
export function EnvironmentChart({ data = [] }: EnvironmentChartProps) {
  return <Row gutter={[12, 12]}>
    {(['temperature', 'humidity'] as const).map(metric => {
      const unit = metric === 'temperature' ? '°C' : '%RH'
      const title = metric === 'temperature' ? 'Nhiệt độ theo tầng' : 'Độ ẩm theo tầng'
      const evaluate = metric === 'temperature' ? evaluateTemperature : evaluateHumidity
      const rows = data.map(point => ({ name: point.time, reading: evaluate(point[metric], point.thresholds) }))
      const bounds = rows.flatMap(({ reading }) => [reading.value, reading.min, reading.max])
        .filter((value): value is number => value != null && Number.isFinite(value))
      const low = Math.min(0, ...bounds)
      const high = Math.max(1, ...bounds)
      const top = high + (high - low) * 0.15
      const y = (value: number) => 190 - (value - low) / (top - low) * 160
      const width = Math.max(280, rows.length * 100 + 60)
      const step = (width - 60) / Math.max(1, rows.length)
      return <Col xs={24} lg={12} key={metric}>
        <Card size="small" className="environment-chart-card" style={{ height: '100%' }}>
          <Typography.Title level={3} style={{ fontSize: 14 }}>{title}</Typography.Title>
          {!rows.some(({ reading }) => reading.value != null) ? <Empty description="Chưa có dữ liệu" /> : <>
            <div style={{ overflowX: 'auto' }}>
              <svg width="100%" height={250} viewBox={`0 0 ${width} 250`} style={{ minWidth: width }} role="group" aria-label={`${title}, ${unit}. Cột là số đo hiện tại; dải nhạt là mục tiêu từng tầng.`}>
                {[0, 1, 2, 3].map(tick => {
                  const value = low + (top - low) * tick / 3
                  return <g key={tick}>
                    <line x1={50} x2={width} y1={y(value)} y2={y(value)} stroke="var(--mcms-border)" />
                    <text x={45} y={y(value) + 4} textAnchor="end" fontSize={11} fill="var(--mcms-text-muted)">{formatMeasurement(value)}</text>
                  </g>
                })}
                <text x={12} y={15} fontSize={12} fill="var(--mcms-text-muted)">{unit}</text>
                {rows.map(({ name, reading }, index) => {
                  const x = 50 + step * (index + 0.5)
                  const tone = reading.level === 'neutral' ? 'muted' : reading.level
                  const outside = tone === 'danger' || tone === 'warning'
                  const below = reading.value != null && reading.min != null && reading.value < reading.min
                  const target = [reading.min == null ? null : `tối thiểu ${formatMeasurement(reading.min)}${unit}`,
                    reading.max == null ? null : `tối đa ${formatMeasurement(reading.max)}${unit}`].filter(Boolean).join(', ') || 'chưa có mục tiêu'
                  const label = `${name}: ${formatMeasurement(reading.value)}${reading.value == null ? '' : unit}; ${reading.value == null ? 'Chưa có dữ liệu' : outside ? `${below ? 'thấp' : 'cao'} hơn ngưỡng ${formatMeasurement(reading.deviation)}${unit}` : reading.level === 'ok' ? 'trong ngưỡng' : 'chưa đủ thông tin'}; ${target}`
                  return <Tooltip key={`${name}-${index}`} title={label} trigger={['hover', 'focus']}>
                    <g tabIndex={0} role="img" aria-label={label}>
                      <rect x={x - step / 2 + 2} y={25} width={step - 4} height={205} fill="transparent" />
                      {reading.min != null && reading.max != null && <rect x={x - 30} width={60} y={y(reading.max)} height={Math.max(0, y(reading.min) - y(reading.max))} fill={chartSeries[metric]} opacity={0.12} />}
                      {[reading.min, reading.max].map((bound, i) => bound == null ? null : <line key={i} x1={x - 30} x2={x + 30} y1={y(bound)} y2={y(bound)} stroke={chartSeries[metric]} strokeDasharray="4 3" />)}
                      {reading.value != null && <rect x={x - 14} width={28} y={Math.min(y(reading.value), y(0))} height={Math.max(1, Math.abs(y(0) - y(reading.value)))} fill={tones[tone].text} stroke={chartSeries[metric]} />}
                      <text x={x} y={reading.value == null ? 110 : y(reading.value) - 8} textAnchor="middle" fontSize={12} fill={tones[tone].text}>{formatMeasurement(reading.value)}{outside ? below ? ' ▼' : ' ▲' : ''}</text>
                      <text x={x} y={215} textAnchor="middle" fontSize={11} fill="var(--mcms-text)">{name.length > 12 ? `${name.slice(0, 11)}…` : name}</text>
                    </g>
                  </Tooltip>
                })}
              </svg>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Dải nhạt: mục tiêu · ▲ Cao · ▼ Thấp</Typography.Text>
          </>}
        </Card>
      </Col>
    })}
  </Row>
}
