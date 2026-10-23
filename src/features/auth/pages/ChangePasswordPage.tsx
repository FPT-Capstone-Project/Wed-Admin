import { App, Button, Card, Form, Input, Steps, Typography } from 'antd'
import {
  CheckCircleOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { OtpField } from '../components/OtpField'
import {
  PasswordHint,
  PasswordStrength,
} from '../components/PasswordStrength'
import { useAuthStore } from '../store/auth.store'

interface ChangePasswordFormValues {
  new_password: string
}

type FlowStep = 'request' | 'verify'

const FLOW_STEPS = [
  { title: 'Gửi OTP' },
  { title: 'Đặt mật khẩu mới' },
]

const RESEND_SECONDS = 60

/** Hook đếm ngược dùng chung — trả về số giây còn lại + hàm restart. */
function useCountdown(initial = 0) {
  const [seconds, setSeconds] = useState(initial)

  useEffect(() => {
    if (seconds <= 0) return undefined
    const id = window.setInterval(() => {
      setSeconds((v) => (v > 0 ? v - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [seconds])

  return {
    seconds,
    isRunning: seconds > 0,
    start: (s: number) => setSeconds(s),
    reset: () => setSeconds(0),
  }
}

/** Theo dõi mật khẩu mới để hiện thanh strength. */
function NewPasswordWatcher() {
  return (
    <Form.Item
      noStyle
      shouldUpdate={(prev, next) =>
        prev.new_password !== next.new_password
      }
    >
      {({ getFieldValue }) => (
        <PasswordStrength
          value={String(getFieldValue('new_password') ?? '')}
        />
      )}
    </Form.Item>
  )
}

/**
 * Đổi mật khẩu khi đang đăng nhập — 2 bước.
 *
 * Bước 1: POST /api/auth/request-change-password-otp → BE gửi OTP về email
 *         đã đăng ký của user (email lấy từ JWT, không cần nhập tay).
 * Bước 2: PUT /api/auth/change-password-otp → xác thực OTP + đặt mật khẩu mới.
 *
 * Cả hai endpoint đều yêu cầu `bearerAuth` — nên route này chỉ render khi
 * đã đăng nhập (được bảo vệ bởi `AuthGuard` ở `app/router/index.tsx`).
 */
export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm<ChangePasswordFormValues>()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [step, setStep] = useState<FlowStep>('request')
  const [otpValue, setOtpValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const countdown = useCountdown()

  const userEmail = user?.email ?? 'email đã đăng ký'
  const currentStepIndex = step === 'request' ? 0 : 1

  const handleRequestOtp = async () => {
    setIsSending(true)
    setErrorMessage(null)
    try {
      await authApi.requestChangePasswordOtp()
      setStep('verify')
      setOtpValue('')
      countdown.start(RESEND_SECONDS)
      messageApi.success(`Đã gửi mã OTP đến ${userEmail}.`)
    } catch (err) {
      const text =
        err instanceof Error ? err.message : 'Không gửi được mã OTP.'
      setErrorMessage(text)
    } finally {
      setIsSending(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown.isRunning) return
    setErrorMessage(null)
    setIsSending(true)
    try {
      await authApi.requestChangePasswordOtp()
      countdown.start(RESEND_SECONDS)
      messageApi.success('Đã gửi lại mã OTP.')
    } catch (err) {
      const text =
        err instanceof Error ? err.message : 'Không gửi lại được mã OTP.'
      setErrorMessage(text)
    } finally {
      setIsSending(false)
    }
  }

  const handleChangePassword = async (values: ChangePasswordFormValues) => {
    if (otpValue.length < 6) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số của mã OTP.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await authApi.changePasswordOtp({
        otp: otpValue,
        new_password: values.new_password,
      })
      messageApi.success(
        'Đổi mật khẩu thành công. Hãy đăng nhập lại với mật khẩu mới.',
      )
      form.resetFields()
      setOtpValue('')
      countdown.reset()
      setStep('request')
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : 'Không đổi được mật khẩu. Mã OTP có thể đã hết hạn.'
      setErrorMessage(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackToRequest = () => {
    setStep('request')
    setOtpValue('')
    setErrorMessage(null)
  }

  return (
    <Card
      title="Đổi mật khẩu"
      style={{ maxWidth: 560, margin: '0 auto' }}
      styles={{ body: { padding: 24 } }}
    >
      <Steps
        current={currentStepIndex}
        size="small"
        style={{ marginBottom: 24 }}
        items={FLOW_STEPS.map((item) => ({ title: item.title }))}
      />

      {errorMessage && (
        <Typography.Paragraph type="danger" role="alert">
          {errorMessage}
        </Typography.Paragraph>
      )}

      {step === 'request' && (
        <div>
          <Typography.Paragraph type="secondary">
            Chúng tôi sẽ gửi mã OTP 6 chữ số đến email{' '}
            <Typography.Text strong>{userEmail}</Typography.Text> để xác nhận
            bạn là chủ tài khoản trước khi đặt mật khẩu mới.
          </Typography.Paragraph>

          <Button
            type="primary"
            size="large"
            block
            icon={<MailOutlined />}
            loading={isSending}
            onClick={handleRequestOtp}
          >
            Gửi mã OTP
          </Button>
        </div>
      )}

      {step === 'verify' && (
        <Form<ChangePasswordFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleChangePassword}
          autoComplete="off"
          className="auth-v2-form"
        >
          <div className="auth-v2-otp-head">
            <SafetyCertificateOutlined aria-hidden="true" />
            <span>
              Mã OTP gồm <b>6 chữ số</b> đã gửi đến <b>{userEmail}</b>.
            </span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <OtpField
              value={otpValue}
              onChange={setOtpValue}
              disabled={isSubmitting}
            />
          </div>

          <Form.Item
            label="Mật khẩu mới"
            name="new_password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới.' },
              { min: 8, message: 'Mật khẩu phải từ 8 ký tự trở lên.' },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined aria-hidden="true" />}
              placeholder="Tối thiểu 8 ký tự"
              autoComplete="new-password"
            />
          </Form.Item>

          <NewPasswordWatcher />
          <PasswordHint />

          <div className="auth-v2-otp-actions">
            <Button
              size="large"
              onClick={handleBackToRequest}
              disabled={isSubmitting}
            >
              Quay lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isSubmitting}
              disabled={otpValue.length < 6}
            >
              Đổi mật khẩu
            </Button>
          </div>

          <div className="auth-v2-resend">
            Không nhận được mã?{' '}
            <Button
              type="link"
              onClick={handleResendOtp}
              disabled={countdown.isRunning || isSending}
            >
              {countdown.isRunning
                ? `Gửi lại sau ${String(countdown.seconds).padStart(2, '0')}s`
                : 'Gửi lại OTP'}
            </Button>
          </div>
        </Form>
      )}

      <div className="auth-v2-note">
        <CheckCircleOutlined aria-hidden="true" />
        Sau khi đổi mật khẩu, bạn sẽ được đăng xuất và đăng nhập lại bằng mật
        khẩu mới.
      </div>
    </Card>
  )
}
