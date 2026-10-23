import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { RentalDetailDrawer } from '../components/RentalDetailDrawer'
import { RentalStatusTag } from '../components/RentalStatusTag'
import { RENTAL_STATUS_CONFIG } from '../components/rental-status.config'
import { useRentals } from '../hooks/useRentals'
import type { Rental, RentalListQuery, RentalStatus } from '../types/rental.types'

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
  // Bọc useMemo để giữ object identity ổn định — nếu không, mỗi render sẽ
  // tạo object mới → queryKey đổi → refetch vô hạn.
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

  // Lọc theo tên khách / mã đơn / mã khay phía client (BE chưa hỗ trợ
  // keyword search, nên để ở client để không phải đổi API BE).
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
        width: 140,
        render: (_, rental) =>
          rental.tray_code ? (
            <Typography.Text>{rental.tray_code}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">Chưa gán</Typography.Text>
          ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (status: RentalStatus) => <RentalStatusTag status={status} />,
      },
      {
        title: '',
        key: 'actions',
        width: 60,
        align: 'right',
        render: (_, rental) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setSelectedRentalId(rental.rental_id)}
            aria-label={`Xem chi tiết vụ thuê ${rental.rental_id}`}
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

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Tổng vụ thuê"
              value={summary.total}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Đang canh tác"
              value={summary.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Chờ duyệt"
              value={summary.waiting}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#faad14' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Đã hủy"
              value={summary.cancelled}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              loading={isLoading}
            />
          </Card>
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
            scroll={{ x: 900 }}
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