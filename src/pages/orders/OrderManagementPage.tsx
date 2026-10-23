import { useMemo, useState } from 'react'
import {
  CreditCardOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Badge,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Input,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { AppOrder, OrderStatus } from '../../types/order.types'
import { CreateRentalFromOrderModal } from '../../features/rentals/components/CreateRentalFromOrderModal'
import { useOrders } from '../../features/orders/hooks/useOrders'
import { useOrderPaymentStatus } from '../../features/orders/hooks/usePayments'
import { beOrdersToUiOrders } from '../../types/order.mapper'

const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; label: string; badge: string }
> = {
  PENDING_TRAY_ASSIGNMENT: {
    color: 'warning',
    label: 'Chờ gán khay',
    badge: 'warning',
  },
  ASSIGNED: {
    color: 'processing',
    label: 'Đã gán khay',
    badge: 'processing',
  },
  GROWING: {
    color: 'success',
    label: 'Đang sinh trưởng',
    badge: 'success',
  },
  READY_TO_HARVEST: {
    color: 'error',
    label: 'Chờ thu hoạch',
    badge: 'error',
  },
  COMPLETED: {
    color: 'default',
    label: 'Hoàn thành',
    badge: 'default',
  },
  CANCELLED: {
    color: 'default',
    label: 'Đã hủy',
    badge: 'default',
  },
}

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  PAID: { color: 'success', label: 'Đã thanh toán' },
  UNPAID: { color: 'warning', label: 'Chưa thanh toán' },
  REFUNDED: { color: 'error', label: 'Đã hoàn tiền' },
  PENDING: { color: 'processing', label: 'Đang xử lý' },
  FAILED: { color: 'error', label: 'Thất bại' },
  REFUND_PENDING: { color: 'warning', label: 'Chờ hoàn tiền' },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ONLINE_APP: 'App (MCMS)',
  BANK_TRANSFER: 'Chuyển khoản',
  COD: 'COD',
}

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type OrderTab = 'ALL' | OrderStatus

