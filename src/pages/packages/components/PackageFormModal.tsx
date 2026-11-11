import '../../../styles/catalog-industrial.css'
import { ActionButton } from '../../../shared/ui'
import { useEffect, useState } from 'react'
import {
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch } from 'antd'
import type {
  BillingCycle,
  CreatePackageInput,
  PackageStatus,
} from '../../../types/package.types'
import { PACKAGE_STATUS_DICTIONARY } from '../../../shared/i18n/status/package'
import { statusLabel } from '../../../shared/i18n/status/registry'

interface PackageFormModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (values: CreatePackageInput) => Promise<void>
  initialValues?: Partial<CreatePackageInput>
}

const BILLING_CYCLE_OPTIONS = [
  { value: 'WEEKLY', label: 'Theo tuần (7 ngày)' },
  { value: 'BIWEEKLY', label: 'Theo 2 tuần (14 ngày)' },
  { value: 'MONTHLY', label: 'Theo tháng' },
  { value: 'CROP_CYCLE', label: 'Theo vụ mùa' },
  { value: 'QUARTERLY', label: 'Theo quý' },
  { value: 'YEARLY', label: 'Theo năm' },
] satisfies Array<{ value: BillingCycle; label: string }>

/**
 * ⚠ Nhãn lấy từ **module trung tâm** (`src/shared/i18n/status/package.ts`)
 *   ⇒ cùng 1 trạng thái gói hiển thị giống nhau ở bảng, card & form.
 */
const STATUS_OPTIONS = (
  Object.keys(PACKAGE_STATUS_DICTIONARY) as PackageStatus[]
).map((value) => ({
  value,
  label: statusLabel(PACKAGE_STATUS_DICTIONARY, value),
})) satisfies Array<{ value: PackageStatus; label: string }>

