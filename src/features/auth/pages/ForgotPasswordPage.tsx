import { App, Button, Form, Input } from 'antd'
import {
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { AuthShell } from '../components/AuthShell'
import { OtpField } from '../components/OtpField'
import {
  PasswordHint,
  PasswordStrength,
} from '../components/PasswordStrength'

type FlowStep = 'email' | 'verify' | 'reset'

interface EmailFormValues {
  email: string
}

interface ResetFormValues {
  new_password: string
}

const FLOW_STEPS = [
  { label: 'Email' },
  { label: 'Xác thực OTP' },
  { label: 'Mật khẩu mới' },
]

const RESEND_SECONDS = 60

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
function ResetPasswordWatcher() {
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
 * Quên mật khẩu theo OTP — 3 bước.
 *
 * Bước 1: POST /api/auth/forgot-password → gửi OTP reset.
 * Bước 2: người dùng nhập OTP từ email.
 * Bước 3: POST /api/auth/reset-password-otp → đặt mật khẩu mới.
 *
 * Theo WCAG 2.2 A (redundant-entry): bỏ ô "Nhập lại mật khẩu mới" — chỉ dùng
 * nút "Hiện/Ẩn" + strength meter + độ dài tối thiểu để giảm nhập lặp.
 */
export function ForgotPasswordPage() {
  const { message: messageApi } = App.useApp()
  const [resetForm] = Form.useForm<ResetFormValues>()
  const [step, setStep] = useState<FlowStep>('email')
  const [emailForReset, setEmailForReset] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const countdown = useCountdown()

  const stepIndex = step === 'email' ? 0 : step === 'verify' ? 1 : 2

  const handleRequestOtp = async (values: EmailFormValues) => {
    setIsSending(true)
    setErrorMessage(null)
    try {
      await authApi.forgotPassword({
        email: values.email.trim().toLowerCase(),
      })
      setEmailForReset(values.email.trim().toLowerCase())
      setStep('verify')
      countdown.start(RESEND_SECONDS)
      messageApi.success(
        `Nếu email tồn tại, mã OTP đã được gửi đến ${values.email}.`,
      )
    } catch (err) {
      const text =
        err instanceof Error ? err.message : 'Không thể gửi yêu cầu.'
      setErrorMessage(text)
    } finally {
      setIsSending(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown.isRunning || !emailForReset) return
    setErrorMessage(null)
    setIsSending(true)
    try {
      await authApi.forgotPassword({ email: emailForReset })
      countdown.start(RESEND_SECONDS)
      messageApi.success('Đã gửi lại mã OTP.')
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Không gửi lại được OTP.'
      setErrorMessage(text)
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyAndContinue = async (value: string) => {
    if (value.length < 6 || isVerifying) return
    setIsVerifying(true)
    setErrorMessage(null)
    // BE không có endpoint "verify forgot-password OTP" riêng — reset endpoint
    // sẽ fail nếu sai OTP, ta chuyển step và để bước 3 xử lý cuối cùng.
    await new Promise((r) => setTimeout(r, 200))
    setStep('reset')
    setIsVerifying(false)
  }

  const handleResetPassword = async (values: ResetFormValues) => {
    setIsResetting(true)
    setErrorMessage(null)
    try {
      await authApi.resetPassword({
        email: emailForReset,
        otp: otpValue,
        new_password: values.new_password,
      })
      messageApi.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.')
      resetForm.resetFields()
      setOtpValue('')
      countdown.reset()
      setStep('email')
      setEmailForReset('')
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : 'Không đặt lại được mật khẩu. Mã OTP có thể đã hết hạn.'
      setErrorMessage(text)
      if (
        text.toLowerCase().includes('otp') ||
        text.toLowerCase().includes('invalid') ||
        text.toLowerCase().includes('mã')
      ) {
        setStep('verify')
      }
    } finally {
      setIsResetting(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setOtpValue('')
    setErrorMessage(null)
  }

  const handleBackToVerify = () => {
    setStep('verify')
    setErrorMessage(null)
  }

  const isVerifyHint = (
    <span>
      <SafetyCertificateOutlined aria-hidden="true" />
      Mã OTP gồm <b>6 chữ số</b> đã gửi đến <b>{emailForReset}</b>.
    </span>
  )

  return (
    <AuthShell
      kicker="KHÔI PHỤC TRUY CẬP"
      title="Quên mật khẩu"
      description="Nhận mã OTP qua email để thiết lập mật khẩu mới."
      steps={FLOW_STEPS}
      currentStep={stepIndex}
      errorMessage={errorMessage}
      onDismissError={() => setErrorMessage(null)}
      footerLink={
        step === 'email'
          ? {
              prompt: 'Nhớ mật khẩu rồi?',
              label: 'Đăng nhập',
              to: '/login',
            }
          : undefined
      }
    >
      {step === 'email' && (
        <Form<EmailFormValues>
          layout="vertical"
          requiredMark={false}
          onFinish={handleRequestOtp}
          autoComplete="off"
          className="auth-v2-form"
        >
          <Form.Item
            label="Email đã đăng ký"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email.' },
              { type: 'email', message: 'Email không đúng định dạng.' },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined aria-hidden="true" />}
              placeholder="user@example.com"
              autoComplete="email"
              inputMode="email"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isSending}
          >
            Gửi mã OTP
          </Button>

          <div className="auth-v2-alt">
            <Link to="/login">← Quay lại đăng nhập</Link>
          </div>
        </Form>
      )}

      {step === 'verify' && (
        <div>
          <OtpField
            value={otpValue}
            onChange={setOtpValue}
            onComplete={handleVerifyAndContinue}
            disabled={isVerifying}
            hint={isVerifyHint}
          />

          <div className="auth-v2-otp-actions">
            <Button
              size="large"
              onClick={handleBackToEmail}
              disabled={isVerifying}
            >
              Quay lại
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => handleVerifyAndContinue(otpValue)}
              loading={isVerifying}
              disabled={otpValue.length < 6}
            >
              Tiếp tục
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
        </div>
      )}

      {step === 'reset' && (
        <Form<ResetFormValues>
          form={resetForm}
          layout="vertical"
          requiredMark={false}
          onFinish={handleResetPassword}
          autoComplete="off"
          className="auth-v2-form"
        >
          <div className="auth-v2-otp-head">
            <LockOutlined aria-hidden="true" />
            <span>
              Tạo mật khẩu mới cho tài khoản <b>{emailForReset}</b>.
            </span>
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

          <ResetPasswordWatcher />
          <PasswordHint />

          <div className="auth-v2-otp-actions">
            <Button
              size="large"
              onClick={handleBackToVerify}
              disabled={isResetting}
            >
              Quay lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isResetting}
            >
              Đặt lại mật khẩu
            </Button>
          </div>
        </Form>
      )}
    </AuthShell>
  )
}