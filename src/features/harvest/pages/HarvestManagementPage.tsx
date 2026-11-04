import { DataTable } from '../../../shared/ui/DataTable'
import { HARVEST_STATUS_PRESENTATION, HARVEST_METHOD_PRESENTATION, displayPresentation } from '../../../shared/i18n/terms'
import { calculateHarvestMetrics } from '../api/harvest-metrics'
import { Suspense, useState } from 'react'
import { Button, Descriptions, Col, DatePicker, Flex, InputNumber, Row, Select, Typography } from 'antd'
import { PageHeader, StatusBadge, StatCard } from '../../../shared/ui'
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
      <Select aria-label="Trạng thái thu hoạch" allowClear placeholder="Trạng thái" style={{ width: 180 }} options={['PLANNED', 'IN_PROGRESS', 'COMPLETED'].map(value => ({ value, label: displayPresentation(HARVEST_STATUS_PRESENTATION, value).label }))} onChange={status => setFilters({ ...filters, status })} />
      <Select aria-label="Loại nấm" allowClear placeholder="Loại nấm" style={{ width: 190 }} loading={mushrooms.isLoading} options={mushrooms.data?.map(m => ({ value: m.mushroom_type_id, label: m.name }))} onChange={mushroomTypeId => setFilters({ ...filters, mushroomTypeId })} />
      <InputNumber aria-label="Mã đơn hàng" min={1} precision={0} placeholder="Mã đơn" onChange={value => setFilters({ ...filters, orderId: value == null ? undefined : Number(value) })} />
      <DatePicker.RangePicker aria-label="Khoảng ngày thu hoạch" onChange={dates => setFilters({ ...filters, fromDate: dates?.[0]?.format('YYYY-MM-DD'), toDate: dates?.[1]?.format('YYYY-MM-DD') })} />
    </Flex>
    {mushrooms.isError && <QueryFeedback query={mushrooms} />}
    <QueryFeedback query={query} />
    {!query.isError && <><Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={8}><StatCard loading={query.isLoading} title="Tổng sản lượng thu hoạch (kg)" value={metrics?.totalWeightKg == null ? '—' : metrics.totalWeightKg.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></Col>
      <Col xs={24} md={8}><StatCard loading={query.isLoading} title="Tỷ lệ thương phẩm A/B (%)" value={metrics?.gradeABPercent == null ? '—' : metrics.gradeABPercent.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></Col>
      <Col xs={24} md={8}><StatCard loading={query.isLoading} title="Đợt thu hoạch đang chờ giao" value={metrics?.pendingHandover ?? '—'} /></Col>
    </Row>
    <DataTable<Harvest> size="small" rowKey="harvest_id" dataSource={rows} loading={query.isLoading} scrollX={1050} pagination={{ hideOnSinglePage: false, pageSize: 20, showSizeChanger: true }} locale={{ emptyText: 'Chưa có đợt thu hoạch phù hợp' }} expandable={{ expandedRowRender: h => <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
        { key: 'method', label: 'Hình thức nhận', children: <><StatusBadge {...displayPresentation(HARVEST_METHOD_PRESENTATION, h.harvest_method, 'Chưa chọn')} /><Typography.Paragraph>{h.harvest_method === 'PICKUP' ? auditDate(h.scheduled_at) : h.customer_note ?? '—'}</Typography.Paragraph></> },
        { key: 'rejected', label: 'Loại bỏ (kg)', children: auditWeight(h.rejected_weight_kg) },
        { key: 'grade', label: 'Phẩm cấp', children: h.quality_grade ?? '—' },
        { key: 'confirmed', label: 'Người xác nhận (ID)', children: h.confirmed_by ?? '—' },
        { key: 'completed', label: 'Hoàn tất bàn giao', children: auditDate(h.completed_at) },
      ]} /> }} columns={[
      { title: 'Đợt / Phiên', render: (_, h) => <code>#{h.harvest_id} / #{h.session_id}</code> },
      { title: 'Khách hàng / Đơn', render: (_, h) => <>{h.customer_name}<br /><code>{h.order_code}</code></> },
      { title: 'Loại nấm', dataIndex: 'mushroom_type' },
      { title: 'Tổng (kg)', dataIndex: 'total_weight_kg', render: auditWeight },
      { title: 'Thương phẩm (kg)', dataIndex: 'usable_weight_kg', render: auditWeight },
      { title: 'Thu hoạch / Bàn giao', render: (_, h) => <><StatusBadge {...displayPresentation(HARVEST_STATUS_PRESENTATION, h.status)} /><StatusBadge tone="neutral" label={h.harvest_request_status ?? 'Chưa có yêu cầu'} /></> },
      { title: 'Thao tác', key: 'actions', fixed: 'right', width: 110, render: (_, h) => <Button onClick={() => setSelected(h.harvest_id)}>Đối soát</Button> },
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
