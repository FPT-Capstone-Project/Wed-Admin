import { DataTable } from '../../../shared/ui/DataTable'
import {
  HARVEST_METHOD_DICTIONARY,
  HARVEST_QUALITY_DICTIONARY,
  HARVEST_REQUEST_STATUS_DICTIONARY,
  HARVEST_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/harvest'
import {
  SESSION_HARVEST_STATUS_DICTIONARY,
  SESSION_STATUS_DICTIONARY,
} from '../../../shared/i18n/status/session'
import { presentStatus, selectOptions, statusLabel } from '../../../shared/i18n/status/registry'
import { calculateHarvestMetrics } from '../api/harvest-metrics'
import { Suspense, useMemo, useState } from 'react'
import { Button, Descriptions, Col, DatePicker, Flex, InputNumber, Row, Select, Tooltip, Typography } from 'antd'
import { PageHeader, StatusBadge, StatCard } from '../../../shared/ui'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate, auditWeight } from '../../../shared/ui/audit-format'
import { useMushroomTypes } from '../../packages/hooks/useMushroomTypes'
import { useHarvests } from '../api/harvest.queries'
import type { Harvest, HarvestQuery } from '../api/harvest.api'
import { HarvestDetailDrawer } from '../../../app/router/lazy-modals'
import {
  resolveStaffName,
  useHarvestStaffNames,
} from '../hooks/useHarvestStaffNames'

/**
 * ⚠ Thứ tự bộ lọc phải khớp với vòng đời vụ thu hoạch
 *   (`PLANNED` → `IN_PROGRESS` → `COMPLETED`).
 */
const HARVEST_STATUS_FILTER_VALUES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'] as const

export function HarvestManagementPage() {
  const [filters, setFilters] = useState<HarvestQuery>({})
  const [selected, setSelected] = useState<number | null>(null)
  const query = useHarvests(filters)
  const mushrooms = useMushroomTypes()
  const rows = query.data?.data
  const metrics = rows ? calculateHarvestMetrics(rows) : null

  /**
   * ⚠ BE chỉ trả ID cho `confirmed_by` / `harvested_by` ⇒ tra cứu tên
   *   nhân viên qua `GET /api/users` (chỉ Admin mới gọi được).
   */
  const staffIds = useMemo(
    () =>
      (rows ?? []).flatMap((h) => [h.confirmed_by, h.harvested_by]),
    [rows],
  )
  const staffNames = useHarvestStaffNames(staffIds)
  const staffName = (id: number | null | undefined, inlineName?: string | null) =>
    inlineName?.trim() || resolveStaffName(staffNames, id)

  return <div style={{ fontVariantNumeric: 'tabular-nums' }}><PageHeader title="Quản lý Thu hoạch" description="Đối soát sản lượng và bàn giao · Chỉ xem. KPI theo bộ lọc; tỷ lệ A/B tính từ khối lượng thương phẩm của các đợt có phẩm cấp A/B." />
    <Flex gap={12} wrap style={{ marginBottom: 16 }}>
      <Select aria-label="Trạng thái thu hoạch" allowClear placeholder="Trạng thái" style={{ width: 180 }} options={selectOptions(HARVEST_STATUS_DICTIONARY, HARVEST_STATUS_FILTER_VALUES)} onChange={status => setFilters({ ...filters, status })} />
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
    <DataTable<Harvest> size="small" rowKey="harvest_id" dataSource={rows} loading={query.isLoading} isFetching={query.isFetching} scrollX={1050} pagination={{ hideOnSinglePage: false, pageSize: 20, showSizeChanger: true }} emptyTitle="Chưa có đợt thu hoạch phù hợp" emptyDescription="Thử thay đổi bộ lọc để xem các đợt thu hoạch khác." expandable={{ expandedRowRender: h => <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
        { key: 'session', label: 'Trạng thái phiên', children: <StatusBadge {...presentStatus(SESSION_STATUS_DICTIONARY, h.cultivation_status)} title="Trạng thái phiên canh tác" /> },
        { key: 'readiness', label: 'Độ sẵn sàng thu hoạch', children: <StatusBadge {...presentStatus(SESSION_HARVEST_STATUS_DICTIONARY, h.harvest_status)} title="Trạng thái sẵn sàng thu hoạch của phiên" /> },
        { key: 'method', label: 'Hình thức nhận', children: <><StatusBadge {...presentStatus(HARVEST_METHOD_DICTIONARY, h.harvest_method, 'Chưa chọn')} /><Typography.Paragraph>{h.harvest_method === 'PICKUP' ? auditDate(h.scheduled_at) : h.customer_note ?? '—'}</Typography.Paragraph></> },
        { key: 'grade', label: 'Phẩm cấp', children: statusLabel(HARVEST_QUALITY_DICTIONARY, h.quality_grade, 'Chưa ghi nhận') },
        { key: 'rejected', label: 'Loại bỏ (kg)', children: auditWeight(h.rejected_weight_kg) },
        { key: 'confirmed', label: 'Người xác nhận', children: h.confirmed_by == null && !h.confirmed_by_name ? '—' : staffName(h.confirmed_by, h.confirmed_by_name) },
        { key: 'harvested', label: 'Người thu hoạch', children: h.harvested_by == null && !h.harvested_by_name ? '—' : staffName(h.harvested_by, h.harvested_by_name) },
        { key: 'completed', label: 'Hoàn tất bàn giao', children: auditDate(h.completed_at) },
      ]} /> }} columns={[
      { title: 'Đợt / Phiên', width: 230, render: (_, h) => <Tooltip title={`Đợt thu hoạch #${h.harvest_id} thuộc phiên canh tác #${h.session_id}`}><Typography.Text code tabIndex={0}>{`Đợt #${h.harvest_id} · Phiên #${h.session_id}`}</Typography.Text></Tooltip> },
      { title: 'Khách hàng / Đơn', width: 220, render: (_, h) => <Flex vertical style={{ width: 188, maxWidth: '100%', minWidth: 0 }}><Typography.Text ellipsis={{ tooltip: true }} style={{ width: '100%' }}>{h.customer_name ?? '—'}</Typography.Text><code>{h.order_code}</code></Flex> },
      { title: 'Loại nấm', dataIndex: 'mushroom_type' },
      { title: 'Tổng (kg)', dataIndex: 'total_weight_kg', render: auditWeight },
      { title: 'Thương phẩm (kg)', dataIndex: 'usable_weight_kg', render: auditWeight },
      {
        title: 'Thu hoạch / Bàn giao',
        render: (_, h) => (
          <Flex vertical gap={4}>
            <StatusBadge
              {...presentStatus(HARVEST_STATUS_DICTIONARY, h.status)}
              title="Trạng thái vụ thu hoạch"
            />
            <StatusBadge
              {...presentStatus(HARVEST_REQUEST_STATUS_DICTIONARY, h.harvest_request_status, 'Chưa có yêu cầu')}
              title="Trạng thái bàn giao (yêu cầu thu hoạch)"
            />
          </Flex>
        ),
      },
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
