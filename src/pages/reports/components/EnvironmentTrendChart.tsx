import '../../../styles/reports-users-industrial.css'
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
import { tones } from '../../../app/theme/tokens'
import type { EnvironmentHistoryPoint } from '../../../types/alert.types'

interface EnvironmentTrendChartProps {
  data: EnvironmentHistoryPoint[]
}

export function EnvironmentTrendChart({
  data,
}: EnvironmentTrendChartProps) {
  return (
    <Card
      title="Xu hướng vi khí hậu"
      extra={<Typography.Text type="secondary">Theo ngày</Typography.Text>}
    >
      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 54, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--mcms-border)" />
          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--mcms-nav-item-icon)', fontSize: 12 }}
           tickLine={false} />
          <YAxis
            yAxisId="temperature"
            domain={[15, 35]}
            unit="°C"
            width={50}
            tick={{ fill: 'var(--mcms-nav-item-icon)', fontSize: 12 }}
           tickLine={false} />
          <YAxis
            yAxisId="humidity"
            orientation="right"
            domain={[40, 100]}
            unit="%"
            width={42}
            tick={{ fill: 'var(--mcms-nav-item-icon)', fontSize: 12 }}
           tickLine={false} />
          <Tooltip
            formatter={(value, name) => {
              const numericValue =
                typeof value === 'number' ? value : Number(value ?? 0)
              const label = String(name)

              if (label === 'Nhiệt độ') {
                return [`${numericValue.toFixed(1)} °C`, label]
              }

              return [`${numericValue}%RH`, label]
            }}
           contentStyle={{ background: 'var(--mcms-surface)', border: '1px solid var(--mcms-border)', borderRadius: 6, boxShadow: 'none', fontSize: 12 }} />
          <Legend  wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: 'var(--mcms-nav-item-icon)' }}>{value}</span>} />
          <Line
            yAxisId="temperature"
            type="monotone"
            dataKey="temperature"
            name="Nhiệt độ"
            stroke={tones.danger.solid}
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="humidity"
            type="monotone"
            dataKey="humidity"
            name="Độ ẩm"
            stroke={tones.info.solid}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
