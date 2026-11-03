/**
 * EnvironmentChart — biểu đồ nhiệt độ và độ ẩm theo tầng.
 *
 * ⚠ Dữ liệu THẬT: `GET /api/iot/floors/{floorId}/environment` cho từng tầng
 *   (đọc qua hook `useTiersWithEnvironment`). Không còn dataset mock.
 */
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
import { palette, border, navigation, surface } from '../../../app/theme/tokens'
import { StatusBadge } from '../../../shared/ui'

export interface EnvironmentDataPoint {
  time: string
  temperature: number
  humidity: number
}

/** Màu axis/tick — dùng token muted text */
const AXIS_TICK_COLOR = navigation.itemIcon

interface EnvironmentChartProps {
  data?: EnvironmentDataPoint[]
  /** Số tầng có dữ liệu — hiển thị trong mô tả. */
  floorsWithData?: number
}

export function EnvironmentChart({
  data = [],
  floorsWithData = 0,
}: EnvironmentChartProps) {
  return (
    <Card className="environment-chart-card" size="small">
      <div className="chart-card-header">
        <div>
          <Typography.Title level={3} style={{ fontSize: 14 }}>
            Môi trường theo tầng
          </Typography.Title>
          <Typography.Text type="secondary">
            Nhiệt độ và độ ẩm trung bình tại {floorsWithData} tầng có dữ liệu
          </Typography.Text>
        </div>
        <StatusBadge
          tone={floorsWithData > 0 ? 'ok' : 'muted'}
          label={floorsWithData > 0 ? 'Dữ liệu cảm biến' : 'Chưa có dữ liệu'}
        />
      </div>

      <div
        className="environment-chart"
        role="img"
        aria-label={`Biểu đồ nhiệt độ và độ ẩm của ${floorsWithData} tầng nuôi nấm.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke={border.base}
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
              domain={[15, 40]}
              unit="°"
              width={40}
              axisLine={false}
              tickLine={false}
              tick={{ fill: AXIS_TICK_COLOR, fontSize: 12 }}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              domain={[40, 100]}
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
                background: surface.surface,
                boxShadow: 'none',
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 8, fontSize: 12, color: AXIS_TICK_COLOR }}
              formatter={(value) => <span style={{ color: AXIS_TICK_COLOR }}>{value}</span>}
            />
            {/* Nhiệt độ — dùng palette.coral từ tokens */}
            <Line
              yAxisId="temperature"
              type="monotone"
              dataKey="temperature"
              name="Nhiệt độ (°C)"
              stroke={palette.coral}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: surface.surface }}
              isAnimationActive={false}
            />
            {/* Độ ẩm — dùng palette.teal từ tokens */}
            <Line
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              name="Độ ẩm (%)"
              stroke={palette.teal}
              strokeWidth={2}
              strokeDasharray="7 5"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: surface.surface }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
