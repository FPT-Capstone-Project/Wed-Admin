import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import '../sessions-industrial.css'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Card,
  Col,
  Flex,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Suspense, useMemo, useState } from 'react'
import { ActionButton, DataTable, StatCard } from '../../../shared/ui'
import { useSessions } from '../hooks/useSessions'
import {
  ACTIVE_SESSION_STATUSES,
  CULTIVATION_SESSION_STATUSES,
  type CultivationSession,
  type CultivationSessionStatus,
  type SessionListQuery,
} from '../types/session.types'
import { SessionStatusTag } from '../components/SessionStatusTag'
import {
  SESSION_DEFAULT_PROGRESS,
  SESSION_STATUS_CONFIG,
} from '../components/session-status.config'
import { SessionDetailDrawer } from '../../../app/router/lazy-modals'

/**
 * Trang danh sách phiên canh tác — **100% READ-ONLY**.
 *
 * Không có nút tạo / sửa / xoá / chuyển giai đoạn. Mọi thao tác ghi do
 * nhân viên (staff) thực hiện trên app.
 */

const STATUS_OPTIONS = CULTIVATION_SESSION_STATUSES.map((status) => ({
  value: status,
  label: SESSION_STATUS_CONFIG[status].label,
}))

/** Tiến độ ưu tiên `progress_percent` của BE, fallback suy ra từ trạng thái. */
function resolveProgress(session: CultivationSession): number {
  if (typeof session.progress_percent === 'number') {
    return Math.min(100, Math.max(0, Math.round(session.progress_percent)))
  }
  return SESSION_DEFAULT_PROGRESS[session.status] ?? 0
}

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FMT.format(date)
}

