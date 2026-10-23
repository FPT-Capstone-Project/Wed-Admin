import { App, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useRecordRentalHarvest } from '../hooks/useRentals'

interface RecordHarvestModalProps {
  rentalId: number
  open: boolean
  onClose: () => void
}

interface HarvestFormValues {
  quantity: number
  unit: string
  qualityGrade?: string
  notes?: string
  harvestDate?: Dayjs
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'tấn', label: 'tấn' },
]

const QUALITY_OPTIONS = [
  { value: 'A', label: 'A — Xuất sắc' },
  { value: 'B', label: 'B — Tốt' },
  { value: 'C', label: 'C — Trung bình' },
]

/**
 * Ghi nhận thu hoạch.
 * ⚠ BE chỉ nhận khi giai đoạn hiện tại là `HARVEST` — nếu giai đoạn chưa tới,
 * server sẽ trả 409. Nút ghi nhận thu hoạch ở drawer cần kiểm tra điều này.
 */
export function RecordHarvestModal({
  rentalId,
  open,
  onClose,
}: RecordHarvestModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<HarvestFormValues>()
  const recordHarvest = useRecordRentalHarvest({
    onSuccess: () => {
      message.success('Đã ghi nhận lần thu hoạch.')
      form.resetFields()
      onClose()
    },
    onError: (error) => {
      message.error(error.message || 'Không thể ghi nhận thu hoạch.')
    },
  })

  const handleOk = async () => {
    const values = await form.validateFields()
    const { harvestDate, ...rest } = values

    await recordHarvest.mutateAsync({
      rentalId,
      payload: {
        ...rest,
        harvestDate: harvestDate
          ? dayjs(harvestDate).format('YYYY-MM-DD')
          : undefined,
      },
    })
  }

  return (
    <Modal
      title="Ghi nhận thu hoạch"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void handleOk()}
      okText="Lưu thu hoạch"
      cancelText="Huỷ"
      confirmLoading={recordHarvest.isPending}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ unit: 'kg', harvestDate: dayjs() }}
      >
        <Form.Item
          name="quantity"
          label="Khối lượng thu hoạch"
          rules={[
            { required: true, message: 'Vui lòng nhập khối lượng' },
            {
              type: 'number',
              min: 0.01,
              message: 'Khối lượng phải lớn hơn 0',
            },
          ]}
        >
          <InputNumber
            min={0.01}
            step={0.1}
            style={{ width: '100%' }}
            placeholder="VD: 1.5"
          />
        </Form.Item>

        <Form.Item
          name="unit"
          label="Đơn vị"
          rules={[
            { required: true, message: 'Vui lòng chọn đơn vị' },
            { max: 20, message: 'Đơn vị tối đa 20 ký tự' },
          ]}
        >
          <Select options={UNIT_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="qualityGrade"
          label="Phân hạng chất lượng"
          rules={[{ max: 20, message: 'Phân hạng tối đa 20 ký tự' }]}
        >
          <Select
            allowClear
            placeholder="Không phân hạng"
            options={QUALITY_OPTIONS}
          />
        </Form.Item>

        <Form.Item
          name="harvestDate"
          label="Ngày thu hoạch"
          extra="Bỏ trống để hệ thống dùng ngày hiện tại."
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(date) => date.isAfter(dayjs(), 'day')}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Ghi chú"
          rules={[{ max: 1000, message: 'Ghi chú tối đa 1000 ký tự' }]}
        >
          <Input.TextArea
            rows={3}
            maxLength={1000}
            showCount
            placeholder="VD: Lần thu hoạch đầu tiên, nấm đồng đều."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}