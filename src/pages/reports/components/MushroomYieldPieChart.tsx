import { Card, Typography } from 'antd'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { EmptyState } from '../../../shared/ui'
import { tones } from '../../../app/theme/tokens'
import type { YieldSummary } from '../../../types/alert.types'

interface MushroomYieldPieChartProps {
  data: YieldSummary[]
}

const COLORS = [tones.ok.solid, tones.warning.solid, tones.danger.solid]

export function MushroomYieldPieChart({
  data,
}: MushroomYieldPieChartProps) {
  const totals = data.reduce(
    (summary, item) => ({
      gradeA: summary.gradeA + item.gradeA_Kg,
      gradeB: summary.gradeB + item.gradeB_Kg,
      spoiled: summary.spoiled + item.spoiled_Kg,
    }),
    { gradeA: 0, gradeB: 0, spoiled: 0 },
  )

  const chartData = [
    { name: 'Grade A', value: totals.gradeA },
    { name: 'Grade B', value: totals.gradeB },
    { name: 'Hỏng / loại bỏ', value: totals.spoiled },
  ].filter((item) => item.value > 0)

  return (
    <Card
      title="Chất lượng sản lượng"
      extra={<Typography.Text type="secondary">Tổng hợp kg</Typography.Text>}
    >
      {chartData.length === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu sản lượng"
          description="Chưa có vụ thu hoạch nào được ghi nhận trong kỳ."
        />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={72}
              outerRadius={112}
              paddingAngle={3}
              label={({ value }) => `${value} kg`}
            >
              {chartData.map((item, index) => (
                <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const numericValue =
                  typeof value === 'number' ? value : Number(value ?? 0)

                return `${numericValue} kg`
              }}
            />
            <Legend verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
