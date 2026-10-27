import { LineChartOutlined } from '@ant-design/icons'
import { Button, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import type {
  RentalSession,
  RentalSessionStatus,
} from '../../../types/iot-history'
import {
  formatHistoryDate,
  formatRentalDurationLabel,
} from '../utils/iot-history.utils'

const STATUS_CONFIG: Record<
  RentalSessionStatus,
  { color: string; label: string }
> = {
  COMPLETED: { color: 'default', label: 'Đã hoàn thành' },
  ACTIVE: { color: 'success', label: 'Đang vận hành' },
  OVERDUE: { color: 'error', label: 'Quá hạn' },
}

interface RentalHistoryTableProps {
  sessions: RentalSession[]
  selectedSessionId: string
  onSelectSession: (sessionId: string) => void
}

export function RentalHistoryTable({
  sessions,
  selectedSessionId,
  onSelectSession,
}: RentalHistoryTableProps) {
  const columns: TableColumnsType<RentalSession> = [
    {
      title: 'Khách hàng',
      key: 'tenant',
      width: 190,
      render: (_, session) => (
        <div className="history-table-primary-cell">
          <strong>{session.tenantName}</strong>
          <span>{session.tenantId}</span>
        </div>
      ),
    },
    {
      title: 'Loại nấm',
      dataIndex: 'mushroomType',
      key: 'mushroomType',
      width: 170,
    },
    {
      title: 'Thời gian',
      key: 'period',
      width: 205,
      render: (_, session) => (
        <div className="history-table-primary-cell">
          <strong>
            {formatHistoryDate(session.startDate)} –{' '}
            {formatHistoryDate(session.endDate)}
          </strong>
          <span>
            {formatRentalDurationLabel(session.startDate, session.endDate)} ·{' '}
            {session.orderId} · {session.batchId}
          </span>
        </div>
      ),
    },
    {
      title: 'Chỉ số trung bình',
      key: 'averages',
      width: 220,
      render: (_, session) => (
        <div className="history-average-metrics">
          <span>{session.avgTemp.toLocaleString('vi-VN')}°C</span>
          <span>{session.avgHumidity.toLocaleString('vi-VN')}%RH</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: Object.entries(STATUS_CONFIG).map(([value, config]) => ({
        value,
        text: config.label,
      })),
      onFilter: (value, session) => session.status === value,
      render: (status: RentalSessionStatus) => (
        <Tag color={STATUS_CONFIG[status].color}>
          {STATUS_CONFIG[status].label}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, session) => (
        <Button
          type={selectedSessionId === session.id ? 'primary' : 'link'}
          size="small"
          icon={<LineChartOutlined />}
          onClick={() => onSelectSession(session.id)}
        >
          Xem biểu đồ mẻ này
        </Button>
      ),
    },
  ]

  return (
    <section className="rental-history-table-panel" aria-labelledby="rental-history-heading">
      <div className="rental-history-table-header">
        <div>
          <h3 id="rental-history-heading">Lịch sử Order / Mẻ trồng</h3>
          <p>{sessions.length} lifecycle được ghi nhận cho khay đang chọn</p>
        </div>
      </div>
      <Table<RentalSession>
        rowKey="id"
        columns={columns}
        dataSource={sessions}
        pagination={{ pageSize: 5, showSizeChanger: false }}
        scroll={{ x: 1105 }}
        rowClassName={(session) =>
          selectedSessionId === session.id ? 'history-row-selected' : ''
        }
      />
    </section>
  )
}
