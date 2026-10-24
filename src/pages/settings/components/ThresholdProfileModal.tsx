import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Modal, Space } from 'antd'
import type { ThresholdProfileInput } from '../../../types/setting.types'

interface ThresholdProfileModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (values: ThresholdProfileInput) => Promise<void>
  initialValues?: Partial<ThresholdProfileInput>
}

export function ThresholdProfileModal({
  open,
  onCancel,
  onSubmit,
  initialValues,
}: ThresholdProfileModalProps) {
  const [form] = Form.useForm<ThresholdProfileInput>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    form.resetFields()
    form.setFieldsValue({
      cycleWeeks: 1,
      tempMin: 20,
      tempMax: 28,
      humidityMin: 75,
      humidityMax: 95,
      co2Min: null,
      co2Max: null,
      soilMoistureMin: null,
      soilMoistureMax: null,
      ...initialValues,
    })
  }, [form, initialValues, open])

  const handleFinish = async (values: ThresholdProfileInput) => {
    const rangeErrors: Array<{
      name: keyof ThresholdProfileInput
      errors: string[]
    }> = []

    if (values.tempMin >= values.tempMax) {
      rangeErrors.push({
        name: 'tempMin',
        errors: ['Nhiệt độ Min phải nhỏ hơn Max.'],
      })
    }

    if (values.humidityMin >= values.humidityMax) {
      rangeErrors.push({
        name: 'humidityMin',
        errors: ['Độ ẩm Min phải nhỏ hơn Max.'],
      })
    }

    // CO₂ và ẩm giá thể là optional → chỉ validate khi cả hai đều có giá trị.
    if (
      values.co2Min != null &&
      values.co2Max != null &&
      values.co2Min >= values.co2Max
    ) {
      rangeErrors.push({
        name: 'co2Min',
        errors: ['CO₂ Min phải nhỏ hơn Max.'],
      })
    }

    if (
      values.soilMoistureMin != null &&
      values.soilMoistureMax != null &&
      values.soilMoistureMin >= values.soilMoistureMax
    ) {
      rangeErrors.push({
        name: 'soilMoistureMin',
        errors: ['Ẩm giá thể Min phải nhỏ hơn Max.'],
      })
    }

    if (rangeErrors.length > 0) {
      form.setFields(rangeErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(values)
      form.resetFields()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={initialValues ? 'Cập nhật hồ sơ vi khí hậu' : 'Thêm giống nấm'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu hồ sơ"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      destroyOnHidden
      afterClose={() => form.resetFields()}
    >
      <Form<ThresholdProfileInput>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Loại nấm"
          name="mushroomType"
          rules={[
            { required: true, message: 'Vui lòng nhập loại nấm.' },
            { whitespace: true, message: 'Loại nấm không được để trống.' },
          ]}
        >
          <Input placeholder="Nấm Bào Ngư" maxLength={100} />
        </Form.Item>

        <Form.Item
          label="Tên hồ sơ"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên hồ sơ.' },
            { whitespace: true, message: 'Tên hồ sơ không được để trống.' },
          ]}
        >
          <Input placeholder="Bào Ngư vụ mùa khô" maxLength={120} />
        </Form.Item>

        <Form.Item
          label="Chu kỳ gói (tuần)"
          name="cycleWeeks"
          tooltip="Số tuần của gói nuôi trồng — đồng bộ với Pricing Model"
          rules={[{ required: true, message: 'Vui lòng nhập chu kỳ.' }]}
        >
          <InputNumber
            min={1}
            max={12}
            style={{ width: '100%' }}
            addonAfter="tuần"
          />
        </Form.Item>

        <Space.Compact block>
          <Form.Item
            label="Nhiệt độ Min (°C)"
            name="tempMin"
            rules={[{ required: true, message: 'Nhập nhiệt độ Min.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber style={{ width: '100%' }} precision={1} />
          </Form.Item>
          <Form.Item
            label="Nhiệt độ Max (°C)"
            name="tempMax"
            rules={[{ required: true, message: 'Nhập nhiệt độ Max.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber style={{ width: '100%' }} precision={1} />
          </Form.Item>
        </Space.Compact>

        <Space.Compact block>
          <Form.Item
            label="Độ ẩm Min (%)"
            name="humidityMin"
            rules={[{ required: true, message: 'Nhập độ ẩm Min.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Độ ẩm Max (%)"
            name="humidityMax"
            rules={[{ required: true, message: 'Nhập độ ẩm Max.' }]}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Space.Compact>

        <Space.Compact block>
          <Form.Item
            label="CO₂ Min (ppm)"
            name="co2Min"
            tooltip="Bỏ trống nếu không đặt ngưỡng CO₂"
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={5000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="CO₂ Max (ppm)"
            name="co2Max"
            tooltip="Bỏ trống nếu không đặt ngưỡng CO₂"
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={5000} style={{ width: '100%' }} />
          </Form.Item>
        </Space.Compact>

        <Space.Compact block>
          <Form.Item
            label="Ẩm giá thể Min (%)"
            name="soilMoistureMin"
            tooltip="Bỏ trống nếu không đặt ngưỡng ẩm giá thể"
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Ẩm giá thể Max (%)"
            name="soilMoistureMax"
            tooltip="Bỏ trống nếu không đặt ngưỡng ẩm giá thể"
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Space.Compact>
      </Form>
    </Modal>
  )
}
