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
  Empty,
  Flex,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { RentalDetailDrawer } from '../components/RentalDetailDrawer'
import { RentalStatusTag } from '../components/RentalStatusTag'
import { RENTAL_STATUS_CONFIG } from '../components/rental-status.config'
import { useRentals } from '../hooks/useRentals'
import type { Rental, RentalListQuery, RentalStatus } from '../types/rental.types'
import { ActionButton, StatCard } from '../../../shared/ui'

const STATUS_OPTIONS = (
  Object.keys(RENTAL_STATUS_CONFIG) as RentalStatus[]
).map((status) => ({
  value: status,
  label: RENTAL_STATUS_CONFIG[status].label,
}))

export function RentalListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<RentalStatus | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRentalId, setSelectedRentalId] = useState<number | null>(null)

  // ── Query params ───────────────────────────────────────────────────────
  const listQuery = useMemo<RentalListQuery>(
    () => ({
      status: statusFilter,
      page,
      pageSize,
    }),
    [statusFilter, page, pageSize],
  )

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useRentals(listQuery)

  const items = useMemo(() => data?.items ?? [], [data])
  const pagination = data?.pagination

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((rental) =>
      [
        rental.customer_name,
        rental.customer_email,
        String(rental.order_id),
        rental.tray_code,
        rental.package_name,
      ].some((field) => field?.toLowerCase().includes(keyword)),
    )
  }, [items, searchText])

  const summary = useMemo(
    () => ({
      total: pagination?.total ?? items.length,
      active: items.filter((r) => r.status === 'ACTIVE').length,
      waiting: items.filter((r) => r.status === 'CONFIRMED').length,
      cancelled: items.filter((r) => r.status === 'CANCELLED').length,
    }),
    [items, pagination],
  )

  const columns: ColumnsType<Rental> = useMemo(
    () => [
      {
        title: 'Mã',
        dataIndex: 'rental_id',
        key: 'rental_id',
        width: 80,
        render: (value: number) => <Typography.Text strong>#{value}</Typography.Text>,
      },
      {
        title: 'Khách hàng',
        key: 'customer',
        width: 200,
        render: (_, rental) => (
          <Flex vertical>
            <Typography.Text strong>{rental.customer_name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {rental.customer_email}
            </Typography.Text>
          </Flex>
        ),
      },
      {
        title: 'Gói / Nấm',
        key: 'package',
        width: 180,
        render: (_, rental) => (
          <Flex vertical>
            <Typography.Text>{rental.package_name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {rental.mushroom_name} · {rental.duration_days} ngày
            </Typography.Text>
          </Flex>
        ),
      },
      {
        title: 'Khay',
        key: 'tray',
        width: 130,
        render: (_, rental) =>
          rental.tray_code ? (
            <Typography.Text strong>{rental.tray_code}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">Chưa gán</Typography.Text>
          ),
      },
      {
        title: 'Tiến độ canh tác',
        key: 'progress',
        width: 170,
        render: (_, rental) => {
          if (rental.status === 'COMPLETED') {
            return (
              <Flex vertical gap={2}>
                <Progress
                  percent={100}
                  size="small"
                  strokeColor="var(--mcms-primary)"
                  showInfo={false}
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Đã hoàn thành vụ
                </Typography.Text>
              </Flex>
            )
          }
          if (rental.status === 'CANCELLED') {
            return <Typography.Text type="secondary">Đã hủy</Typography.Text>
          }
          if (rental.status === 'CONFIRMED' || rental.status === 'PREPARING') {
            return (
              <Flex vertical gap={2}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {rental.status === 'PREPARING' ? 'Đang chuẩn bị phôi' : 'Chờ cấp khay'}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Chu kỳ {rental.duration_days} ngày
                </Typography.Text>
              </Flex>
            )
          }

          // ACTIVE: tính số ngày còn lại & % hoàn thành
          if (rental.end_date) {
            const end = dayjs(rental.end_date)
            const now = dayjs()
            const total = rental.duration_days || Math.max(1, end.diff(dayjs(rental.start_date), 'day'))
            const remaining = Math.max(0, end.diff(now, 'day'))
            const elapsed = Math.max(0, total - remaining)
            const percent = Math.min(100, Math.round((elapsed / total) * 100))

            return (
              <Flex vertical gap={2} style={{ width: '100%', maxWidth: 150 }}>
                <Flex justify="space-between" align="center">
                  <Typography.Text style={{ fontSize: 12, fontWeight: 600 }}>
                    Còn {remaining} ngày
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
          }

          return (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Chu kỳ {rental.duration_days} ngày
            </Typography.Text>
          )
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (status: RentalStatus) => <RentalStatusTag status={status} />,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 100,
        fixed: 'right',
        align: 'center',
        render: (_, rental) => (
          <ActionButton
            icon={<EyeOutlined />}
            label="Chi tiết"
            description={`Xem chi tiết vụ thuê #${rental.rental_id}`}
            variant="default"
            size="small"
            onClick={() => setSelectedRentalId(rental.rental_id)}
          />
        ),
      },
    ],
    [],
  )

  const handleStatusChange = (value: RentalStatus | undefined) => {
    setStatusFilter(value)
    setPage(1)
  }

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
            Quản lý vụ thuê
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi hợp đồng thuê khay, tiến độ canh tác và thu hoạch
          </Typography.Text>
        </div>

        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm khách, mã đơn, mã khay..."
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: 180 }}
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={handleStatusChange}
          />
        </Space>
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tổng vụ thuê"
            value={summary.total}
            tone="neutral"
            icon={<FileTextOutlined />}
            description="Tất cả hợp đồng trong hệ thống"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đang canh tác"
            value={summary.active}
            tone="ok"
            highlightValue
            icon={<CheckCircleOutlined />}
            description="Khay nấm đang phát triển"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Chờ duyệt"
            value={summary.waiting}
            tone="warning"
            highlightValue
            icon={<ClockCircleOutlined />}
            description="Đơn chờ chuẩn bị / gán khay"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đã hủy"
            value={summary.cancelled}
            tone="danger"
            highlightValue
            icon={<CloseCircleOutlined />}
            description="Hợp đồng thuê đã chấm dứt"
          />
        </Col>
      </Row>

      {isError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={8}>
              <Typography.Text type="danger">
                Không tải được danh sách vụ thuê.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {error?.message ?? 'Lỗi không xác định.'}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => void refetch()}
              >
                Nhấn để thử lại
              </Typography.Text>
            </Flex>
          }
        />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table<Rental>
            rowKey="rental_id"
            columns={columns}
            dataSource={filteredItems}
            loading={isLoading || isFetching}
            scroll={{ x: 1050 }}
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total ?? filteredItems.length,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `Tổng ${total} vụ thuê`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPageSize !== pageSize ? 1 : nextPage)
                setPageSize(nextPageSize)
              },
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa có vụ thuê nào"
                />
              ),
            }}
          />
        </Card>
      )}

      <RentalDetailDrawer
        rentalId={selectedRentalId}
        onClose={() => setSelectedRentalId(null)}
      />
    </div>
  )
}
