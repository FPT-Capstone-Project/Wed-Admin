import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EmptyState, StatusBadge } from '../../../shared/ui'
import { formatCurrency } from '../utils/executive-report.utils'
import type { VarietyPerformance } from '../utils/executive-report.utils'
import type { SemanticTone } from '../../../app/theme/tokens'

interface VarietyPerformanceTableProps {
  data: VarietyPerformance[]
}

/** Làm sạch giá trị số trước khi render — đảm bảo không in `NaN`. */
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

/** Tỷ lệ thành công → tone ngữ nghĩa. */
function successTone(rate: number): SemanticTone {
  if (rate >= 90) return 'ok'
  if (rate >= 80) return 'info'
  return 'warning'
}

export function VarietyPerformanceTable({
  data,
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
        const id = record.varietyId || 'N/A'
        return (
          <div>
            <Typography.Text strong>{name}</Typography.Text>
            <div style={{ fontSize: 11, color: 'var(--mcms-text-muted)' }}>{id}</div>
          </div>
        )
      },
    },
    {
      title: 'Số khay đã trồng',
      dataIndex: 'traysRented',
      key: 'traysRented',
      align: 'right',
      width: 130,
      sorter: (a, b) => safeNumber(a.traysRented) - safeNumber(b.traysRented),
      render: (value: number) => (
        <Typography.Text strong>{safeNumber(value)} khay</Typography.Text>
      ),
    },
    {
      title: 'Tỷ lệ thành công',
      dataIndex: 'successRate',
      key: 'successRate',
      align: 'right',
      width: 150,
      sorter: (a, b) => safeNumber(a.successRate) - safeNumber(b.successRate),
      render: (rate: number) => {
        const safe = safeNumber(rate)
        return (
          <StatusBadge
            tone={successTone(safe)}
            label={`${safe.toFixed(1)}%`}
          />
        )
      },
    },
    {
      title: 'Doanh thu kỳ này',
      dataIndex: 'currentRevenue',
      key: 'currentRevenue',
      align: 'right',
      width: 170,
      sorter: (a, b) =>
        safeNumber(a.currentRevenue) - safeNumber(b.currentRevenue),
      render: (value: number) => (
        <Typography.Text strong style={{ color: 'var(--mcms-tone-ok-text)' }}>
          {formatCurrency(value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Cùng kỳ',
      dataIndex: 'previousRevenue',
      key: 'previousRevenue',
      align: 'right',
      width: 170,
      render: (value: number) => (
        <Typography.Text type="secondary">
          {formatCurrency(value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Tăng trưởng YoY',
      key: 'growth',
      align: 'right',
      width: 160,
      sorter: (a, b) =>
        safePercent(a.growthPercent) - safePercent(b.growthPercent),
      render: (_, record) => {
        const growth = safePercent(record.growthPercent)
        const isPositive = growth >= 0
        const Icon = isPositive ? ArrowUpOutlined : ArrowDownOutlined
        return (
          <Tooltip
            title={`${formatCurrency(record.currentRevenue)} → ${formatCurrency(
              record.previousRevenue,
            )}`}
          >
            <span>
              <StatusBadge
                tone={isPositive ? 'ok' : 'danger'}
                label={`${isPositive ? '+' : ''}${growth.toFixed(1)}%`}
                icon={<Icon style={{ fontSize: 10 }} />}
              />
            </span>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <Table<VarietyPerformance>
      dataSource={data}
      columns={columns}
      rowKey={(record) => record.varietyId || record.varietyName || 'row'}
      pagination={false}
      size="middle"
      scroll={{ x: 900 }}
    />
  )
}
