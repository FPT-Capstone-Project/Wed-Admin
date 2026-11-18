import { App, Button, Input, Popconfirm, Space, Tooltip } from 'antd'
import { Delete, Pencil } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '../../../shared/utils/date'
import { useState } from 'react'
import { useInventory, useInventoryMutation } from '../../../features/inventory/hooks/useInventory'
import type { Inventory } from '../../../features/inventory/types/inventory.types'
import { formatQuantity, isEmptyStock, stockLevel } from '../../../features/inventory/utils/inventory.utils'
import { DataTable, StatusBadge } from '../../../shared/ui'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { showApiError } from '../../../shared/api/error-mapper'

export function InventoryStockTab({ mushroomTypeId, onEdit }: { mushroomTypeId?: number; onEdit: (item: Inventory) => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useInventory({ page, limit: 20, mushroomTypeId, search: search || undefined })
  const mutation = useInventoryMutation()
  const { message } = App.useApp()
  async function remove(item: Inventory) {
    try {
      await mutation.mutateAsync({ kind: 'delete', id: item.inventory_id })
      void message.success('Đã xóa kho phôi.')
      if (query.data?.data.length === 1 && page > 1) setPage(page - 1)
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      showApiError(status === 409 ? { cause: error, friendlyMessage: 'Không thể xoá kho phôi đã có lịch sử hoặc còn tồn kho. Chỉ xoá được kho rỗng và chưa có lịch sử.' } : error, 'xóa kho phôi', text => { void message.error(text) })
    }
  }
  const columns: ColumnsType<Inventory> = [
    { title: 'Giống nấm', key: 'name', render: (_, row) => <><strong>{row.mushroom_name}</strong><div>Mã giống #{row.mushroom_type_id}</div></> },
    { title: 'Tồn kho phôi', dataIndex: 'quantity', align: 'right', render: value => <strong>{formatQuantity(value)}</strong> },
    { title: 'Mức tồn', key: 'level', render: (_, row) => <StatusBadge {...stockLevel(row.quantity)} /> },
    { title: 'Cập nhật lần cuối', dataIndex: 'updated_at', render: value => formatDate(value, 'ddd HH:mm DD/MM/YYYY') },
    { title: 'Hành động', key: 'actions', render: (_, row) => <Space>
      <Tooltip title="Điều chỉnh tồn kho"><Button type="text" aria-label={`Sửa kho ${row.mushroom_name}`} icon={<Pencil size={16} />} onClick={() => onEdit(row)} /></Tooltip>
      <Tooltip title="Chỉ xoá được kho rỗng và chưa có lịch sử"><span><Popconfirm title="Xóa kho phôi?" description="Chỉ xoá được kho rỗng và chưa có lịch sử." okText="Xóa" cancelText="Hủy" onConfirm={() => remove(row)} disabled={!isEmptyStock(row.quantity) || mutation.isPending}><Button danger type="text" aria-label={`Xóa kho ${row.mushroom_name}`} disabled={!isEmptyStock(row.quantity) || mutation.isPending} icon={<Delete size={16} />} /></Popconfirm></span></Tooltip>
    </Space> },
  ]
  return <>
    <Input.Search aria-label="Tìm theo tên giống nấm" placeholder="Tìm theo tên giống nấm" allowClear onSearch={value => { setSearch(value.trim()); setPage(1) }} style={{ maxWidth: 360, marginBottom: 16 }} />
    {query.isError ? <LoadErrorAlert error={query.error} resource="tồn kho phôi" onRetry={query.refetch} /> : <DataTable columns={columns} dataSource={query.data?.data} rowKey="inventory_id" loading={query.isLoading} isFetching={query.isFetching} scrollX={null} emptyTitle="Chưa có tồn kho phôi" emptyDescription="Nhập kho phôi hoặc thay đổi bộ lọc để xem dữ liệu." pagination={{ current: page, pageSize: 20, total: query.data?.pagination.total ?? 0, showSizeChanger: false, onChange: setPage }} />}
  </>
}
