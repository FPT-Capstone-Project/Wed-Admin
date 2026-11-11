import { DataTable } from '../../../shared/ui/DataTable'
import { LineChartOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import type {
  RentalSession,
  RentalSessionStatus,
} from '../../../types/iot-history'
import {
  formatHistoryDate,
  formatRentalDurationLabel,
} from '../utils/iot-history.utils'

import { RENTAL_SESSION_STATUS_LEGACY_CONFIG } from '../../../shared/i18n/status/iot'

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
          <span>{Number(session.avgTemp).toFixed(1)}°C</span>
          <span>{Number(session.avgHumidity).toFixed(1)}%RH</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: Object.entries(RENTAL_SESSION_STATUS_LEGACY_CONFIG).map(
        ([value, config]) => ({
          value,
          text: config.label,
        }),
      ),
      onFilter: (value, session) => session.status === value,
      render: (status: RentalSessionStatus) => {
        const meta = RENTAL_SESSION_STATUS_LEGACY_CONFIG[status]
        return (
          <Tag color={meta?.color ?? 'default'}>{meta?.label ?? status}</Tag>
        )
      },
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
      <DataTable<RentalSession> size="large"
        rowKey="id"
        columns={columns}
        dataSource={sessions}
        pagination={{ hideOnSinglePage: false, pageSize: 5, showSizeChanger: false }}
        scroll={{ x: 1105 }}
        rowClassName={(session) =>
          selectedSessionId === session.id ? 'history-row-selected' : ''
        }
      />
    </section>
  )
}
