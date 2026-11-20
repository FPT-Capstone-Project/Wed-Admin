import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Empty } from 'antd'
import type { VarietyPerformance } from '../../../features/analytics/utils/executive-report.utils'
import { formatReportMoney, formatReportPercent } from '../report-format'

const COLORS = ['#15803d', '#22c55e', '#166534', '#86efac', '#4ade80']

export function SpeciesRevenueDonut({ data, incomplete }: { data: VarietyPerformance[]; incomplete: boolean }) {
  const rows = data.filter(row => row.currentRevenue > 0)
  const total = rows.reduce((sum, row) => sum + row.currentRevenue, 0)
  return <section aria-label="Cơ cấu doanh thu thực tế theo giống nấm" className="reports-donut">
    <h3>Cơ cấu doanh thu thực tế</h3>
    {incomplete || !total ? <Empty description={incomplete ? 'Chưa đủ dữ liệu đơn đã thanh toán' : 'Chưa có doanh thu thực tế'} /> : <>
      <div className="reports-donut-plot" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" minWidth={0} height="100%">
        <PieChart accessibilityLayer>
          <Pie data={rows} dataKey="currentRevenue" nameKey="varietyName" cx="50%" cy="50%" innerRadius={72} outerRadius={105} isAnimationActive={false}>
            {rows.map((row, i) => <Cell key={row.varietyId} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={value => formatReportMoney(Number(value))} />
        </PieChart>
        </ResponsiveContainer>
        <div className="reports-donut-total"><span>Tổng đã thu</span><strong>{formatReportMoney(total)}</strong></div>
      </div>
      <ul className="reports-donut-legend">{rows.map((row, i) => <li key={row.varietyId}>
        <span className="reports-legend-square" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
        <span>{row.varietyName}</span>
        <strong>{formatReportMoney(row.currentRevenue)}</strong>
        <span>({formatReportPercent(row.currentRevenue / total * 100)})</span>
      </li>)}</ul>
    </>}
  </section>
}
