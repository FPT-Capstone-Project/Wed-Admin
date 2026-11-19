import { useState } from 'react'
import { formatDate } from '../../../shared/utils/date'
import type { ColumnsType } from 'antd/es/table'
import { useInventoryExports } from '../../../features/inventory/hooks/useInventory'
import type { ExportQuery, ExportTransaction } from '../../../features/inventory/types/inventory.types'
import { formatQuantity } from '../../../features/inventory/utils/inventory.utils'
import { DataTable } from '../../../shared/ui'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { InventoryMushroomCell } from './InventoryMushroomCell'

export function InventoryExportsTab({ filters, mushroomImages }: { filters: Pick<ExportQuery, 'mushroomTypeId' | 'fromDate' | 'toDate'>; mushroomImages: ReadonlyMap<number, string | null> }) {
  const [page, setPage] = useState(1)
  const query = useInventoryExports({ ...filters, page, limit: 20 })
  const columns: ColumnsType<ExportTransaction> = [
    { title: 'Mã giao dịch', dataIndex: 'transaction_id', render: value => `#${value}` },
    { title: 'Giống nấm', key: 'name', render: (_, row) => <InventoryMushroomCell id={row.mushroom_type_id} name={row.mushroom_name} imageUrl={mushroomImages.get(row.mushroom_type_id)} sessionId={row.session_id} /> },
    { title: 'Số lượng xuất', dataIndex: 'quantity', align: 'right', render: formatQuantity },
    { title: 'Tồn trước → sau', key: 'balance', render: (_, row) => `${formatQuantity(row.quantity_before)} → ${formatQuantity(row.quantity_after)}` },
    { title: 'Ghi chú', dataIndex: 'notes', render: value => value?.trim() || '—' },
    { title: 'Thời điểm xuất', dataIndex: 'created_at', render: value => formatDate(value, 'ddd HH:mm DD/MM/YYYY') },
  ]
  return query.isError ? <LoadErrorAlert error={query.error} resource="lịch sử xuất kho" onRetry={query.refetch} /> : <DataTable columns={columns} dataSource={query.data?.data} rowKey="transaction_id" loading={query.isLoading} isFetching={query.isFetching} scrollX={null} emptyTitle="Chưa có giao dịch xuất kho" emptyDescription="Không có giao dịch phù hợp bộ lọc hiện tại." pagination={{ current: page, pageSize: 20, total: query.data?.pagination.total ?? 0, showSizeChanger: false, onChange: setPage }} />
}
