import { formatVND } from '../../shared/utils/currency'
import { LoadErrorAlert } from '../../shared/ui/LoadErrorAlert'
import { formatSessionProgress } from '../../features/sessions/utils/session-progress.utils'
import { formatDate, isValidDateValue } from '../../shared/utils/date'
import { cleanText } from '../../shared/utils/text'
import { OrderAuditTabs } from '../../features/orders/components/OrderAuditTabs'
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
  Descriptions,
  Drawer,
  Flex,
  Input,
  Segmented,
  Skeleton,
  Space,
  Tooltip,
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
  StatGrid,
  StatusBadge,
  MetadataBadge,
  UserAvatar,
} from '../../shared/ui'
import {
  ORDER_STATUS_DICTIONARY,
  PAYMENT_STATUS_DICTIONARY,
} from '../../shared/i18n/status/order'
import { SESSION_PROGRESS_STAGE_DICTIONARY } from '../../shared/i18n/status/session'
import { presentStatus, statusLabel } from '../../shared/i18n/status/registry'

/**
 * Trang Quản lý Đơn hàng — **100% READ-ONLY**.
 *
 * ⚠ KHÔNG có nút "Tạo vụ thuê từ đơn", không có nút thao tác trạng thái.
 *   Mọi hành động ghi (tạo phiên, ghi tiến độ, thu hoạch, huỷ, thông báo)
 *   do **nhân viên (staff)** thực hiện trên app.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/orders/admin` — danh sách đơn của **toàn bộ
 *   khách hàng** (roles 1 = Admin, 2 = Farm Operator), có phân trang
 *   server-side. Trước đây trang này phải hợp nhất 3 nguồn vì
 *   `GET /api/orders` chỉ trả đơn của chính user đăng nhập.
 */

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
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState<OrderTab>('ALL')
  const [detailOrder, setDetailOrder] = useState<AdminOrderRow | null>(null)

  // ── Data from API (read-only) ──────────────────────────────────────────
  const {
    orders,
    sessions,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    sourceErrors,
  } = useAdminOrders()

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

  const sessionId = cultivationStatus?.session_id ?? detailOrder?.sessionId
  const session = detailOrder
    ? sessions.find((entry) => entry.order_id === detailOrder.orderId &&
        (sessionId == null || entry.session_id === sessionId))
    : undefined
  const cultivationSummary = cultivationStatus || session ? {
    status: cleanText(cultivationStatus?.status) !== '—' ? cultivationStatus?.status : session?.status,
    growth_stage: cleanText(cultivationStatus?.growth_stage) !== '—'
      ? cultivationStatus?.growth_stage
      : session?.current_stage ?? session?.growth_status,
    progress_percent: formatSessionProgress(cultivationStatus?.progress_percent) !== '—' &&
      cultivationStatus?.progress_percent != null && Number.isFinite(Number(cultivationStatus.progress_percent))
      ? cultivationStatus.progress_percent
      : session?.progress_percent,
    expected_harvest_date: isValidDateValue(cultivationStatus?.expected_harvest_date)
      ? cultivationStatus?.expected_harvest_date
      : isValidDateValue(session?.harvest_date) ? session?.harvest_date : session?.end_at,
  } : null

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
      width: 130,
      render: (code: string) => (
        <Typography.Text code style={{ fontSize: 13 }}>
          {code}
        </Typography.Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'tenant',
      width: 190,
      render: (_, record) => (
        <Flex align="center" gap={8}>
          <UserAvatar name={record.customerName} size={32} />
          <Flex vertical gap={0} style={{ minWidth: 0 }}>
            <Typography.Text strong ellipsis={{ tooltip: record.customerName }}>
              {record.customerName}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12 }}
              ellipsis={{ tooltip: record.customerEmail }}
            >
              {record.customerEmail}
            </Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Gói / Dịch vụ thuê',
      key: 'package',
      width: 170,
      render: (_, record) => (
        <Flex vertical gap={4} style={{ minWidth: 0 }}>
          <Typography.Text ellipsis={{ tooltip: record.packageName }}>
            {record.packageName}
          </Typography.Text>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12 }}
            ellipsis={{ tooltip: record.mushroomName }}
          >
            {record.mushroomName}
          </Typography.Text>
          {record.quantity != null && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {record.quantity} khay
              {record.spawnIssued != null
                ? ` · ${record.spawnIssued} đơn vị phôi`
                : ''}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Phiên canh tác',
      key: 'session',
      width: 150,
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
      width: 140,
      render: (_, record) => {
        // ⚠ Tra qua từ điển trung tâm ⇒ **không bao giờ** lộ `payment_status`
        //   thô của BE (vd `REFUND_PENDING`) khi BE trả giá trị lạ.
        const payment = presentStatus(
          PAYMENT_STATUS_DICTIONARY,
          record.paymentStatus,
          'Chưa có thông tin',
        )
        return (
          <Flex vertical gap={2}>
            <StatusBadge tone={payment.tone} label={payment.label} />
            {record.totalAmount > 0 && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11 }}
                className="mcms-session-mono"
              >
                {formatVND(record.totalAmount)}
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
      width: 120,
      render: (status: AdminOrderStatus, record) => {
        const order = presentStatus(ORDER_STATUS_DICTIONARY, status)
        const badge = <StatusBadge tone={order.tone} label={order.label} />
        // ⚠ Trạng thái **dẫn xuất** từ phiên (BE quên update `orders.status`
        //   ở luồng bàn giao thu hoạch) ⇒ ghi chú lại để admin không tưởng
        //   dữ liệu sai. Xem `derive-order-status.ts`.
        if (!record.statusDerived) return badge
        return (
          <Tooltip title="Trạng thái này được suy ra từ trạng thái phiên canh tác: mọi phiên của đơn đã hoàn tất (bàn giao thu hoạch) nhưng hệ thống chưa cập nhật trạng thái đơn.">
            <span>{badge}</span>
          </Tooltip>
        )
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      className: 'mcms-session-mono',
      width: 120,
      render: (date: string | null) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatDate(date)}
        </Typography.Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 70,
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <ActionButton
          icon={<EyeOutlined />}
          label="Chi tiết"
          description={`Xem chi tiết đơn ${record.orderCode}`}
          variant="text"
          size="small"
          hideLabel
          onClick={() => setDetailOrder(record)}
        />
      ),
    },
  ]

  /**
   * ⚠ **Dữ liệu thanh toán "live" từ PayOS.**
   *
   *   Chỉ dùng được khi PayOS thực sự trả về **mã giao dịch hợp lệ**
   *   (`paymentCode` khác rỗng). Nếu không có mã ⇒ không có giao dịch PayOS
   *   nào (đơn chưa tạo link thanh toán, hoặc API lỗi/404) ⇒ **không**
   *   được dùng `amount` / `paymentStatus` của nó.
   *
   *   ⇒ Mặc định UI luôn hiển thị dữ liệu chuẩn của đơn
   *   (`detailOrder.paymentStatus` / `detailOrder.totalAmount`).
   */
  const livePayment = useMemo(() => {
    const data = payosStatus?.data
    if (!data?.paymentCode) return null
    return data
  }, [payosStatus])

  // ⚠ Skeleton chỉ hiện lần **đầu** (chưa có dữ liệu). Các lần đổi trang sau
  //   giữ bảng + spinner của antd để không nhảy layout.
  if (isLoading && orders.length === 0) {
    return (
      <div>
        <PageHeader
          title="Quản lý đơn hàng"
          description="Đang tải danh sách đơn của toàn bộ khách hàng…"
        />
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  }

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

      {sourceErrors.map(item => <div key={item.source} style={{ marginBottom: 12 }}><LoadErrorAlert error={item.error} resource={item.source} onRetry={refetch} /></div>)}

      <StatGrid columns={4}>
        <StatCard
          title="Tổng đơn"
          value={summary.total}
          tone="neutral"
          icon={<ShoppingCartOutlined />}
          description="Tất cả đơn từ ứng dụng khách hàng"
        />
        <StatCard
          title="Chờ xử lý"
          value={summary.pending}
          tone="warning"
          highlightValue
          description="Đơn chờ khởi tạo phiên canh tác"
        />
        <StatCard
          title="Đang xử lý"
          value={summary.processing}
          tone="ok"
          highlightValue
          description="Phiên đang trong quá trình canh tác"
        />
        <StatCard
          title="Tổng giá trị"
          value={formatVND(summary.totalAmount)}
          tone="info"
          icon={<CreditCardOutlined />}
          description="Tổng tiền của các đơn đã tạo"
        />
      </StatGrid>

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
        isFetching={isFetching}
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
        scrollX={1090}
        tableLayout="fixed"
      />

      {/* ── Drawer chi tiết đơn (read-only) ───────────────────────────── */}
      <Drawer
        rootClassName="mcms-session-drawer"
        title={
          detailOrder ? (
            <Space>
              <Typography.Text code>{detailOrder.orderCode}</Typography.Text>
              <StatusBadge
                {...presentStatus(ORDER_STATUS_DICTIONARY, detailOrder.status)}
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
          <OrderAuditTabs
            key={detailOrder.orderId}
            orderId={detailOrder.orderId}
            orderStatus={detailOrder.status}
            paymentStatus={livePayment?.paymentStatus ?? detailOrder.paymentStatus}
          ><Flex vertical gap={20}>
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
                  children: formatDate(detailOrder.createdAt),
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
                    return (
                      <StatusBadge
                        {...presentStatus(
                          PAYMENT_STATUS_DICTIONARY,
                          liveStatus,
                          'Chưa có thông tin',
                        )}
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
                      {formatVND(
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
              {cultivationSummary ? (
                <Descriptions
                  column={1}
                  size="small"
                  bordered
                  items={[
                    {
                      key: 'status',
                      label: 'Trạng thái',
                      children:
                        cultivationSummary.status ? (
                          <SessionStatusTag status={cultivationSummary.status} />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      key: 'stage',
                      label: 'Giai đoạn',
                      children: statusLabel(
                        SESSION_PROGRESS_STAGE_DICTIONARY,
                        cultivationSummary.growth_stage,
                        'Chưa ghi nhận',
                      ),
                    },
                    {
                      key: 'progress',
                      label: 'Tiến độ',
                      children:
                        formatSessionProgress(cultivationSummary.progress_percent),
                    },
                    {
                      key: 'harvest',
                      label: 'Dự kiến thu hoạch',
                      children: cultivationSummary.expected_harvest_date
                        ? formatDate(cultivationSummary.expected_harvest_date)
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
                        label={statusLabel(
                          SESSION_PROGRESS_STAGE_DICTIONARY,
                          entry.current_stage ?? entry.stage,
                          'Chưa ghi nhận',
                        )}
                      />
                      <Flex vertical gap={0}>
                        <Typography.Text style={{ fontSize: 12 }}>
                          {formatSessionProgress(entry.progress_percent)}
                          {entry.description ? ` · ${entry.description}` : ''}
                        </Typography.Text>
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 11 }}
                        >
                          {entry.created_at
                            ? formatDate(entry.created_at)
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
          </Flex></OrderAuditTabs>
        )}
      </Drawer>
    </div>
  )
}
