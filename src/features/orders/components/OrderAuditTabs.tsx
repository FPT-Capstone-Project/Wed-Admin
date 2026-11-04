import { DataTable } from '../../../shared/ui/DataTable'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Descriptions, Empty, Flex, Tabs, Tag } from 'antd'
import { orderAuditApi, type OrderHarvestEntry } from '../api/order-audit.api'
import { useCultivationTrays } from '../../rooms/hooks/useCultivation'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate, auditWeight } from '../../../shared/ui/audit-format'
function CultivationAudit({ id }: { id: number }) {
  const query = useQuery({ queryKey: ['orders', id, 'cultivation-audit'], queryFn: () => orderAuditApi.cultivation(id) })
  const trays = useCultivationTrays()
  const codes = new Map(trays.data?.map(tray => [tray.tray_id, tray.tray_code]))
  return <Flex vertical gap={12}><QueryFeedback query={query} />{trays.isError && <QueryFeedback query={trays} />}
    {!query.isError && query.data && (query.data.sessions.length ? query.data.sessions.map(session => <Card key={session.session_id} size="small" title={`Phiên #${session.session_id} · ${session.mushroom_name}`}><Descriptions column={1} size="small" bordered items={[
      { key: 'status', label: 'Trạng thái', children: <Tag>{session.status}</Tag> },
      { key: 'stage', label: 'Sinh trưởng', children: `${session.current_stage ?? 'Chưa ghi nhận'} · ${session.progress_percent ?? '—'}%` },
      { key: 'harvest', label: 'Dự kiến thu hoạch', children: auditDate(session.expected_harvest_date) },
      { key: 'spawn', label: 'Số phôi', children: session.spawn_quantity },
      { key: 'trays', label: 'Khay gán', children: session.assigned_trays.length ? session.assigned_trays.map(tray => <Tag key={tray.session_tray_id}>{codes.get(tray.tray_id) ?? `ID ${tray.tray_id}`} · {tray.status}</Tag>) : 'Chưa gán khay' },
    ]} /></Card>) : <Empty description="Đơn hàng chưa có phiên canh tác" />)}
    <Alert type="info" title="Thông tin lô phôi" description="Nguồn dữ liệu hiện tại chỉ cung cấp số phôi theo phiên, chưa cung cấp mã lô phôi để đối soát." />
  </Flex>
}
function HarvestAudit({ id }: { id: number }) {
  const query = useQuery({ queryKey: ['orders', id, 'harvest-history'], queryFn: () => orderAuditApi.harvests(id) })
  return <><QueryFeedback query={query} />{!query.isError && <DataTable<OrderHarvestEntry> size="small" rowKey="session_id" loading={query.isLoading} dataSource={query.data?.harvests} pagination={false} scroll={{ x: 850 }} locale={{ emptyText: 'Chưa có lịch sử thu hoạch' }} columns={[
    { title: 'Phiên', dataIndex: 'session_id' }, { title: 'Loại nấm', render: (_, row) => row.mushroom_type.name },
    { title: 'Đợt / Trạng thái', render: (_, row) => row.harvest ? `#${row.harvest.harvest_id} · ${row.harvest.status}` : 'Chưa thu hoạch' },
    { title: 'Ngày', render: (_, row) => auditDate(row.harvest?.harvest_date) },
    { title: 'Tổng (kg)', render: (_, row) => auditWeight(row.harvest?.total_weight_kg) },
    { title: 'Thương phẩm (kg)', render: (_, row) => auditWeight(row.harvest?.usable_weight_kg) },
    { title: 'Loại bỏ (kg)', render: (_, row) => auditWeight(row.harvest?.rejected_weight_kg) },
    { title: 'Phẩm cấp', render: (_, row) => row.harvest?.quality_grade ?? '—' },
    { title: 'Hình thức nhận', render: (_, row) => row.harvest?.harvest_method ?? 'Chưa chọn' },
  ]} />}</>
}
export function OrderAuditTabs({ orderId, children }: { orderId: number; children: ReactNode }) {
  return <Tabs destroyOnHidden items={[
    { key: 'overview', label: 'Thông tin đơn', children },
    { key: 'cultivation', label: 'Tiến trình canh tác', children: <CultivationAudit id={orderId} /> },
    { key: 'harvest', label: 'Lịch sử thu hoạch', children: <HarvestAudit id={orderId} /> },
  ]} />
}
