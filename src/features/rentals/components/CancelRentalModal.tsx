import { Alert, App, Form, Input, Modal } from 'antd'
import { useCancelRental } from '../hooks/useRentals'

interface CancelRentalModalProps {
  rentalId: number
  open: boolean
  onClose: () => void
}

interface CancelFormValues {
  reason: string
}

/**
 * Huỷ vụ thuê.
 *
 * ⚠ CHỈ Admin (role_id 1) được gọi — Farm Operator nhận 403 từ BE.
 * Component này chỉ được render khi `useAuthStore` cho role ADMIN,
 * xem guard trong `RentalDetailDrawer`.
 *
 * Lưu ý nghiệp vụ: huỷ ở đây sẽ đánh dấu đơn đã thanh toán để hoàn tiền
 * thủ công — đây là thao tác nhạy cảm, nên yêu cầu nhập lý do rõ ràng.
 */
export function CancelRentalModal({
  rentalId,
  open,
  onClose,
}: CancelRentalModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<CancelFormValues>()
  const cancelRental = useCancelRental({
    onSuccess: () => {
      message.success('Đã huỷ vụ thuê. Đơn hàng được đánh dấu để hoàn tiền.')
      form.resetFields()
      onClose()
    },
    onError: (error) => {
      message.error(error.message || 'Không thể huỷ vụ thuê.')
    },
  })

  const handleOk = async () => {
    const values = await form.validateFields()
    await cancelRental.mutateAsync({ rentalId, payload: values })
  }

  return (
    <Modal
      title="Huỷ vụ thuê"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void handleOk()}
      okText="Xác nhận huỷ"
      cancelText="Giữ nguyên"
      okButtonProps={{ danger: true }}
      confirmLoading={cancelRental.isPending}
      destroyOnHidden
    >
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        message="Thao tác này không thể hoàn tác."
        description="Vụ thuê sẽ chuyển sang trạng thái Đã hủy và đơn hàng đã thanh toán sẽ được đánh dấu để hoàn tiền thủ công."
      />

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="reason"
          label="Lý do huỷ"
          rules={[
            { required: true, message: 'Vui lòng nhập lý do huỷ' },
            { min: 3, message: 'Lý do tối thiểu 3 ký tự' },
            { max: 500, message: 'Lý do tối đa 500 ký tự' },
          ]}
        >
          <Input.TextArea
            rows={4}
            maxLength={500}
            showCount
            placeholder="VD: Khay bị hỏng trong quá trình canh tác, cần bồi dường."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}