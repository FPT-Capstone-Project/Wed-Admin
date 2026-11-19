import { useEffect } from 'react'
import { App, Form, Input, InputNumber, Modal, Select } from 'antd'
import { useMushroomTypes } from '../../../features/packages/hooks/useMushroomTypes'
import { useInventoryMutation } from '../../../features/inventory/hooks/useInventory'
import type { Inventory } from '../../../features/inventory/types/inventory.types'
import { formatQuantity } from '../../../features/inventory/utils/inventory.utils'
import { showApiError } from '../../../shared/api/error-mapper'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'

interface Values { mushroomTypeId: number; quantity: number; notes?: string }
export function InventoryFormModal({ open, item, onClose }: { open: boolean; item: Inventory | null; onClose: () => void }) {
  const [form] = Form.useForm<Values>()
  const { message } = App.useApp()
  const types = useMushroomTypes({ status: 'ACTIVE' }, { enabled: open && !item })
  const mutation = useInventoryMutation()
  useEffect(() => {
    if (open) {
      form.resetFields()
      // Ô "Số lượng mới" cố ý để TRỐNG khi điều chỉnh: điều chỉnh là ghi đè
      // số tồn, không phải cộng thêm. Điền sẵn số tồn hiện tại khiến admin
      // dễ "lưu nhầm" mà không thay đổi gì — nên chỉ hiển thị tồn hiện tại
      // dưới dạng text phụ tham khảo bên dưới ô nhập.
    }
  }, [open, item, form])
  async function submit(values: Values) {
    try {
      const notes = values.notes?.trim()
      if (item) await mutation.mutateAsync({ kind: 'adjust', id: item.inventory_id, payload: { quantity: values.quantity, notes: notes ?? '' } })
      else await mutation.mutateAsync({ kind: 'create', payload: { mushroomTypeId: values.mushroomTypeId, quantity: values.quantity, notes } })
      void message.success(item ? 'Đã điều chỉnh tồn kho phôi.' : 'Đã nhập kho phôi.')
      onClose()
    } catch (error) { showApiError(error, item ? 'điều chỉnh tồn kho phôi' : 'nhập kho phôi', text => { void message.error(text) }) }
  }
  return <Modal title={item ? `Điều chỉnh tồn kho: ${item.mushroom_name}` : 'Nhập kho phôi'} open={open} onCancel={onClose} onOk={() => form.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={mutation.isPending} closable={!mutation.isPending} cancelButtonProps={{ disabled: mutation.isPending }} mask={{ closable: !mutation.isPending }}>
    {!item && types.isError && <LoadErrorAlert error={types.error} resource="giống nấm" onRetry={types.refetch} />}
    <Form form={form} layout="vertical" onFinish={submit} disabled={mutation.isPending}>
      {!item && <Form.Item name="mushroomTypeId" label="Giống nấm" rules={[{ required: true, message: 'Vui lòng chọn giống nấm.' }]}><Select loading={types.isLoading} showSearch optionFilterProp="label" options={types.data?.map(type => ({ value: type.mushroom_type_id, label: type.name }))} /></Form.Item>}
      <Form.Item name="quantity" label={item ? 'Số lượng mới' : 'Số lượng'} extra={item ? `Tồn hiện tại: ${formatQuantity(item.quantity)} đơn vị` : undefined} rules={[{ required: true, message: 'Vui lòng nhập số lượng.' }, { validator: (_, value: unknown) => typeof value === 'number' && Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER && (item ? value >= 0 : value > 0) ? Promise.resolve() : Promise.reject(new Error(item ? 'Số lượng mới phải từ 0 trở lên.' : 'Số lượng nhập phải lớn hơn 0.')) }]}><InputNumber min={0} style={{ width: '100%' }} placeholder={item ? 'Nhập số lượng mới' : 'Nhập số lượng'} /></Form.Item>
      <Form.Item name="notes" label="Ghi chú" rules={item ? [{ required: true, whitespace: true, message: 'Vui lòng nhập lý do điều chỉnh.' }] : []}><Input.TextArea rows={3} /></Form.Item>
    </Form>
  </Modal>
}
