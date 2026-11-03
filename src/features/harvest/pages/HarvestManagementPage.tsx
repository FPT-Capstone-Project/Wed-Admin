import { calculateHarvestMetrics } from '../api/harvest-metrics'
import { Suspense, useState } from 'react'
import { Button, Card, Col, DatePicker, Flex, InputNumber, Row, Select, Statistic, Table, Tag, Typography } from 'antd'
import { PageHeader } from '../../../shared/ui'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate, auditWeight } from '../../../shared/ui/audit-format'
import { useMushroomTypes } from '../../packages/hooks/useMushroomTypes'
import { useHarvests } from '../api/harvest.queries'
import type { Harvest, HarvestQuery } from '../api/harvest.api'
import { HarvestDetailDrawer } from '../../../app/router/lazy-modals'
export function HarvestManagementPage() {
  const [filters, setFilters] = useState<HarvestQuery>({})
  const [selected, setSelected] = useState<number | null>(null)
  const query = useHarvests(filters)
  const mushrooms = useMushroomTypes()
  const rows = query.data?.data
  const metrics = rows ? calculateHarvestMetrics(rows) : null
  return <div style={{ fontVariantNumeric: 'tabular-nums' }}><PageHeader title="Quản lý Thu hoạch" description="Đối soát sản lượng và bàn giao · Chỉ xem. KPI theo bộ lọc; tỷ lệ A/B tính từ khối lượng thương phẩm của các đợt có phẩm cấp A/B." />
    <Flex gap={12} wrap style={{ marginBottom: 16 }}>
      <Select aria-label="Trạng thái thu hoạch" allowClear placeholder="Trạng thái" style={{ width: 180 }} options={['PLANNED', 'IN_PROGRESS', 'COMPLETED'].map(value => ({ value, label: value }))} onChange={status => setFilters({ ...filters, status })} />
      <Select aria-label="Loại nấm" allowClear placeholder="Loại nấm" style={{ width: 190 }} loading={mushrooms.isLoading} options={mushrooms.data?.map(m => ({ value: m.mushroom_type_id, label: m.name }))} onChange={mushroomTypeId => setFilters({ ...filters, mushroomTypeId })} />
      <InputNumber aria-label="Mã đơn hàng" min={1} precision={0} placeholder="Mã đơn" onChange={value => setFilters({ ...filters, orderId: value == null ? undefined : Number(value) })} />
      <DatePicker.RangePicker aria-label="Khoảng ngày thu hoạch" onChange={dates => setFilters({ ...filters, fromDate: dates?.[0]?.format('YYYY-MM-DD'), toDate: dates?.[1]?.format('YYYY-MM-DD') })} />
    </Flex>
    {mushrooms.isError && <QueryFeedback query={mushrooms} />}
    <QueryFeedback query={query} />
    {!query.isError && <><Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={8}><Card size="small" loading={query.isLoading}><Statistic title="Tổng sản lượng thu hoạch (kg)" value={metrics?.totalWeightKg ?? '—'} precision={2} /></Card></Col>
      <Col xs={24} md={8}><Card size="small" loading={query.isLoading}><Statistic title="Tỷ lệ thương phẩm A/B (%)" value={metrics?.gradeABPercent ?? '—'} precision={2} /></Card></Col>
      <Col xs={24} md={8}><Card size="small" loading={query.isLoading}><Statistic title="Đợt thu hoạch đang chờ giao" value={metrics?.pendingHandover ?? '—'} /></Card></Col>
    </Row>
    <Table<Harvest> size="small" rowKey="harvest_id" dataSource={rows} loading={query.isLoading} scroll={{ x: 1550 }} pagination={{ pageSize: 20, showSizeChanger: true }} locale={{ emptyText: 'Chưa có đợt thu hoạch phù hợp' }} columns={[
      { title: 'Đợt / Phiên', render: (_, h) => <code>#{h.harvest_id} / #{h.session_id}</code> },
      { title: 'Khách hàng / Đơn', render: (_, h) => <>{h.customer_name}<br /><code>{h.order_code}</code></> },
      { title: 'Loại nấm', dataIndex: 'mushroom_type' },
      { title: 'Hình thức nhận', render: (_, h) => <><Tag color={h.harvest_method === 'PICKUP' ? 'blue' : h.harvest_method === 'DELIVERY' ? 'purple' : undefined}>{h.harvest_method ?? 'Chưa chọn'}</Tag><Typography.Paragraph>{h.harvest_method === 'PICKUP' ? auditDate(h.scheduled_at) : h.customer_note ?? '—'}</Typography.Paragraph></> },
      { title: 'Tổng (kg)', dataIndex: 'total_weight_kg', render: auditWeight },
      { title: 'Thương phẩm (kg)', dataIndex: 'usable_weight_kg', render: auditWeight },
      { title: 'Loại bỏ (kg)', dataIndex: 'rejected_weight_kg', render: auditWeight },
      { title: 'Phẩm cấp', dataIndex: 'quality_grade', render: value => value ?? '—' },
      { title: 'Thu hoạch / Bàn giao', render: (_, h) => <><Tag>{h.status}</Tag><Tag>{h.harvest_request_status ?? 'Chưa có yêu cầu'}</Tag></> },
      { title: 'Người xác nhận (ID)', dataIndex: 'confirmed_by', render: value => value ?? '—' },
      { title: 'Hoàn tất bàn giao', dataIndex: 'completed_at', render: auditDate },
      { title: 'Chi tiết', render: (_, h) => <Button onClick={() => setSelected(h.harvest_id)}>Đối soát</Button> },
    ]} /></>}
    {selected !== null && (
      <Suspense fallback={null}>
        <HarvestDetailDrawer
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      </Suspense>
    )}
  </div>
}
