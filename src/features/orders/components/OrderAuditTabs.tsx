import { DataTable } from '../../../shared/ui/DataTable'
import { formatSessionProgress } from '../../sessions/utils/session-progress.utils'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Descriptions, Empty, Flex, Tabs } from 'antd'
import { orderAuditApi, type OrderHarvestEntry } from '../api/order-audit.api'
import { useCultivationTrays } from '../../rooms/hooks/useCultivation'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate, auditWeight } from '../../../shared/ui/audit-format'
import { StatusBadge } from '../../../shared/ui'
import {
  HARVEST_METHOD_DICTIONARY,
  HARVEST_QUALITY_DICTIONARY,
  HARVEST_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/harvest'
import {
  SESSION_PROGRESS_STAGE_DICTIONARY,
  SESSION_STATUS_DICTIONARY,
  SESSION_TRAY_ASSIGNMENT_DICTIONARY,
  resolveSessionHarvestStatus,
} from '../../../shared/i18n/status/session'
import {
  ORDER_STATUS_DICTIONARY,
  PAYMENT_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/order'
import { presentStatus, statusLabel } from '../../../shared/i18n/status/registry'

/**
 * Nhãn trạng thái **đơn hàng**.
 *
 * ⚠ Luôn tra qua từ điển `order.ts` ⇒ không bao giờ lộ `PENDING` / `PAID`…
 *   thô ra giao diện.
 */
function orderStatusLabel(status: string | null | undefined): string {
  return statusLabel(ORDER_STATUS_DICTIONARY, status, 'Chưa xác định')
}

/**
 * Nhãn trạng thái **thanh toán**.
 *
 * ⚠ `REFUND_PENDING` chỉ có ở từ điển `order.ts` — nếu map sai chỗ sẽ lộ
 *   chuỗi thô ra UI.
 */
function paymentStatusLabel(status: string | null | undefined): string {
  return statusLabel(PAYMENT_STATUS_DICTIONARY, status, 'Chưa có thông tin')
}

/**
 * Tab "Tiến trình canh tác" — đối soán trạng thái **đơn** với trạng thái
 * **phiên** của từng phiên canh tác.
 *
 * ⚠ Trạng thái đơn + thanh toán được truyền từ `OrderManagementPage`
 *   (nguồn `GET /api/orders/admin`) ⇒ **không** gọi thêm request.
 */
function CultivationAudit({
  id,
  orderStatus,
  paymentStatus,
}: {
  id: number
  orderStatus: string | null | undefined
  paymentStatus: string | null | undefined
}) {
  const query = useQuery({ queryKey: ['orders', id, 'cultivation-audit'], queryFn: () => orderAuditApi.cultivation(id) })
  const trays = useCultivationTrays()
  const codes = new Map(trays.data?.map(tray => [tray.tray_id, tray.tray_code]))
  return <Flex vertical gap={12}><QueryFeedback query={query} />{trays.isError && <QueryFeedback query={trays} />}
    <Descriptions
      column={1}
      size="small"
      bordered
      title="Trạng thái đơn"
      items={[
        {
          key: 'order-status',
          label: 'Trạng thái đơn',
          children: (
            <StatusBadge
              {...presentStatus(ORDER_STATUS_DICTIONARY, orderStatus)}
              title={`Trạng thái đơn: ${orderStatusLabel(orderStatus)}`}
            />
          ),
        },
        {
          key: 'payment-status',
          label: 'Thanh toán',
          children: (
            <StatusBadge
              {...presentStatus(PAYMENT_STATUS_DICTIONARY, paymentStatus, 'Chưa có thông tin')}
              title={`Trạng thái thanh toán: ${paymentStatusLabel(paymentStatus)}`}
            />
          ),
        },
      ]}
    />
    {!query.isError && query.data && (query.data.sessions?.length ? query.data.sessions.map(session => <Card key={session.session_id} size="small" title={`Phiên #${session.session_id} · ${session.mushroom_name}`}><Descriptions column={1} size="small" bordered items={[
      { key: 'status', label: 'Trạng thái', children: <StatusBadge {...presentStatus(SESSION_STATUS_DICTIONARY, session.status)} title="Trạng thái phiên canh tác" /> },
      { key: 'harvest-status', label: 'Sẵn sàng thu hoạch', children: (() => {
        // ⚠ Phiên đã `COMPLETED` ⇒ "Đã thu hoạch" (xanh lá), KHÔNG phải badge
        //   cam "Sẵn sàng thu hoạch" (BE vẫn giữ `harvest_status = 'HARVEST_READY'`).
        const harvest = resolveSessionHarvestStatus(session.status, session.harvest_status)
        return harvest
          ? <StatusBadge {...harvest} title="Trạng thái thu hoạch của phiên" />
          : <span>—</span>
      })() },
      { key: 'stage', label: 'Sinh trưởng', children: `${statusLabel(SESSION_PROGRESS_STAGE_DICTIONARY, session.current_stage, 'Chưa ghi nhận')} · ${formatSessionProgress(session.progress_percent)}` },
      { key: 'harvest', label: 'Dự kiến thu hoạch', children: auditDate(session.expected_harvest_date) },
      { key: 'spawn', label: 'Số phôi', children: session.spawn_quantity },
      { key: 'trays', label: 'Khay gán', children: session.assigned_trays?.length ? session.assigned_trays.map(tray => <Flex key={tray.session_tray_id} align="center" gap={6} wrap><span>{codes.get(tray.tray_id) ?? `ID ${tray.tray_id}`}</span>{['COMPLETED', 'HARVESTED', 'CANCELLED'].includes(session.status) ? <StatusBadge tone="muted" label="Đã giải phóng" title="Phiên đã kết thúc, khay đã được giải phóng" /> : <StatusBadge {...presentStatus(SESSION_TRAY_ASSIGNMENT_DICTIONARY, tray.status)} title="Trạng thái gán khay trong phiên" />}</Flex>) : 'Chưa gán khay' },
    ]} /></Card>) : <Empty description="Đơn hàng chưa có phiên canh tác" />)}
    <Alert type="info" title="Thông tin lô phôi" description="Nguồn dữ liệu hiện tại chỉ cung cấp số phôi theo phiên, chưa cung cấp mã lô phôi để đối soát." />
  </Flex>
}
function HarvestAudit({ id }: { id: number }) {
  const query = useQuery({ queryKey: ['orders', id, 'harvest-history'], queryFn: () => orderAuditApi.harvests(id) })
  return <><QueryFeedback query={query} />{!query.isError && <DataTable<OrderHarvestEntry> size="small" rowKey="session_id" loading={query.isLoading} dataSource={query.data?.harvests} pagination={false} scroll={{ x: 850 }} emptyTitle="Chưa có lịch sử thu hoạch" emptyDescription="Lịch sử sẽ hiển thị khi đơn hàng có đợt thu hoạch được ghi nhận." columns={[
    { title: 'Phiên', dataIndex: 'session_id' }, { title: 'Loại nấm', render: (_, row) => row.mushroom_type?.name ?? '—' },
    {
      title: 'Đợt / Trạng thái',
      render: (_, row) => row.harvest
        ? <Flex align="center" gap={6} wrap><code>#{row.harvest?.harvest_id}</code><StatusBadge {...presentStatus(HARVEST_STATUS_DICTIONARY, row.harvest?.status)} title="Trạng thái vụ thu hoạch" /></Flex>
        : 'Chưa thu hoạch',
    },
    { title: 'Ngày', render: (_, row) => auditDate(row.harvest?.harvest_date) },
    { title: 'Tổng (kg)', render: (_, row) => auditWeight(row.harvest?.total_weight_kg) },
    { title: 'Thương phẩm (kg)', render: (_, row) => auditWeight(row.harvest?.usable_weight_kg) },
    { title: 'Loại bỏ (kg)', render: (_, row) => auditWeight(row.harvest?.rejected_weight_kg) },
    { title: 'Phẩm cấp', render: (_, row) => row.harvest ? statusLabel(HARVEST_QUALITY_DICTIONARY, row.harvest?.quality_grade, 'Chưa ghi nhận') : '—' },
    { title: 'Hình thức nhận', render: (_, row) => row.harvest ? statusLabel(HARVEST_METHOD_DICTIONARY, row.harvest?.harvest_method, 'Chưa chọn') : '—' },
  ]} />}</>
}
export function OrderAuditTabs({
  orderId,
  orderStatus,
  paymentStatus,
  children,
}: {
  orderId: number
  /** Trạng thái đơn — map bằng `ORDER_STATUS_DICTIONARY` (`order.ts`). */
  orderStatus: string | null | undefined
  /** Trạng thái thanh toán — map bằng `PAYMENT_STATUS_DICTIONARY` (`order.ts`). */
  paymentStatus: string | null | undefined
  children: ReactNode
}) {
  return <Tabs destroyOnHidden items={[
    { key: 'overview', label: 'Thông tin đơn', children },
    { key: 'cultivation', label: 'Tiến trình canh tác', children: <CultivationAudit id={orderId} orderStatus={orderStatus} paymentStatus={paymentStatus} /> },
    { key: 'harvest', label: 'Lịch sử thu hoạch', children: <HarvestAudit id={orderId} /> },
  ]} />
}
