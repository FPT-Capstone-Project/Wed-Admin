import { useEffect } from 'react'
import { App, Form, Input, Modal, Select } from 'antd'
import { useCreateUser } from '../../../features/users/hooks/useUsers'
import { ROLE_OPTIONS } from '../../../features/users/user-status.config'
import type {
  CreateManagedUserRequest,
  UserAccountDetail,
} from '../../../types/user.types'

interface UserFormModalProps {
  open: boolean
  onCancel: () => void
  onCreated?: (user: UserAccountDetail) => void
}

/**
 * Tạo tài khoản mới — chỉ có "create" vì BE chưa expose endpoint update
 * profile user (không có `PATCH /api/users/{userId}`, chỉ có
 * `PATCH /api/users/{userId}/status`).
 */
type FormShape = CreateManagedUserRequest

const DEFAULT_ROLE_ID = 3

export function UserFormModal({
  open,
  onCancel,
  onCreated,
}: UserFormModalProps) {
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm<FormShape>()
  const createMutation = useCreateUser()

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      address: '',
      roleId: DEFAULT_ROLE_ID,
    })
  }, [form, open])

  const handleFinish = async (values: FormShape) => {
    try {
      const created = await createMutation.mutateAsync({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        fullName: values.fullName.trim(),
        roleId: values.roleId,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
      })

      messageApi.success(`Đã tạo tài khoản "${created.full_name}".`)
      onCancel()
      onCreated?.(created)
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : 'Lỗi không xác định.',
      )
    }
  }

  return (
    <Modal
      title="Thêm tài khoản mới"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Tạo tài khoản"
      cancelText="Hủy"
      confirmLoading={createMutation.isPending}
      cancelButtonProps={{ disabled: createMutation.isPending }}
      closable={!createMutation.isPending}
      maskClosable={!createMutation.isPending}
      keyboard={!createMutation.isPending}
      destroyOnHidden
      width={640}
    >
      <Form<FormShape>
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[
            { required: true, message: 'Vui lòng nhập họ tên.' },
            { whitespace: true, message: 'Họ tên không được để trống.' },
            { max: 100, message: 'Họ tên tối đa 100 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Nguyễn Văn A" maxLength={100} />
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
            autoComplete="off"
            placeholder="staff@mcms.vn"
            maxLength={150}
          />
        </Form.Item>

        <Form.Item
          label="Mật khẩu khởi tạo"
          name="password"
          extra="Tối thiểu 8 ký tự. Hãy gửi riêng cho người dùng và yêu cầu họ đổi sau lần đăng nhập đầu."
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu.' },
            { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự.' },
          ]}
        >
          <Input.Password
            autoComplete="new-password"
            placeholder="Ít nhất 8 ký tự"
            maxLength={64}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Vai trò"
            name="roleId"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò.' }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Select
              options={ROLE_OPTIONS.map((option) => ({
                value: option.roleId,
                label: option.label,
                title: option.description,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[
              {
                pattern: /^(0|\+84)\d{9,10}$/,
                message: 'SĐT VN không đúng định dạng (vd: 0901234567).',
              },
            ]}
          >
            <Input
              type="tel"
              inputMode="tel"
              placeholder="0901234567"
              maxLength={14}
            />
          </Form.Item>
        </div>

        <Form.Item
          label="Địa chỉ"
          name="address"
          style={{ marginTop: 16, marginBottom: 0 }}
          rules={[{ max: 255, message: 'Địa chỉ tối đa 255 ký tự.' }]}
        >
          <Input placeholder="TP. Hồ Chí Minh" maxLength={255} />
        </Form.Item>
      </Form>
    </Modal>
  )
}