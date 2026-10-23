import { useEffect } from 'react'
import { App, Form, Input, InputNumber, Modal } from 'antd'
import type {
  CreateRentalPackageRequest,
  RentalPackage,
  UpdateRentalPackageRequest,
} from '../../../types/rental-package'
import {
  useCreateRentalPackage,
  useUpdateRentalPackage,
} from '../../../features/packages/hooks/useRentalPackages'

interface RentalPackageFormModalProps {
  open: boolean
  initialValues?: RentalPackage | null
  onCancel: () => void
}

type FormShape = {
  packageName: string
  description?: string
  durationDays: number
  price: number
}

const DEFAULT_STATUS = 'ACTIVE' as const

function toFormShape(item: RentalPackage): FormShape {
  return {
    packageName: item.package_name,
    description: item.description ?? '',
    durationDays: item.duration_days,
    price: item.price,
  }
}

function formShapeToCreatePayload(values: FormShape): CreateRentalPackageRequest {
  return {
    packageName: values.packageName.trim(),
    description: values.description?.trim() || undefined,
    durationDays: values.durationDays,
    price: values.price,
    status: DEFAULT_STATUS,
  }
}

function formShapeToUpdatePayload(values: FormShape): UpdateRentalPackageRequest {
  return {
    packageName: values.packageName.trim(),
    description: values.description?.trim() || undefined,
    durationDays: values.durationDays,
    price: values.price,
  }
}

export function RentalPackageFormModal({
  open,
  initialValues,
  onCancel,
}: RentalPackageFormModalProps) {
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm<FormShape>()
  const createMutation = useCreateRentalPackage()
  const updateMutation = useUpdateRentalPackage()

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (initialValues) {
      form.setFieldsValue(toFormShape(initialValues))
    } else {
      form.setFieldsValue({
        packageName: '',
        description: '',
        durationDays: 30,
        price: 500_000,
      })
    }
  }, [form, initialValues, open])

  const handleFinish = async (values: FormShape) => {
    try {
      if (initialValues) {
        await updateMutation.mutateAsync({
          id: initialValues.package_id,
          payload: formShapeToUpdatePayload(values),
        })
        messageApi.success(`Đã cập nhật gói thuê "${values.packageName}".`)
      } else {
        await createMutation.mutateAsync({
          ...formShapeToCreatePayload(values),
        })
        messageApi.success(`Đã thêm gói thuê "${values.packageName}".`)
      }
      onCancel()
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : 'Lỗi không xác định.',
      )
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      title={
        initialValues
          ? `Chỉnh sửa gói thuê: ${initialValues.package_name}`
          : 'Thêm gói thuê mới'
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu gói thuê"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      destroyOnHidden
      width={680}
    >
      <Form<FormShape>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Tên gói thuê"
          name="packageName"
          rules={[
            { required: true, message: 'Vui lòng nhập tên gói.' },
            { whitespace: true, message: 'Tên không được để trống.' },
            { max: 200, message: 'Tên tối đa 200 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Gói Standard 30 ngày" maxLength={200} />
        </Form.Item>

        <Form.Item
          label="Mô tả"
          name="description"
          rules={[{ max: 500, message: 'Mô tả tối đa 500 ký tự.' }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="Bao gồm 1 khay nuôi, IoT + camera + nhân công."
            maxLength={500}
            showCount
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Thời lượng (ngày)"
            name="durationDays"
            rules={[
              { required: true, message: 'Vui lòng nhập số ngày.' },
              { type: 'number', min: 1, message: 'Số ngày phải ≥ 1.' },
              { type: 'number', max: 365, message: 'Số ngày phải ≤ 365.' },
            ]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber<number>
              min={1}
              max={365}
              step={1}
              precision={0}
              style={{ width: '100%' }}
              placeholder="30"
              addonAfter="ngày"
            />
          </Form.Item>

          <Form.Item
            label="Đơn giá (VND)"
            name="price"
            rules={[
              { required: true, message: 'Vui lòng nhập đơn giá.' },
              { type: 'number', min: 0, message: 'Đơn giá phải ≥ 0.' },
            ]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber<number>
              min={0}
              step={50_000}
              precision={0}
              style={{ width: '100%' }}
              placeholder="500000"
              addonAfter="VND"
              formatter={(value) =>
                value != null
                  ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                  : ''
              }
              parser={(value) => {
                const raw = (value ?? '').replace(/[^\d]/g, '')
                const parsed = Number(raw)
                return Number.isFinite(parsed) ? parsed : 0
              }}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
