import { Alert, App, Form, InputNumber, Modal } from 'antd'
import { useCreateRentalFromOrder } from '../hooks/useRentals'

interface CreateRentalFromOrderModalProps {
  orderId: string | number
  open: boolean
  onClose: () => void
}

interface CreateFromOrderFormValues {
  orderId: number
}

/**
 * Tạo vụ thuê thủ công từ một đơn đã thanh toán —
 * `POST /api/rentals/admin/from-order`.
 *
 * Dùng khi webhook thanh toán của PayOS không tạo được rental
 * (rất hiếm, nhưng cần đường khắc phục thủ công cho admin).
 *
 * ⚠ Endpoint là **idempotent**: nếu đơn đã có rental, BE trả `200` kèm
 * rental cũ chứ không tạo trùng. Nên bấm nhầm cũng không gây hỏng dữ liệu.
 */
export function CreateRentalFromOrderModal({
  orderId,
  open,
  onClose,
}: CreateRentalFromOrderModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<CreateFromOrderFormValues>()

  const createFromOrder = useCreateRentalFromOrder({
    onSuccess: () => {
      message.success('Đã tạo vụ thuê từ đơn hàng.')
      onClose()
    },
    onError: (error) => {
      message.error(error.message || 'Không thể tạo vụ thuê từ đơn hàng.')
    },
  })

  const handleOk = async () => {
    const values = await form.validateFields()
    await createFromOrder.mutateAsync(values)
  }

  return (
    <Modal
      title="Tạo vụ thuê từ đơn hàng"
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText="Tạo vụ thuê"
      cancelText="Huỷ"
      confirmLoading={createFromOrder.isPending}
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Chỉ dùng khi đơn đã thanh toán nhưng chưa có vụ thuê."
        description="Thao tác này dành cho trường hợp webhook thanh toán bị lỗi. Hệ thống sẽ tự kiểm tra và không tạo trùng."
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ orderId: toNumericOrderId(orderId) }}
      >
        <Form.Item
          name="orderId"
          label="Mã đơn hàng"
          extra="Đơn phải đã thanh toán và có gói thuê hợp lệ."
          rules={[
            { required: true, message: 'Vui lòng nhập mã đơn' },
            {
              type: 'number',
              min: 1,
              message: 'Mã đơn phải là số nguyên dương',
            },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

/** Order id trong UI là string (vd: 'ORD-001') nhưng BE cần number. */
function toNumericOrderId(orderId: string | number): number | undefined {
  if (typeof orderId === 'number') return orderId
  const parsed = Number(orderId)
  return Number.isFinite(parsed) ? parsed : undefined
}