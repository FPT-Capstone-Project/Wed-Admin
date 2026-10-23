import { useEffect, useState } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import type { User, UserFormValues } from '../../../types/user.types'

interface UserFormModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (values: UserFormValues) => Promise<void>
  initialValues?: Partial<UserFormValues>
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'OPERATOR', label: 'Vận hành trang trại' },
  { value: 'CUSTOMER', label: 'Khách thuê khay' },
] satisfies Array<{ value: User['role']; label: string }>

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'LOCKED', label: 'Tạm khóa' },
  { value: 'PENDING', label: 'Chờ kích hoạt' },
] satisfies Array<{ value: User['status']; label: string }>

export function UserFormModal({
  open,
  onCancel,
  onSubmit,
  initialValues,
}: UserFormModalProps) {
  const [form] = Form.useForm<UserFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    form.resetFields()
    form.setFieldsValue({
      role: 'CUSTOMER',
      status: 'PENDING',
      ...initialValues,
    })
  }, [form, initialValues, open])

  const handleFinish = async (values: UserFormValues) => {
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
      title={initialValues ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
      keyboard={!isSubmitting}
      destroyOnHidden
      afterClose={() => form.resetFields()}
    >
      <Form<UserFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Họ tên"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập họ tên.' },
            { whitespace: true, message: 'Họ tên không được để trống.' },
          ]}
        >
          <Input placeholder="Nhập họ tên người dùng" maxLength={100} />
        </Form.Item>

        <Form.Item
          label="Username"
          name="username"
          rules={[
            { required: true, message: 'Vui lòng nhập username.' },
            {
              min: 4,
              message: 'Username phải có ít nhất 4 ký tự.',
            },
            {
              pattern: /^[a-zA-Z0-9._-]+$/,
              message: 'Username chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.',
            },
          ]}
        >
          <Input placeholder="Nhập username" maxLength={50} />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email.' },
            {
              pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Email không đúng định dạng.',
            },
          ]}
        >
          <Input
            type="email"
            autoComplete="email"
            placeholder="user@example.com"
            maxLength={150}
          />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          name="phone"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại.' },
            {
              pattern: /^(0|\+84)\d{9,10}$/,
              message: 'Số điện thoại Việt Nam không đúng định dạng.',
            },
          ]}
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0901234567"
            maxLength={14}
          />
        </Form.Item>

        <Form.Item
          label="Vai trò"
          name="role"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò.' }]}
        >
          <Select options={ROLE_OPTIONS} />
        </Form.Item>

        <Form.Item
          label="Trạng thái"
          name="status"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái.' }]}
        >
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
