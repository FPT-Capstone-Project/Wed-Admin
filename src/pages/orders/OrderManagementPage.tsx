import { useMemo, useState } from 'react'
import {
  CreditCardOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  HomeOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Col,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Row,
  Segmented,
  Space,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { AppOrder, OrderStatus } from '../../types/order.types'
import { CreateRentalFromOrderModal } from '../../features/rentals/components/CreateRentalFromOrderModal'
import { useOrders } from '../../features/orders/hooks/useOrders'
import { useOrderPaymentStatus } from '../../features/orders/hooks/usePayments'
import { beOrdersToUiOrders } from '../../types/order.mapper'
import {
  ActionButton,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  UserAvatar,
} from '../../shared/ui'
import type { SemanticTone } from '../../app/theme/tokens'

const STATUS_CONFIG: Record<
  OrderStatus,
  { tone: SemanticTone; label: string }
> = {
  PENDING_TRAY_ASSIGNMENT: { tone: 'warning', label: 'Chờ gán khay' },
  ASSIGNED: { tone: 'info', label: 'Đã gán khay' },
  GROWING: { tone: 'ok', label: 'Đang sinh trưởng' },
  READY_TO_HARVEST: { tone: 'danger', label: 'Chờ thu hoạch' },
  COMPLETED: { tone: 'muted', label: 'Hoàn thành' },
  CANCELLED: { tone: 'muted', label: 'Đã hủy' },
}

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { tone: SemanticTone; label: string }
> = {
  PAID: { tone: 'ok', label: 'Đã thanh toán' },
  UNPAID: { tone: 'warning', label: 'Chưa thanh toán' },
  REFUNDED: { tone: 'danger', label: 'Đã hoàn tiền' },
  PENDING: { tone: 'info', label: 'Đang xử lý' },
  FAILED: { tone: 'danger', label: 'Thất bại' },
  REFUND_PENDING: { tone: 'warning', label: 'Chờ hoàn tiền' },
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

  const summary = useMemo(
    () => ({
      total: orders.length,
      pendingTray: tabCounts['PENDING_TRAY_ASSIGNMENT'] ?? 0,
      growing: tabCounts['GROWING'] ?? 0,
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    }),
    [orders, tabCounts],
  )

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
      width: 220,
      render: (_, record) => (
        <Flex align="center" gap={8}>
          <UserAvatar name={record.tenantName} size={32} />
          <Flex vertical gap={0}>
            <Typography.Text strong>{record.tenantName}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.tenantPhone || '—'}
            </Typography.Text>
          </Flex>
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
                  <StatusBadge tone="ok" label={item.mushroomType} />
                  <StatusBadge tone="info" label={`× ${item.weeks} tuần`} />
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
            <StatusBadge
              tone="info"
              label="Tự đến hái"
              icon={<EnvironmentOutlined />}
            />
          )
        }
        return (
          <Flex vertical gap={2}>
            <StatusBadge
              tone="warning"
              label="Giao tận nhà"
              icon={<HomeOutlined />}
            />
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
      render: (amount: number, record) => {
        const paymentConfig = PAYMENT_STATUS_CONFIG[record.paymentStatus]
        return (
          <Flex vertical gap={2}>
            <Typography.Text strong type="danger">
              {VND.format(amount)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {PAYMENT_METHOD_LABELS[record.paymentMethod] ?? record.paymentMethod}
            </Typography.Text>
            {paymentConfig && (
              <StatusBadge
                tone={paymentConfig.tone}
                label={paymentConfig.label}
              />
            )}
          </Flex>
        )
      },
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
            <StatusBadge tone={config.tone} label={config.label} />
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
        <ActionButton
          icon={<EyeOutlined />}
          label="Chi tiết"
          description={`Xem chi tiết đơn ${record.orderCode}`}
          variant="default"
          size="small"
          onClick={() => setDetailOrder(record)}
        />
      ),
    },
  ]

  const livePayment = payosStatus?.data

  return (
    <div>
      <PageHeader
        title="Đơn đặt từ App"
        description="Theo dõi đơn khách đặt từ ứng dụng — chế độ chỉ xem, thao tác tạo / thanh toán / hủy thực hiện trên app người dùng."
        actions={
          <StatusBadge
            tone="warning"
            label={`${summary.pendingTray} đơn chờ gán khay`}
          />
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--mcms-space-5)' }}>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tổng đơn"
            value={summary.total}
            tone="neutral"
            icon={<ShoppingCartOutlined />}
            description="Tất cả đơn từ ứng dụng khách hàng"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Chờ gán khay"
            value={summary.pendingTray}
            tone="warning"
            highlightValue
            description="Đơn đã thanh toán nhưng chưa có khay"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đang trồng"
            value={summary.growing}
            tone="ok"
            highlightValue
            description="Khay đang sinh trưởng"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Tổng giá trị"
            value={VND.format(summary.totalAmount)}
            tone="info"
            icon={<CreditCardOutlined />}
            description="Tổng tiền của các đơn đã tạo"
          />
        </Col>
      </Row>

      <Flex gap={12} wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm mã đơn, tên khách, SĐT hoặc loại nấm"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 360, maxWidth: '100%' }}
        />
      </Flex>

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
        style={{ marginBottom: 'var(--mcms-space-5)' }}
      />

      <DataTable<AppOrder>
        dataSource={filteredOrders}
        columns={columns}
        rowKey="id"
        size="middle"
        loading={isLoading}
        error={
          isError
            ? {
                message:
                  error?.message ??
                  'Đã xảy ra lỗi không xác định khi tải danh sách đơn đặt.',
              }
            : null
        }
        onRetry={() => void refetch()}
        emptyTitle="Chưa có đơn đặt nào"
        emptyDescription="Các đơn khách hàng đặt từ ứng dụng sẽ xuất hiện tại đây."
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} đơn`,
        }}
        scrollX={1200}
      />

      {/* ── Drawer chi tiết đơn (read-only) ───────────────────────────── */}
      <Drawer
        title={
          detailOrder ? (
            <Space>
              <Typography.Text code>{detailOrder.orderCode}</Typography.Text>
              <StatusBadge
                tone={STATUS_CONFIG[detailOrder.status].tone}
                label={STATUS_CONFIG[detailOrder.status].label}
              />
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
                    <Flex align="center" gap={8}>
                      <UserAvatar name={detailOrder.tenantName} size={32} />
                      <Flex vertical gap={0}>
                        <Typography.Text strong>
                          {detailOrder.tenantName}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {detailOrder.tenantPhone || '—'}
                        </Typography.Text>
                      </Flex>
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
                      <StatusBadge
                        tone="info"
                        label="Tự đến hái"
                        icon={<EnvironmentOutlined />}
                      />
                    ) : (
                      <Flex vertical gap={2}>
                        <StatusBadge
                          tone="warning"
                          label="Giao tận nhà"
                          icon={<HomeOutlined />}
                        />
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
                <EmptyState
                  title="Đơn chưa có chi tiết nấm"
                  description="Đơn chưa được gán loại nấm cụ thể trên ứng dụng."
                />
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
                  children: (() => {
                    const liveStatus =
                      livePayment?.paymentStatus ?? detailOrder.paymentStatus
                    const config = PAYMENT_STATUS_CONFIG[liveStatus]
                    return (
                      <StatusBadge
                        tone={config?.tone ?? 'neutral'}
                        label={config?.label ?? liveStatus}
                      />
                    )
                  })(),
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