export function PackageFormModal({
  open,
  onCancel,
  onSubmit,
  initialValues,
}: PackageFormModalProps) {
  const [form] = Form.useForm<CreatePackageInput>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    form.resetFields()
    form.setFieldsValue({
      billingCycle: 'MONTHLY',
      durationDays: 30,
      maxTrays: 1,
      supportedMushrooms: ['Nấm Bào Ngư Xám'],
      features: ['Camera stream HD 24/7'],
      status: 'ACTIVE',
      isPopular: false,
      ...initialValues,
    })
  }, [form, initialValues, open])

  const handleFinish = async (values: CreatePackageInput) => {
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
      title={initialValues ? 'Cập nhật gói cước' : 'Thêm gói cước mới'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu gói cước"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      destroyOnHidden
      afterClose={() => form.resetFields()}

 className="mcms-package-modal"
 footer={<><ActionButton icon={null} variant="text" label="Hủy" disabled={isSubmitting} onClick={onCancel} /><ActionButton icon={null} variant="primary" label="Lưu gói cước" loading={isSubmitting} onClick={() => form.submit()} /></>}
>
      <Form<CreatePackageInput>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Tên gói"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên gói.' },
            { whitespace: true, message: 'Tên gói không được để trống.' },
          ]}
        >
          <Input placeholder="Ví dụ: Gói Vụ Mùa Tiêu Chuẩn" maxLength={120} />
        </Form.Item>

        <Form.Item
          label="Mã gói"
          name="code"
          rules={[
            { required: true, message: 'Vui lòng nhập mã gói.' },
            {
              pattern: /^[A-Z0-9][A-Z0-9_-]{2,39}$/,
              message: 'Mã gói chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.',
            },
          ]}
        >
          <Input placeholder="CROP-STANDARD" maxLength={40} />
        </Form.Item>

        <Space.Compact block>
          <Form.Item
            label="Giá cước (VNĐ)"
            name="price"
            rules={[
              { required: true, message: 'Vui lòng nhập giá cước.' },
              { type: 'number', min: 1, message: 'Giá cước phải lớn hơn 0.' },
            ]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={1}
              precision={0}
              style={{ width: '100%' }}
              placeholder="1.290.000"
            />
          </Form.Item>

          <Form.Item
            label="Chu kỳ thanh toán"
            name="billingCycle"
            rules={[{ required: true, message: 'Vui lòng chọn chu kỳ.' }]}
            style={{ flex: 1 }}
          >
            <Select options={BILLING_CYCLE_OPTIONS} />
          </Form.Item>
        </Space.Compact>

        <Space.Compact block>
          <Form.Item
            label="Thời hạn áp dụng (ngày)"
            name="durationDays"
            rules={[
              { required: true, message: 'Vui lòng nhập thời hạn.' },
              { type: 'number', min: 1, message: 'Thời hạn phải lớn hơn 0.' },
            ]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={1}
              precision={0}
              style={{ width: '100%' }}
              placeholder="90"
            />
          </Form.Item>

          <Form.Item
            label="Giới hạn số khay"
            name="maxTrays"
            rules={[
              { required: true, message: 'Vui lòng nhập giới hạn khay.' },
              { type: 'number', min: 1, message: 'Số khay tối thiểu là 1.' },
            ]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={1}
              precision={0}
              style={{ width: '100%' }}
              placeholder="3"
            />
          </Form.Item>
        </Space.Compact>

        <Form.Item
          label="Trạng thái"
          name="status"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái.' }]}
        >
          <Select options={STATUS_OPTIONS} />
        </Form.Item>

        <Form.Item
          label="Gói nổi bật"
          name="isPopular"
          valuePropName="checked"
        >
          <Switch checkedChildren="Có" unCheckedChildren="Không" />
        </Form.Item>

        <Space.Compact block>
          <Form.Item
            label="Phí giao nhận (VNĐ)"
            name="deliveryFee"
            style={{ flex: 1 }}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              placeholder="0 = Miễn phí"
            />
          </Form.Item>

          <Form.Item
            label="Chính sách giao nhận"
            name="deliveryPolicy"
            style={{ flex: 2 }}
          >
            <Input
              placeholder="Ví dụ: Miễn phí giao nhận. Khách tự đến vườn hái."
              maxLength={255}
            />
          </Form.Item>
        </Space.Compact>

        <Form.List
          name="supportedMushrooms"
          rules={[
            {
              validator: async (_, values: string[] | undefined) => {
                if (!values || values.length === 0) {
                  throw new Error('Cần ít nhất một giống nấm hỗ trợ.')
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <Form.Item
              label="Các giống nấm hỗ trợ"
              required
              help={errors.length > 0 ? errors[0] : undefined}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Space.Compact key={field.key} block>
                    <Form.Item
                      {...field}
                      noStyle
                      rules={[{ required: true, message: 'Nhập giống nấm.' }]}
                    >
                      <Input placeholder="Nấm Bào Ngư Xám" />
                    </Form.Item>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                      aria-label="Xóa giống nấm"
                    />
                  </Space.Compact>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add()}
                  block
                >
                  Thêm giống nấm
                </Button>
              </Space>
            </Form.Item>
          )}
        </Form.List>

        <Form.List
          name="features"
          rules={[
            {
              validator: async (_, values: string[] | undefined) => {
                if (!values || values.length === 0) {
                  throw new Error('Cần ít nhất một tiện ích đi kèm.')
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <Form.Item
              label="Đặc quyền / dịch vụ đi kèm"
              required
              help={errors.length > 0 ? errors[0] : undefined}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Space.Compact key={field.key} block>
                    <Form.Item
                      {...field}
                      noStyle
                      rules={[{ required: true, message: 'Nhập tiện ích.' }]}
                    >
                      <Input placeholder="Camera stream HD 24/7" />
                    </Form.Item>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                      aria-label="Xóa tiện ích"
                    />
                  </Space.Compact>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add()}
                  block
                >
                  Thêm tiện ích
                </Button>
              </Space>
            </Form.Item>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}
