import { Alert, App, Form, Input, Modal } from 'antd'
import { useCompleteRental } from '../hooks/useRentals'

interface CompleteRentalModalProps {
  rentalId: number
  open: boolean
  onClose: () => void
}

interface CompleteFormValues {
  note?: string
}

/**
 * Hoàn thành vụ thuê.
 * ⚠ BE trả 409 nếu chưa ghi nhận thu hoạch nào — nút hoàn thành ở drawer
 * nên cảnh báo admin trước khi mở modal này.
 */
export function CompleteRentalModal({
  rentalId,
  open,
  onClose,
}: CompleteRentalModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<CompleteFormValues>()
  const completeRental = useCompleteRental({
    onSuccess: () => {
      message.success('Đã hoàn tất vụ thuê.')
      form.resetFields()
      onClose()
    },
    onError: (error) => {
      message.error(error.message || 'Không thể hoàn tất vụ thuê.')
    },
  })

  const handleOk = async () => {
    const values = await form.validateFields()
    await completeRental.mutateAsync({ rentalId, payload: values })
  }

  return (
    <Modal
      title="Hoàn thành vụ thuê"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void handleOk()}
      okText="Xác nhận hoàn thành"
      cancelText="Huỷ"
      confirmLoading={completeRental.isPending}
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Sau khi hoàn thành, khay sẽ được giải phóng và vụ thuê không thể tiếp tục ghi nhận thu hoạch."
      />

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="note"
          label="Ghi chú kết thúc"
          rules={[{ max: 1000, message: 'Ghi chú tối đa 1000 ký tự' }]}
        >
          <Input.TextArea
            rows={3}
            maxLength={1000}
            showCount
            placeholder="VD: Đã thu hoạch xong và bàn giao khay cho trại."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}