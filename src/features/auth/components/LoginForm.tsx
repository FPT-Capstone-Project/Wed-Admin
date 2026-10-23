import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Checkbox, Form, Input, Typography } from 'antd'
import { useState } from 'react'
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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    <Card className="login-card" variant="outlined">
      <Typography.Title level={2} className="login-card-title">
        Đăng nhập
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="login-card-desc">
        Sử dụng tài khoản được cấp để tiếp tục vào hệ thống.
      </Typography.Paragraph>

      {(errorMessage ?? lastError) && (
        <Alert
          type="error"
          message={errorMessage ?? lastError}
          showIcon
          closable
          onClose={() => {
            setErrorMessage(null)
            clearError()
          }}
          className="login-card-error"
        />
      )}

      <Form<LoginCredentials>
        className="login-form"
        layout="vertical"
        requiredMark={false}
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
            autoComplete="email"
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
        >
          Đăng nhập
        </Button>
      </Form>

      <div className="login-alt">
        Tài khoản được cấp bởi quản trị viên hệ thống.
      </div>
    </Card>
  )
}