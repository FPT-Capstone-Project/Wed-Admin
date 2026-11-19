import { Tooltip,Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { SemanticTone } from '../../../app/theme/tokens'
import type { VarietyPerformance } from '../../../features/analytics/utils/executive-report.utils'
import { DataTable,EmptyState,StatusBadge } from '../../../shared/ui'
import '../../../styles/reports-users-industrial.css'
import { formatReportMoney as formatCurrency,formatReportNumber,formatReportPercent } from '../report-format'

interface VarietyPerformanceTableProps {
  data: VarietyPerformance[]
  revenueIncomplete?: boolean
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function safePercent(value: unknown): number {
  const num = safeNumber(value, 0)
  if (!Number.isFinite(num)) return 0
  return num
}

function successTone(rate: number): SemanticTone {
  if (rate >= 90) return 'ok'
  if (rate >= 80) return 'info'
  return 'warning'
}

export function VarietyPerformanceTable({
  data,
  revenueIncomplete,
}: VarietyPerformanceTableProps) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Chưa có dữ liệu giống nấm"
        description="Chưa có vụ thuê nào trong kỳ để phân tích hiệu suất theo giống."
      />
    )
  }

  const columns: ColumnsType<VarietyPerformance> = [
    {
      title: 'Giống nấm',
      key: 'varietyName',
      width: 230,
      render: (_, record) => {
        const name = record.varietyName || 'Không rõ'
        return (
          <div>
            <Typography.Text strong>{name}</Typography.Text>
          </div>
        )
      },
    },
    {
      title: 'Số phiên canh tác',
      dataIndex: 'traysRented',
      key: 'traysRented',
      align: 'right',
      width: 130,
      sorter: (a, b) => safeNumber(a.traysRented) - safeNumber(b.traysRented),
      render: (value: number) => (
        <Typography.Text strong>{formatReportNumber(safeNumber(value))} phiên</Typography.Text>
      ),
    },
    {
      title: 'Tỷ lệ thành công',
      dataIndex: 'successRate',
      key: 'successRate',
      align: 'right',
      width: 150,
      sorter: (a, b) => safeNumber(a.successRate) - safeNumber(b.successRate),
      render: (rate: number | null) => {
        if (rate == null) return <Tooltip title="Chưa có tỷ lệ thành công theo giống"><span>—</span></Tooltip>
        const safe = safeNumber(rate)
        return (
          <StatusBadge
            tone={successTone(safe)}
            label={formatReportPercent(safe)}
          />
        )
      },
    },
    {
      title: 'Doanh thu dự kiến',
      dataIndex: 'currentRevenue',
      key: 'currentRevenue',
      align: 'right',
      width: 170,
      sorter: (a, b) =>
        safeNumber(a.currentRevenue) - safeNumber(b.currentRevenue),
      render: (value: number) => (
        <Typography.Text strong style={{ color: 'var(--mcms-tone-ok-text)' }}>
          {revenueIncomplete ? <Tooltip title="Thiếu giá gói hoặc không xác định được gói của phiên"><span>—</span></Tooltip> : formatCurrency(value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Kỳ trước',
      dataIndex: 'previousRevenue',
      key: 'previousRevenue',
      align: 'right',
      width: 170,
      render: () => <Tooltip title="Chưa có dữ liệu kỳ trước"><span>—</span></Tooltip>,
    },
    {
      title: 'Tăng trưởng so kỳ trước',
      key: 'growth',
      align: 'right',
      width: 160,
      sorter: (a, b) =>
        safePercent(a.growthPercent) - safePercent(b.growthPercent),
      render: (_, record) => {
        if (safeNumber(record.previousRevenue) === 0) {
          return <Tooltip title="Chưa có dữ liệu kỳ trước"><span>—</span></Tooltip>
        }
        const growth = safePercent(record.growthPercent)
        const isPositive = growth >= 0
        return (
          <Tooltip
            title={`${formatCurrency(record.currentRevenue)} → ${formatCurrency(
              record.previousRevenue,
            )}`}
          >
            <span>
              <StatusBadge
                tone={isPositive ? 'ok' : 'danger'}
                label={`${isPositive ? '+' : ''}${formatReportPercent(growth)}`}

              />
            </span>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <DataTable<VarietyPerformance>
      dataSource={data}
      columns={columns}
      rowKey={(record) => record.varietyId || record.varietyName || 'row'}
      pagination={false}
      size="small"
      scrollX={900}
    />
  )
}
