import { App, Form, Input, Modal, Select, Slider } from 'antd'
import { useEffect } from 'react'
import { useRecordRentalProgress } from '../hooks/useRentals'
import { CULTIVATION_STAGE_CONFIG } from './rental-status.config'
import type { CultivationStage } from '../types/rental.types'

interface RecordProgressModalProps {
  rentalId: number
  open: boolean
  onClose: () => void
  /** Giai đoạn hiện tại để prefill — tránh bị lùi tiến độ (BE trả 409). */
  currentStage?: CultivationStage
  currentPercent?: number
}

interface ProgressFormValues {
  currentStage: CultivationStage
  progressPercent: number
  description?: string
}

const STAGE_OPTIONS = (
  Object.keys(CULTIVATION_STAGE_CONFIG) as CultivationStage[]
).map((stage) => ({
  value: stage,
  label: CULTIVATION_STAGE_CONFIG[stage].label,
}))

/**
 * Ghi nhận tiến độ canh tác.
 * BE trả 409 nếu tiến độ lùi về sau — UI chặn trước bằng `min` của Slider.
 */
export function RecordProgressModal({
  rentalId,
  open,
  onClose,
  currentStage,
  currentPercent,
}: RecordProgressModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<ProgressFormValues>()
  const recordProgress = useRecordRentalProgress({
    onSuccess: () => {
      message.success('Đã ghi nhận tiến độ canh tác.')
      form.resetFields()
      onClose()
    },
    onError: (error) => {
      message.error(error.message || 'Không thể ghi nhận tiến độ.')
    },
  })

  // Prefill theo tiến độ hiện có để admin không phải nhập lại từ đầu.
  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      currentStage: currentStage,
      progressPercent: currentPercent,
    })
  }, [open, currentStage, currentPercent, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    await recordProgress.mutateAsync({ rentalId, payload: values })
  }

  return (
    <Modal
      title="Ghi nhận tiến độ"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void handleOk()}
      okText="Lưu tiến độ"
      cancelText="Huỷ"
      confirmLoading={recordProgress.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="currentStage"
          label="Giai đoạn hiện tại"
          rules={[{ required: true, message: 'Vui lòng chọn giai đoạn' }]}
        >
          <Select placeholder="Chọn giai đoạn" options={STAGE_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="progressPercent"
          label="Tiến độ (%)"
          rules={[{ required: true, message: 'Vui lòng nhập tiến độ' }]}
        >
          <Slider
            min={currentPercent ?? 0}
            max={100}
            marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
            tooltip={{ formatter: (value) => `${value}%` }}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Ghi chú"
          rules={[{ max: 1000, message: 'Ghi chú tối đa 1000 ký tự' }]}
        >
          <Input.TextArea
            rows={3}
            maxLength={1000}
            showCount
            placeholder="VD: Rào nấm rơi đã xuất hiện, mọc đều hai bên."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}