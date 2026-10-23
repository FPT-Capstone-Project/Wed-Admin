import { Alert, App, Form, InputNumber, Modal, Switch } from 'antd'
import { useEffect } from 'react'
import { useUpdateRental } from '../hooks/useRentals'
import type { Rental } from '../types/rental.types'

interface ApproveRentalModalProps {
  rental: Rental
  open: boolean
  onClose: () => void
}

interface ApproveFormValues {
  durationDays?: number
  startDate?: string | null
  /** Chỉ đổi trạng thái sang PREPARING, không sửa gì khác. */
  advanceStatus: boolean
}

/**
 * Duyệt vụ thuê — `PATCH /api/rentals/admin/{rentalId}`.
 *
 * ⚠ BE chỉ hỗ trợ **một** chuyển trạng thái duy nhất: `CONFIRMED → PREPARING`.
 * Nếu không đổi status thì endpoint chỉ dùng để chỉnh khay / thời hạn.
 *
 * Modal này chỉ mở được khi rental đang `CONFIRMED` — xem guard ở
 * `RentalDetailDrawer`.
 */
export function ApproveRentalModal({
  rental,
  open,
  onClose,
}: ApproveRentalModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<ApproveFormValues>()

  const updateRental = useUpdateRental({
    onSuccess: () => {
      message.success('Đã duyệt vụ thuê.')
      onClose()
    },
    onError: (error) => {
      message.error(error.message || 'Không thể duyệt vụ thuê.')
    },
  })

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      durationDays: rental.duration_days,
      advanceStatus: true,
    })
  }, [open, rental.duration_days, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    const { advanceStatus, ...rest } = values

    const payload: Parameters<typeof updateRental.mutate>[0]['payload'] =
      advanceStatus
        ? { ...rest, status: 'PREPARING' }
        : // Không đổi trạng thái → gửi mình thông tin muốn sửa (nếu có).
          (rest.durationDays ? { durationDays: rest.durationDays } : { status: 'PREPARING' })

    await updateRental.mutateAsync({ rentalId: rental.rental_id, payload })
  }

  return (
    <Modal
      title="Duyệt vụ thuê"
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText="Duyệt"
      cancelText="Huỷ"
      confirmLoading={updateRental.isPending}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Vụ thuê #${rental.rental_id} · ${rental.package_name}`}
        description="Duyệt sẽ chuyển trạng thái từ 'Chờ duyệt' sang 'Đang chuẩn bị'. Sau đó bạn có thể bắt đầu canh tác bằng nút 'Bắt đầu vụ'."
      />

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="advanceStatus"
          label="Chuyển sang trạng thái 'Đang chuẩn bị'"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="durationDays"
          label="Thời hạn thuê (ngày)"
          extra="Để nguyên số ngày của gói nếu không muốn thay đổi."
          rules={[
            {
              type: 'number',
              min: 1,
              message: 'Thời hạn phải từ 1 ngày trở lên',
            },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}