import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Checkbox, Form, Input, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import type { LoginCredentials } from '../types/auth.types'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useAuthStore((state) => state.login)
  const rememberedEmail = useAuthStore((state) => state.rememberedEmail)
  const lastError = useAuthStore((state) => state.lastError)
  const clearError = useAuthStore((state) => state.clearError)
  const { message: messageApi } = App.useApp()

  const [form] = Form.useForm<LoginCredentials>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /**
   * Tự điền email + tích sẵn checkbox khi tải lại trang Login.
   *
   * ⚠ Dùng `useEffect` + `form.setFieldsValue` thay vì chỉ `initialValues`:
   * `initialValues` chỉ áp dụng lần mount đầu, còn `rememberedEmail` trong
   * store có thể được hydrate/migrate **sau** khi component đã render
   * (vd đọc từ `localStorage` bị trễ, hoặc user vừa logout ở tab khác).
   * `setFieldsValue` cập nhật được form đã mount.
   */
  useEffect(() => {
    if (!rememberedEmail) return
    form.setFieldsValue({
      email: rememberedEmail,
      rememberMe: true,
    })
  }, [form, rememberedEmail])

  const handleSubmit = async (credentials: LoginCredentials) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    clearError()

    try {
      await login(credentials)
      messageApi.success('Đăng nhập thành công.')
      onSuccess?.()
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : 'Không thể đăng nhập. Vui lòng thử lại.'
      setErrorMessage(text)
      messageApi.error(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="login-card mcms-login-card" variant="outlined">
      <div className="login-card-header">
        <Typography.Title level={2} className="login-card-title">
          Đăng nhập
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="login-card-desc">
          Sử dụng tài khoản được cấp để tiếp tục vào hệ thống MCMS.
        </Typography.Paragraph>
      </div>

      {(errorMessage ?? lastError) && (
        <Alert
          type="error"
          title={errorMessage ?? lastError}
          showIcon
          closable
          onClose={() => {
            setErrorMessage(null)
            clearError()
          }}
          className="login-card-error"
          style={{ marginBottom: 'var(--mcms-space-4)' }}
        />
      )}

      <Form<LoginCredentials>
        className="login-form mcms-login-form"
        layout="vertical"
        requiredMark={false}
        form={form}
        initialValues={{
          email: rememberedEmail,
          rememberMe: Boolean(rememberedEmail),
        }}
        onFinish={handleSubmit}
      >
        <Form.Item<LoginCredentials>
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email.' },
            { type: 'email', message: 'Email không đúng định dạng.' },
          ]}
        >
          <Input
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="user@example.com"
            prefix={<MailOutlined aria-hidden="true" />}
            size="large"
          />
        </Form.Item>

        <Form.Item<LoginCredentials>
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
        >
          <Input.Password
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            prefix={<LockOutlined aria-hidden="true" />}
            size="large"
          />
        </Form.Item>

        <div className="login-remember-row">
          <Form.Item<LoginCredentials>
            name="rememberMe"
            valuePropName="checked"
            noStyle
          >
            <Checkbox>Ghi nhớ đăng nhập</Checkbox>
          </Form.Item>
          <Link to="/forgot-password" className="login-forgot">
            Quên mật khẩu?
          </Link>
        </div>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={isSubmitting}
          className="mcms-login-submit-btn"
          style={{ minHeight: 46 }}
        >
          Đăng nhập
        </Button>
      </Form>

      <div className="login-alt">
        Tài khoản được cấp bởi ban quản trị hệ thống trang trại MCMS.
      </div>
    </Card>
  )
}
