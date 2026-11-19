import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { Empty } from 'antd'
import type { VarietyPerformance } from '../../../features/analytics/utils/executive-report.utils'
import { formatReportMoney, formatReportPercent } from '../report-format'
import { useReportPrint } from '../useReportPrint'

const COLORS = ['#15803d', '#22c55e', '#166534', '#86efac', '#4ade80']

export function SpeciesRevenueDonut({ data, incomplete }: { data: VarietyPerformance[]; incomplete: boolean }) {
  const printing = useReportPrint()
  const rows = data.filter(row => row.currentRevenue > 0)
  const total = rows.reduce((sum, row) => sum + row.currentRevenue, 0)
  return <section aria-label="Cơ cấu doanh thu dự kiến theo giống nấm" className="reports-donut">
    <h3>Cơ cấu doanh thu dự kiến</h3>
    {incomplete || !total ? <Empty description={incomplete ? 'Chưa đủ dữ liệu giá gói' : 'Chưa có doanh thu dự kiến'} /> : <>
      <div className="reports-donut-plot">
        <PieChart width={290} height={printing ? 150 : 240} accessibilityLayer>
          <Pie data={rows} dataKey="currentRevenue" nameKey="varietyName" cx={145} cy={printing ? 75 : 115} innerRadius={printing ? 54 : 72} outerRadius={printing ? 72 : 105} isAnimationActive={false}>
            {rows.map((row, i) => <Cell key={row.varietyId} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          {!printing && <Tooltip formatter={value => formatReportMoney(Number(value))} />}
        </PieChart>
        <div className="reports-donut-total"><span>Tổng dự kiến</span><strong>{formatReportMoney(total)}</strong></div>
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
