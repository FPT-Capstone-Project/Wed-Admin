import '../../features/sessions/sessions-industrial.css'
import { useMemo, useState } from 'react'
import {
  CreditCardOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import {
  Col,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Row,
  Segmented,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useOrderPaymentStatus } from '../../features/orders/hooks/usePayments'
import {
  useOrderCultivationProgress,
  useOrderCultivationStatus,
  useOrderSpawnInspections,
} from '../../features/orders/hooks/useCustomerOrders'
import { useAdminOrders } from '../../features/orders/hooks/useAdminOrders'
import { SessionStatusTag } from '../../features/sessions/components/SessionStatusTag'
import { SpawnInspectionList } from '../../features/farm/components/SpawnInspectionList'
import type { AdminOrderRow, AdminOrderStatus } from '../../features/orders/types/admin-order.types'
import {
  ActionButton,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  MetadataBadge,
  UserAvatar,
} from '../../shared/ui'
import type { SemanticTone } from '../../app/theme/tokens'

/**
 * Trang Quản lý Đơn hàng — **100% READ-ONLY**.
 *
 * ⚠ KHÔNG có nút "Tạo vụ thuê từ đơn", không có nút thao tác trạng thái.
 *   Mọi hành động ghi (tạo phiên, ghi tiến độ, thu hoạch, huỷ, thông báo)
 *   do **nhân viên (staff)** thực hiện trên app.
 *
 * ⚠ `GET /api/orders` của BE chỉ trả đơn của chính user đăng nhập → Admin
 *   dùng `useAdminOrders()` để hợp nhất thêm dữ liệu từ
 *   `GET /api/cultivation-sessions/admin` + `GET /api/farm/sessions`.
 */

const STATUS_CONFIG: Record<
  AdminOrderStatus,
  { tone: SemanticTone; label: string }
> = {
  PENDING: { tone: 'warning', label: 'Chờ xử lý' },
  CONFIRMED: { tone: 'info', label: 'Đã xác nhận' },
  PROCESSING: { tone: 'ok', label: 'Đang xử lý' },
  COMPLETED: { tone: 'muted', label: 'Hoàn thành' },
  CANCELLED: { tone: 'danger', label: 'Đã hủy' },
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

type OrderTab = 'ALL' | AdminOrderStatus

/** Bộ lọc tab khớp **đúng 5 trạng thái** của BE (`orders.status`). */
const TAB_OPTIONS: Array<{ value: OrderTab; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export function OrderManagementPage() {
  // ── Data from API (read-only) ──────────────────────────────────────────
  const { orders, isLoading, isError, error, refetch } = useAdminOrders()

  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState<OrderTab>('ALL')
  const [detailOrder, setDetailOrder] = useState<AdminOrderRow | null>(null)

  // Payment status polling — chỉ khi đang mở drawer chi tiết
  const { data: payosStatus } = useOrderPaymentStatus(
    detailOrder ? detailOrder.orderId : null,
  )

  // Dữ liệu theo đơn (chỉ đọc) — trạng thái, timeline, lịch sử kiểm tra phôi
  const { data: cultivationStatus } = useOrderCultivationStatus(
    detailOrder ? detailOrder.orderId : null,
  )
  const { data: cultivationProgress } = useOrderCultivationProgress(
    detailOrder ? detailOrder.orderId : null,
  )
  const { data: spawnInspections } = useOrderSpawnInspections(
    detailOrder ? detailOrder.orderId : null,
  )

  const filteredOrders = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesSearch = q
        ? [
            order.orderCode,
            order.customerName,
            order.customerEmail,
            order.packageName,
            order.mushroomName,
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
      pending: tabCounts['PENDING'] ?? 0,
      processing: tabCounts['PROCESSING'] ?? 0,
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    }),
    [orders, tabCounts],
  )

  const columns: ColumnsType<AdminOrderRow> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderCode',
      key: 'orderCode',
      className: 'mcms-session-mono',
      width: 150,
      render: (code: string) => (
        <Typography.Text code style={{ fontSize: 13 }}>
          {code}
        </Typography.Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'tenant',
      width: 230,
      render: (_, record) => (
        <Flex align="center" gap={8}>
          <UserAvatar name={record.customerName} size={32} />
          <Flex vertical gap={0}>
            <Typography.Text strong>{record.customerName}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.customerEmail}
            </Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Gói / Nấm',
      key: 'package',
      width: 200,
      render: (_, record) => (
        <Flex vertical gap={4}>
          <Typography.Text>{record.packageName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.mushroomName}
            {record.spawnIssued != null
              ? ` · ${record.spawnIssued} đơn vị phôi`
              : ''}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Phiên canh tác',
      key: 'session',
      width: 180,
      render: (_, record) =>
        record.sessionStatus ? (
          <Flex vertical gap={4}>
            <SessionStatusTag status={record.sessionStatus} />
            {record.sessionId != null && (
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                Phiên #{record.sessionId}
              </Typography.Text>
            )}
          </Flex>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Chưa có phiên
          </Typography.Text>
        ),
    },
    {
      title: 'Thanh toán',
      key: 'payment',
      width: 150,
      render: (_, record) => {
        const config = PAYMENT_STATUS_CONFIG[record.paymentStatus]
        return (
          <Flex vertical gap={2}>
            {config ? (
              <StatusBadge tone={config.tone} label={config.label} />
            ) : (
              <MetadataBadge label={record.paymentStatus} />
            )}
            {record.totalAmount > 0 && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11 }}
                className="mcms-session-mono"
              >
                {VND.format(record.totalAmount)}
              </Typography.Text>
            )}
          </Flex>
        )
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: AdminOrderStatus) => {
        const config = STATUS_CONFIG[status]
        return <StatusBadge tone={config.tone} label={config.label} />
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      className: 'mcms-session-mono',
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
          variant="text"
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
        title="Quản lý đơn hàng"
        description="Theo dõi đơn khách đặt từ ứng dụng — trạng thái thanh toán, tiến độ canh tác và lịch sử kiểm tra phôi. Chế độ chỉ xem."
        actions={
          <StatusBadge
            tone="warning"
            label={`${summary.pending} đơn chờ xử lý`}
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
            title="Chờ xử lý"
            value={summary.pending}
            tone="warning"
            highlightValue
            description="Đơn chờ khởi tạo phiên canh tác"
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            title="Đang xử lý"
            value={summary.processing}
            tone="ok"
            highlightValue
            description="Phiên đang trong quá trình canh tác"
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
          placeholder="Tìm mã đơn, tên khách, email, gói hoặc loại nấm"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 380, maxWidth: '100%' }}
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

      <DataTable<AdminOrderRow>
        dataSource={filteredOrders}
        columns={columns}
        rowKey="orderId"
        size="small"
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
        scrollX={1250}
      />

      {/* ── Drawer chi tiết đơn (read-only) ───────────────────────────── */}
      <Drawer
        rootClassName="mcms-session-drawer"
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
        width={620}
        destroyOnHidden
      >
        {detailOrder && (
          <Flex vertical gap={20}>
            {/* ── Thông tin đơn ─────────────────────────────────────── */}
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
                      <UserAvatar name={detailOrder.customerName} size={32} />
                      <Flex vertical gap={0}>
                        <Typography.Text strong>
                          {detailOrder.customerName}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {detailOrder.customerEmail}
                        </Typography.Text>
                      </Flex>
                    </Flex>
                  ),
                },
                {
                  key: 'createdAt',
                  label: 'Ngày tạo',
                  className: 'mcms-session-mono',
                  children: DATE_FORMATTER.format(
                    new Date(detailOrder.createdAt),
                  ),
                },
                {
                  key: 'package',
                  label: 'Gói thuê',
                  children: detailOrder.packageName,
                },
                {
                  key: 'mushroom',
                  label: 'Loại nấm',
                  children: detailOrder.mushroomName,
                },
                {
                  key: 'session',
                  label: 'Phiên canh tác',
                  children:
                    detailOrder.sessionStatus && detailOrder.sessionId != null ? (
                      <Flex align="center" gap={8} wrap>
                        <SessionStatusTag status={detailOrder.sessionStatus} />
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          Phiên #{detailOrder.sessionId}
                        </Typography.Text>
                      </Flex>
                    ) : (
                      <Typography.Text type="secondary">
                        Chưa có phiên canh tác
                      </Typography.Text>
                    ),
                },
              ]}
            />

            {/* ── Thanh toán ─────────────────────────────────────────── */}
            <Descriptions
              column={1}
              size="small"
              bordered
              title={
                <Space>
                  <CreditCardOutlined />
                  Thanh toán PayOS
                </Space>
              }
              items={[
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

            {/* ── Trạng thái canh tác (từ customer API) ─────────────── */}
            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Trạng thái canh tác
              </Typography.Title>
              {cultivationStatus ? (
                <Descriptions
                  column={1}
                  size="small"
                  bordered
                  items={[
                    {
                      key: 'status',
                      label: 'Trạng thái',
                      children:
                        cultivationStatus.status ? (
                          <SessionStatusTag status={cultivationStatus.status} />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      key: 'stage',
                      label: 'Giai đoạn',
                      children: cultivationStatus.growth_stage ?? '—',
                    },
                    {
                      key: 'progress',
                      label: 'Tiến độ',
                      children:
                        cultivationStatus.progress_percent != null
                          ? `${cultivationStatus.progress_percent}%`
                          : '—',
                    },
                    {
                      key: 'harvest',
                      label: 'Dự kiến thu hoạch',
                      children: cultivationStatus.expected_harvest_date
                        ? DATE_FORMATTER.format(
                            new Date(cultivationStatus.expected_harvest_date),
                          )
                        : '—',
                    },
                  ]}
                />
              ) : (
                <EmptyState
                  title="Chưa có dữ liệu canh tác"
                  description="Đơn này chưa gắn với phiên canh tác nào trên hệ thống."
                />
              )}
            </div>

            {/* ── Timeline tiến độ ──────────────────────────────────── */}
            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Timeline tiến độ
              </Typography.Title>
              {cultivationProgress?.entries?.length ? (
                <Flex vertical gap={8}>
                  {cultivationProgress.entries.map((entry, index) => (
                    <Flex key={entry.progress_id ?? index} gap={10} align="start">
                      <MetadataBadge
                        label={entry.current_stage ?? entry.stage ?? '—'}
                      />
                      <Flex vertical gap={0}>
                        <Typography.Text style={{ fontSize: 12 }}>
                          {entry.progress_percent != null
                            ? `${entry.progress_percent}%`
                            : '—'}
                          {entry.description ? ` · ${entry.description}` : ''}
                        </Typography.Text>
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 11 }}
                        >
                          {entry.created_at
                            ? DATE_FORMATTER.format(new Date(entry.created_at))
                            : '—'}
                        </Typography.Text>
                      </Flex>
                    </Flex>
                  ))}
                </Flex>
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Chưa có mốc tiến độ nào được ghi nhận.
                </Typography.Text>
              )}
            </div>

            {/* ── Lịch sử kiểm tra phôi ────────────────────────────── */}
            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Lịch sử kiểm tra phôi
              </Typography.Title>
              <SpawnInspectionList
                inspections={spawnInspections?.inspections ?? []}
                emptyDescription="Chưa có lần kiểm tra phôi nào cho đơn này."
              />
            </div>

            <Flex align="center" gap={6} wrap>
              <EnvironmentOutlined aria-hidden="true" />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Đơn đặt được tạo và thanh toán trên ứng dụng khách hàng. Trang
                quản trị chỉ theo dõi trạng thái, không thực hiện thao tác ghi.
              </Typography.Text>
            </Flex>

            {isLoading && <Skeleton active paragraph={{ rows: 2 }} />}
          </Flex>
        )}
      </Drawer>
    </div>
  )
}
