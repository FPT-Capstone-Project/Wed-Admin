/**
 * EnvironmentChart — Biểu đồ nhiệt độ và độ ẩm trong 24 giờ.
 *
 * Cải thiện: màu đường biểu đồ dùng CSS variable từ tokens thay vì hardcode hex.
 * Dữ liệu mẫu giữ nguyên (chờ API thực).
 */
import { CheckCircleFilled } from '@ant-design/icons'
import { Card, Typography } from 'antd'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { palette, border } from '../../../app/theme/tokens'

export interface EnvironmentDataPoint {
  time: string
  temperature: number
  humidity: number
}

const ENVIRONMENT_DATA: EnvironmentDataPoint[] = [
  { time: '00:00', temperature: 23.8, humidity: 90 },
  { time: '02:00', temperature: 23.3, humidity: 92 },
  { time: '04:00', temperature: 22.9, humidity: 93 },
  { time: '06:00', temperature: 23.5, humidity: 91 },
  { time: '08:00', temperature: 24.6, humidity: 88 },
  { time: '10:00', temperature: 25.4, humidity: 85 },
  { time: '12:00', temperature: 26.2, humidity: 82 },
  { time: '14:00', temperature: 26.8, humidity: 80 },
  { time: '16:00', temperature: 26.1, humidity: 83 },
  { time: '18:00', temperature: 25.2, humidity: 86 },
  { time: '20:00', temperature: 24.7, humidity: 88 },
  { time: '22:00', temperature: 24.2, humidity: 89 },
  { time: 'Hiện tại', temperature: 25.6, humidity: 87 },
]

/** Màu axis/tick — dùng token muted text */
const AXIS_TICK_COLOR = '#687a6d'

interface EnvironmentChartProps {
  data?: EnvironmentDataPoint[]
}

export function EnvironmentChart({
  data = ENVIRONMENT_DATA,
}: EnvironmentChartProps) {
  return (
    <Card className="environment-chart-card">
      <div className="chart-card-header">
        <div>
          <Typography.Title level={4}>Biến động trong ngày</Typography.Title>
          <Typography.Text type="secondary">
            Nhiệt độ và độ ẩm trong 24 giờ gần nhất
          </Typography.Text>
        </div>
        <span className="chart-status">
          <CheckCircleFilled aria-hidden="true" />
          Dữ liệu ổn định
        </span>
      </div>

      <div
        className="environment-chart"
        role="img"
        aria-label="Biểu đồ nhiệt độ và độ ẩm trong 24 giờ. Hiện tại nhiệt độ 25,6 độ C và độ ẩm 87 phần trăm."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke={border.soft}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              tick={{ fill: AXIS_TICK_COLOR, fontSize: 12 }}
              dy={10}
            />
            <YAxis
              yAxisId="temperature"
              domain={[20, 30]}
              unit="°"
              width={40}
              axisLine={false}
              tickLine={false}
              tick={{ fill: AXIS_TICK_COLOR, fontSize: 12 }}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              domain={[70, 100]}
              unit="%"
              width={42}
              axisLine={false}
              tickLine={false}
              tick={{ fill: AXIS_TICK_COLOR, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                border: `1px solid ${border.base}`,
                borderRadius: 6,
                boxShadow: '0 10px 30px rgb(23 51 33 / 12%)',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {/* Nhiệt độ — dùng palette.coral từ tokens */}
            <Line
              yAxisId="temperature"
              type="monotone"
              dataKey="temperature"
              name="Nhiệt độ (°C)"
              stroke={palette.coral}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 3, stroke: '#ffffff' }}
              isAnimationActive={false}
            />
            {/* Độ ẩm — dùng palette.teal từ tokens */}
            <Line
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              name="Độ ẩm (%)"
              stroke={palette.teal}
              strokeWidth={2.5}
              strokeDasharray="7 5"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 3, stroke: '#ffffff' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
