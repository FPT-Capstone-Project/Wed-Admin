import { Alert, App, Form, Modal, Select } from 'antd'
import { useStartCultivationSession } from '../hooks/useRentals'
import { useAvailableTrays } from '../../rooms/hooks/useCultivation'

interface StartSessionModalProps {
  rentalId: number
  open: boolean
  onClose: () => void
}

interface StartSessionFormValues {
  trayId: number
}

/**
 * Bắt đầu canh tác — chọn khay AVAILABLE.
 * BE sẽ tự suy ra loại nấm từ rental order, tạo session + progress
 * PREPARATION, đánh dấu khay thành OCCUPIED.
 */
export function StartSessionModal({
  rentalId,
  open,
  onClose,
}: StartSessionModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<StartSessionFormValues>()
  const { data: availableTrays = [], isLoading: isLoadingTrays } = useAvailableTrays()
  const startSession = useStartCultivationSession({
    onSuccess: () => {
      message.success('Đã khởi tạo phiên canh tác và gán khay.')
      form.resetFields()
      onClose()
    },
    onError: (error) => {
      message.error(error.message || 'Không thể khởi tạo phiên canh tác.')
    },
  })

  const handleOk = async () => {
    const values = await form.validateFields()
    await startSession.mutateAsync({ rentalId, payload: values })
  }

  return (
    <Modal
      title="Bắt đầu vụ canh tác"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void handleOk()}
      okText="Bắt đầu"
      cancelText="Huỷ"
      confirmLoading={startSession.isPending}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Hệ thống sẽ tự tạo phiên canh tác ACTIVE, ghi nhận tiến độ 'Chuẩn bị' và đánh dấu khay thành đang sử dụng."
      />

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="trayId"
          label="Chọn khay trống"
          rules={[{ required: true, message: 'Vui lòng chọn khay canh tác' }]}
        >
          <Select
            loading={isLoadingTrays}
            placeholder="Chọn khay đang trống"
            optionFilterProp="label"
            notFoundContent={
              isLoadingTrays ? 'Đang tải danh sách khay...' : 'Không còn khay trống'
            }
            options={availableTrays.map((tray) => ({
              value: tray.tray_id,
              label: `${tray.tray_code}${tray.tray_name ? ` · ${tray.tray_name}` : ''}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}