export function SessionListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    CultivationSessionStatus | undefined
  >()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  )

  // Server nhận status; page/pageSize được áp dụng tại frontend.
  const listQuery = useMemo<SessionListQuery>(
    () => ({
      status: statusFilter,
      page,
      pageSize,
    }),
    [statusFilter, page, pageSize],
  )

  const { data, isLoading, isFetching, isError, error, refetch } =
    useSessions(listQuery)

  const items = useMemo(() => data?.items ?? [], [data])
  const pagination = data?.pagination

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((session) =>
      [
        session.customer_name,
        session.customer_email,
        session.order_id ? String(session.order_id) : '',
        session.package_name,
        session.mushroom_name,
        ...session.trays.map((tray) => tray.tray_code ?? ''),
      ].some((field) => field?.toLowerCase().includes(keyword)),
    )
  }, [items, searchText])

  const summary = useMemo(
    () => ({
      total: pagination?.total ?? items.length,
      active: items.filter((s) => ACTIVE_SESSION_STATUSES.has(s.status)).length,
      waiting: items.filter((s) => s.status === 'PENDING').length,
      cancelled: items.filter((s) => s.status === 'CANCELLED').length,
    }),
    [items, pagination],
  )

  const columns: ColumnsType<CultivationSession> = useMemo(
    () => [
      {
        title: 'Mã',
        dataIndex: 'session_id',
        key: 'session_id',
        className: 'mcms-session-mono',
        width: 80,
        render: (value: number) => (
          <Typography.Text strong>#{value}</Typography.Text>
        ),
      },
      {
        title: 'Khách hàng',
        key: 'customer',
        width: 200,
        render: (_, session) => (
          <Flex vertical>
            <Typography.Text strong>
              {session.customer_name ?? '—'}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {session.customer_email ?? '—'}
            </Typography.Text>
          </Flex>
        ),
      },
      {
        title: 'Gói / Nấm',
        key: 'package',
        width: 190,
        render: (_, session) => (
          <Flex vertical>
            <Typography.Text>{session.package_name ?? '—'}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {session.mushroom_name ?? '—'}
              {session.order_id ? ` · Đơn #${session.order_id}` : ''}
            </Typography.Text>
          </Flex>
        ),
      },
      {
        title: 'Khay / Tầng',
        key: 'trays',
        width: 170,
        render: (_, session) => {
          if (session.trays.length === 0) {
            return (
              <Typography.Text type="secondary">Xem phân bổ trong chi tiết</Typography.Text>
            )
          }
          const codes = session.trays
            .map((tray) => tray.tray_code)
            .filter(Boolean)
            .join(', ')
          const floors = [
            ...new Set(
              session.trays
                .map(
                  (tray) =>
                    tray.floor_name ??
                    (typeof tray.floor_number === 'number'
                      ? `Tầng ${tray.floor_number}`
                      : null),
                )
                .filter((value): value is string => Boolean(value)),
            ),
          ]
          return (
            <Flex vertical gap={2}>
              <Typography.Text strong>{codes}</Typography.Text>
              {floors.length > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {floors.join(' · ')}
                </Typography.Text>
              )}
            </Flex>
          )
        },
      },
      {
        title: 'Tiến độ theo giai đoạn',
        key: 'progress',
        width: 160,
        render: (_, session) => {
          const percent = resolveProgress(session)
          if (session.status === 'CANCELLED') {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Đã hủy
              </Typography.Text>
            )
          }
          return (
            <Flex vertical gap={2} style={{ width: '100%', maxWidth: 140 }}>
              <Flex justify="space-between" align="center">
                <Typography.Text style={{ fontSize: 12, fontWeight: 600 }}>
                  {SESSION_STATUS_CONFIG[session.status]?.shortLabel ??
                    session.status}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {percent}%
                </Typography.Text>
              </Flex>
              <Progress
                percent={percent}
                size="small"
                strokeColor="var(--mcms-primary)"
                showInfo={false}
              />
            </Flex>
          )
        },
      },
      { title: 'Số khay', dataIndex: 'tray_count', width: 90, render: (value: number | null) => value ?? '—' },
      { title: 'Số phôi yêu cầu', dataIndex: 'spawn_quantity', width: 110, render: (value: number | null) => value ?? '—' },
      { title: 'Dự kiến thu hoạch', dataIndex: 'expected_harvest_date', width: 140, render: (value: string | null) => fmtDate(value) },
      { title: 'Kiểm tra gần nhất', dataIndex: 'last_inspected_at', width: 140, render: (value: string | null) => fmtDate(value) },
      {
        title: 'Bắt đầu',
        dataIndex: 'start_date',
        key: 'start_date',
        className: 'mcms-session-mono',
        width: 110,
        render: (value: string | null) => (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {fmtDate(value)}
          </Typography.Text>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (status: CultivationSessionStatus) => (
          <SessionStatusTag status={status} />
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 100,
        fixed: 'right',
        align: 'center',
        render: (_, session) => (
          <ActionButton
            icon={<EyeOutlined />}
            label="Chi tiết"
            description={`Xem chi tiết phiên canh tác #${session.session_id}`}
            variant="text"
            size="small"
            onClick={() => setSelectedSessionId(session.session_id)}
          />
        ),
      },
    ],
    [],
  )

  const handleStatusChange = (value: CultivationSessionStatus | undefined) => {
    setStatusFilter(value)
    setPage(1)
  }

  if (isError) return <LoadErrorAlert error={error} resource="danh sách phiên canh tác" onRetry={refetch} />

  return (
    <div>
      <Flex
        align="flex-start"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Quản lý phiên canh tác
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi các phiên đã thanh toán trong luồng farm, khay và lịch sử kiểm tra phôi
            — chỉ đọc.
          </Typography.Text>
        </div>

        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm khách, mã đơn, gói, mã khay..."
            style={{ width: 280 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: 200 }}
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={handleStatusChange}
          />
        </Space>
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tổng phiên"
            value={summary.total}
            tone="neutral"
            icon={<FileTextOutlined />}
            description="Tất cả phiên canh tác trong hệ thống"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đang chạy"
            value={summary.active}
            tone="ok"
            highlightValue
            icon={<CheckCircleOutlined />}
            description="Phiên chưa kết thúc / chưa hủy"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Chờ xử lý"
            value={summary.waiting}
            tone="warning"
            highlightValue
            icon={<ClockCircleOutlined />}
            description="Phiên chờ cấp phôi / gán khay"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đã hủy"
            value={summary.cancelled}
            tone="danger"
            highlightValue
            icon={<CloseCircleOutlined />}
            description="Phiên đã bị hủy"
          />
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
          <DataTable<CultivationSession>
            rowKey="session_id"
            columns={columns}
            dataSource={filteredItems}
            loading={isLoading || isFetching}
            scrollX={1180}
            pagination={{
              hideOnSinglePage: false,
              current: page,
              pageSize,
              total: pagination?.total ?? filteredItems.length,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `Tổng ${total} phiên`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPageSize !== pageSize ? 1 : nextPage)
                setPageSize(nextPageSize)
              },
            }}
            emptyTitle="Chưa có phiên canh tác nào"
            emptyDescription="Phiên sẽ xuất hiện khi khách đặt gói và hệ thống khởi tạo."
          />
      </Card>

            <Suspense fallback={null}>
              <SessionDetailDrawer
              sessionId={selectedSessionId}
              onClose={() => setSelectedSessionId(null)}
              />
            </Suspense>
    </div>
  )
}