const TAB_OPTIONS: Array<{ value: OrderTab; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING_TRAY_ASSIGNMENT', label: 'Chờ gán khay' },
  { value: 'ASSIGNED', label: 'Đã gán khay' },
  { value: 'GROWING', label: 'Đang trồng' },
  { value: 'READY_TO_HARVEST', label: 'Chờ thu hoạch' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
]

export function OrderManagementPage() {
  // ── Data from API (read-only) ──────────────────────────────────────────
  const {
    data: apiOrders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useOrders()

  const orders = useMemo(() => beOrdersToUiOrders(apiOrders), [apiOrders])

  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState<OrderTab>('ALL')
  const [detailOrder, setDetailOrder] = useState<AppOrder | null>(null)
  const [createRentalFor, setCreateRentalFor] = useState<AppOrder | null>(null)

  // Payment status polling — chỉ khi đang mở drawer chi tiết
  const { data: payosStatus } = useOrderPaymentStatus(
    detailOrder ? Number(detailOrder.id) : null,
  )

  const filteredOrders = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesSearch = q
        ? [
            order.orderCode,
            order.tenantName,
            order.tenantPhone,
            order.items.map((i) => i.mushroomType).join(' '),
          ].some((v) => v.toLowerCase().includes(q))
        : true

      const matchesTab = activeTab === 'ALL' || order.status === activeTab

      return matchesSearch && matchesTab
    })
  }, [activeTab, orders, searchText])

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: orders.length }
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1
    })
    return counts
  }, [orders])

  const columns: ColumnsType<AppOrder> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderCode',
      key: 'orderCode',
      width: 200,
      render: (code: string) => (
        <Typography.Text code style={{ fontSize: 13 }}>
          {code}
        </Typography.Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'tenant',
      width: 200,
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Typography.Text strong>{record.tenantName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.tenantPhone || '—'}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Loại nấm & Thời gian',
      key: 'items',
      width: 260,
      render: (_, record) => (
        <Flex vertical gap={4}>
          {record.items.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              (Đơn chưa có chi tiết nấm)
            </Typography.Text>
          ) : (
            record.items.map((item, idx) => (
              <Flex key={idx} vertical gap={2}>
                <Flex gap={4} align="center" wrap>
                  <Tag color="green">{item.mushroomType}</Tag>
                  <Tag color="cyan">× {item.weeks} Tuần</Tag>
                </Flex>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ×{item.quantity} khay · {VND.format(item.unitPrice)}/khay/tuần
                </Typography.Text>
              </Flex>
            ))
          )}
        </Flex>
      ),
    },
    {
      title: 'Nhận hàng',
      key: 'delivery',
      width: 180,
      render: (_, record) => {
        if (record.deliveryMethod === 'PICKUP') {
          return (
            <Tag icon={<EnvironmentOutlined />} color="blue">
              Tự đến hái
            </Tag>
          )
        }
        return (
          <Flex vertical gap={2}>
            <Tag color="orange">Giao tận nhà</Tag>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11 }}
              ellipsis={{ tooltip: record.deliveryAddress }}
            >
              {record.deliveryAddress ?? record.tenantAddress}
            </Typography.Text>
          </Flex>
        )
      },
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 160,
      render: (amount: number, record) => (
        <Flex vertical gap={2}>
          <Typography.Text strong type="danger">
            {VND.format(amount)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {PAYMENT_METHOD_LABELS[record.paymentMethod] ?? record.paymentMethod}
          </Typography.Text>
          <Tag
            color={PAYMENT_STATUS_CONFIG[record.paymentStatus]?.color}
            style={{ width: 'fit-content', fontSize: 11 }}
          >
            {PAYMENT_STATUS_CONFIG[record.paymentStatus]?.label ??
              record.paymentStatus}
          </Tag>
        </Flex>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status: OrderStatus, record) => {
        const config = STATUS_CONFIG[status]
        return (
          <Flex vertical gap={4}>
            <Tag color={config.color}>{config.label}</Tag>
            {record.trayId && (
              <Typography.Text code style={{ fontSize: 12 }}>
                {record.trayId}
              </Typography.Text>
            )}
          </Flex>
        )
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {DATE_FORMATTER.format(new Date(date))}
        </Typography.Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailOrder(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ]

  const livePayment = payosStatus?.data

  return (
    <div>
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Đơn đặt từ App
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi đơn khách đặt từ ứng dụng — chế độ chỉ xem, thao tác tạo /
            thanh toán / hủy thực hiện trên app người dùng.
          </Typography.Text>
        </div>

        <Badge
          count={tabCounts['PENDING_TRAY_ASSIGNMENT'] ?? 0}
          overflowCount={99}
        >
          <Tag color="warning" style={{ fontSize: 13, padding: '4px 12px' }}>
            {tabCounts['PENDING_TRAY_ASSIGNMENT'] ?? 0} đơn chờ gán khay
          </Tag>
        </Badge>
      </Flex>

      {/* Filters */}
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm mã đơn, tên khách, SĐT hoặc loại nấm"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 360, maxWidth: '100%' }}
        />
      </Flex>

      {/* Tabs */}
      <Segmented<OrderTab>
        value={activeTab}
        onChange={setActiveTab}
        options={TAB_OPTIONS.map((opt) => ({
          ...opt,
          label:
            opt.value === 'ALL'
              ? `Tất cả (${tabCounts.ALL})`
              : `${opt.label} (${tabCounts[opt.value] ?? 0})`,
        }))}
        style={{ marginBottom: 20 }}
      />

      {/* Table — Ant Design Table thay thế manual <table> */}
      <Table<AppOrder>
        dataSource={filteredOrders}
        columns={columns}
        rowKey="id"
        size="middle"
        loading={isLoading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} đơn`,
        }}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: isError ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Flex vertical align="center" gap={8}>
                  <Typography.Text type="danger">
                    Không tải được danh sách đơn đặt.
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
            <Empty description="Không có đơn đặt nào" />
          ),
        }}
      />

      {/* ── Drawer chi tiết đơn (read-only) ───────────────────────────── */}
      <Drawer
        title={
          detailOrder ? (
            <Space>
              <Typography.Text code>{detailOrder.orderCode}</Typography.Text>
              <Tag color={STATUS_CONFIG[detailOrder.status].color}>
                {STATUS_CONFIG[detailOrder.status].label}
              </Tag>
            </Space>
          ) : (
            'Chi tiết đơn'
          )
        }
        open={Boolean(detailOrder)}
        onClose={() => setDetailOrder(null)}
        width={520}
        destroyOnHidden
      >
        {detailOrder && (
          <Flex vertical gap={20}>
            <Descriptions
              column={1}
              size="small"
              bordered
              title="Thông tin đơn"
              items={[
                {
                  key: 'tenant',
                  label: 'Khách hàng',
                  children: (
                    <Flex vertical gap={2}>
                      <Typography.Text strong>
                        {detailOrder.tenantName}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {detailOrder.tenantPhone || '—'}
                      </Typography.Text>
                    </Flex>
                  ),
                },
                {
                  key: 'createdAt',
                  label: 'Ngày tạo',
                  children: DATE_FORMATTER.format(
                    new Date(detailOrder.createdAt),
                  ),
                },
                {
                  key: 'delivery',
                  label: 'Nhận hàng',
                  children:
                    detailOrder.deliveryMethod === 'PICKUP' ? (
                      <Tag icon={<EnvironmentOutlined />} color="blue">
                        Tự đến hái
                      </Tag>
                    ) : (
                      <Flex vertical gap={2}>
                        <Tag color="orange">Giao tận nhà</Tag>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {detailOrder.deliveryAddress ??
                            detailOrder.tenantAddress}
                        </Typography.Text>
                      </Flex>
                    ),
                },
                {
                  key: 'tray',
                  label: 'Khay được gán',
                  children: detailOrder.trayId ? (
                    <Typography.Text code>{detailOrder.trayId}</Typography.Text>
                  ) : (
                    <Typography.Text type="secondary">Chưa gán</Typography.Text>
                  ),
                },
              ]}
            />

            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Chi tiết nấm
              </Typography.Title>
              {detailOrder.items.length === 0 ? (
                <Typography.Text type="secondary">
                  Đơn chưa có chi tiết nấm.
                </Typography.Text>
              ) : (
                <Descriptions
                  column={1}
                  size="small"
                  bordered
                  items={detailOrder.items.map((item, idx) => ({
                    key: `item-${idx}`,
                    label: `${item.mushroomType} · ${item.weeks} tuần`,
                    children: (
                      <Flex vertical gap={2}>
                        <Typography.Text>
                          ×{item.quantity} khay ·{' '}
                          {VND.format(item.unitPrice)}/khay/tuần
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Thành tiền:{' '}
                          {VND.format(item.unitPrice * item.quantity * item.weeks)}
                        </Typography.Text>
                      </Flex>
                    ),
                  }))}
                />
              )}
            </div>

            <Descriptions
              column={1}
              size="small"
              bordered
              title={
                <Space>
                  <CreditCardOutlined />
                  Thanh toán
                </Space>
              }
              items={[
                {
                  key: 'method',
                  label: 'Hình thức',
                  children:
                    PAYMENT_METHOD_LABELS[detailOrder.paymentMethod] ??
                    detailOrder.paymentMethod,
                },
                {
                  key: 'status',
                  label: 'Trạng thái',
                  children: (
                    <Tag
                      color={
                        PAYMENT_STATUS_CONFIG[
                          livePayment?.paymentStatus ??
                            detailOrder.paymentStatus
                        ]?.color
                      }
                    >
                      {PAYMENT_STATUS_CONFIG[
                        livePayment?.paymentStatus ??
                          detailOrder.paymentStatus
                      ]?.label ??
                        livePayment?.paymentStatus ??
                        detailOrder.paymentStatus}
                    </Tag>
                  ),
                },
                {
                  key: 'code',
                  label: 'Mã thanh toán',
                  children: livePayment?.paymentCode ? (
                    <Typography.Text code>
                      {livePayment.paymentCode}
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  ),
                },
                {
                  key: 'amount',
                  label: 'Số tiền',
                  children: (
                    <Typography.Text strong type="danger">
                      {VND.format(
                        livePayment?.amount ?? detailOrder.totalAmount,
                      )}
                    </Typography.Text>
                  ),
                },
              ]}
            />

            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Đơn đặt được tạo và thanh toán trên ứng dụng khách hàng. Trang
              quản trị chỉ theo dõi trạng thái, không thực hiện thao tác ghi.
            </Typography.Text>

            {/* Đường khắc phục thủ công: đơn đã trả tiền nhưng webhook
                thanh toán lỗi nên chưa sinh vụ thuê. */}
            {detailOrder.paymentStatus === 'PAID' && (
              <Alert
                type="warning"
                showIcon
                message="Chưa thấy vụ thuê cho đơn này?"
                description="Trong trường hợp webhook thanh toán bị lỗi, bạn có thể tạo vụ thuê thủ công. Thao tác này an toàn — hệ thống không tạo trùng."
                action={
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => setCreateRentalFor(detailOrder)}
                  >
                    Tạo vụ thuê từ đơn
                  </Button>
                }
              />
            )}
          </Flex>
        )}
      </Drawer>

      {createRentalFor && (
        <CreateRentalFromOrderModal
          orderId={createRentalFor.id}
          open
          onClose={() => setCreateRentalFor(null)}
        />
      )}
    </div>
  )
}
