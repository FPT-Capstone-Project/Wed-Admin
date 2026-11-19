import { useMemo, useState } from 'react'
import { Button, Col, DatePicker, Flex, Row, Select, Tabs } from 'antd'
import { CircleAlert, Clock, Plus, TriangleAlert, Warehouse } from 'lucide-react'
import dayjs from 'dayjs'
import { PageHeader, StatCard } from '../../shared/ui'
import { LoadErrorAlert } from '../../shared/ui/LoadErrorAlert'
import { useMushroomTypes } from '../../features/packages/hooks/useMushroomTypes'
import { useInventorySummary } from '../../features/inventory/hooks/useInventorySummary'
import type { Inventory } from '../../features/inventory/types/inventory.types'
import { formatQuantity, INCOMPLETE_SUMMARY } from '../../features/inventory/utils/inventory.utils'
import { InventoryFormModal } from './components/InventoryFormModal'
import { InventoryStockTab } from './components/InventoryStockTab'
import { InventoryExportsTab } from './components/InventoryExportsTab'
import { InventoryMushroomThumbnail } from './components/InventoryMushroomCell'

export function SpawnInventoryPage() {
  const [tab, setTab] = useState('stock')
  const [mushroomTypeId, setMushroomTypeId] = useState<number>()
  const [from, setFrom] = useState<string>()
  const [to, setTo] = useState<string>()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Inventory | null>(null)
  const types = useMushroomTypes()
  const mushroomImages = useMemo(() => new Map(types.data?.map(type => [type.mushroom_type_id, type.image_url ?? null])), [types.data])
  // Ngày lịch Việt Nam được chuyển thành ISO UTC bao gồm hết ngày kết thúc.
  const filters = { mushroomTypeId, fromDate: from ? `${from}T00:00:00.000+07:00` : undefined, toDate: to ? `${to}T23:59:59.999+07:00` : undefined }
  const summary = useInventorySummary(filters)
  const stock = summary.stock.isSuccess ? summary.stock.data : undefined
  const issued = summary.exports.isSuccess ? summary.exports.data : undefined
  return <div>
    <PageHeader title="Kho phôi nấm" description="Theo dõi tồn kho phôi theo từng giống nấm, nhập kho mới và đối chiếu lịch sử xuất kho cho phiên canh tác." actions={<Button type="primary" icon={<Plus size={18} />} onClick={() => { setEditing(null); setModal(true) }}>Nhập kho phôi</Button>} />
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      <Col xs={24} sm={12} xl={6}><StatCard title="Tổng phôi đang tồn" value={stock ? formatQuantity(stock.quantity) : '—'} suffix="đơn vị" description={stock ? `${stock.varieties} giống nấm có trong kho (toàn kho)` : 'Toàn kho'} loading={summary.stock.isPending} hint={stock ? undefined : INCOMPLETE_SUMMARY} icon={<Warehouse size={20} />} /></Col>
      <Col xs={24} sm={12} xl={6}><StatCard title="Sắp hết phôi" value={stock?.low ?? '—'} suffix="giống nấm" description="Tồn trên 0 và không quá 20 đơn vị" tone="warning" loading={summary.stock.isPending} hint={stock ? undefined : INCOMPLETE_SUMMARY} icon={<TriangleAlert size={20} style={{ color: 'var(--mcms-tone-warning-solid)' }} />} /></Col>
      <Col xs={24} sm={12} xl={6}><StatCard title="Hết phôi" value={stock?.empty ?? '—'} suffix="giống nấm" description="Giống nấm đã cạn phôi trong kho" tone="danger" loading={summary.stock.isPending} hint={stock ? undefined : INCOMPLETE_SUMMARY} icon={<CircleAlert size={20} style={{ color: 'var(--mcms-tone-danger-solid)' }} />} /></Col>
      <Col xs={24} sm={12} xl={6}><StatCard title="Phôi đã xuất" value={issued !== undefined ? formatQuantity(issued) : '—'} suffix="đơn vị" description="Theo bộ lọc giống nấm và ngày đang chọn" loading={summary.exports.isPending} hint={issued === undefined ? INCOMPLETE_SUMMARY : undefined} icon={<Clock size={20} />} /></Col>
    </Row>
    {types.isError && <LoadErrorAlert error={types.error} resource="danh mục giống nấm" onRetry={types.refetch} />}
    <Flex gap={12} wrap style={{ marginBottom: 16 }}>
      <Select aria-label="Giống nấm" placeholder="Giống nấm" allowClear showSearch optionFilterProp="label" value={mushroomTypeId} onChange={setMushroomTypeId} loading={types.isLoading} style={{ minWidth: 240 }} options={types.data?.map(type => ({ value: type.mushroom_type_id, label: type.name }))} optionRender={option => <Flex align="center" gap={8}><InventoryMushroomThumbnail name={option.data.label} imageUrl={mushroomImages.get(option.data.value)} size={24} /><span>{option.data.label}</span></Flex>} />
      {tab === 'exports' && <><DatePicker aria-label="Từ ngày" placeholder="Từ ngày" format="DD/MM/YYYY" value={from ? dayjs(from) : null} disabledDate={date => !!to && date.format('YYYY-MM-DD') > to} onChange={date => setFrom(date?.format('YYYY-MM-DD'))} /><DatePicker aria-label="Đến ngày" placeholder="Đến ngày" format="DD/MM/YYYY" value={to ? dayjs(to) : null} disabledDate={date => !!from && date.format('YYYY-MM-DD') < from} onChange={date => setTo(date?.format('YYYY-MM-DD'))} /></>}
    </Flex>
    <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'stock', label: 'Tồn kho phôi', children: tab === 'stock' ? <InventoryStockTab key={mushroomTypeId ?? 'all'} mushroomTypeId={mushroomTypeId} mushroomImages={mushroomImages} onEdit={item => { setEditing(item); setModal(true) }} /> : null }, { key: 'exports', label: 'Lịch sử xuất kho', children: tab === 'exports' ? <InventoryExportsTab key={JSON.stringify(filters)} filters={filters} mushroomImages={mushroomImages} /> : null }]} />
    {modal && <InventoryFormModal open={modal} item={editing} onClose={() => setModal(false)} />}
  </div>
}
