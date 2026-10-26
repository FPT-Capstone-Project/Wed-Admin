import { Typography } from 'antd'
import {
  scorePassword,
  type PasswordStrengthLevel,
} from './password-strength.utils'

const LABELS: Record<PasswordStrengthLevel, string> = {
  empty: '',
  weak: 'Mật khẩu yếu',
  fair: 'Mật khẩu khá',
  good: 'Mật khẩu tốt',
  strong: 'Mật khẩu mạnh',
}

interface PasswordStrengthProps {
  value: string
}

/** Thanh 4 mức + nhãn trạng thái, hiển thị ngay dưới ô mật khẩu. */
export function PasswordStrength({ value }: PasswordStrengthProps) {
  const strength = scorePassword(value)

  if (strength === 'empty') return null

  return (
    <div
      className={`auth-v2-strength is-${strength}`}
      role="status"
      aria-live="polite"
    >
      <div className="auth-v2-strength-track" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <span className="auth-v2-strength-label">
        {LABELS[strength]}
      </span>
    </div>
  )
}

/** Gợi ý yêu cầu mật khẩu — hiển thị dưới form đăng ký. */
export function PasswordHint() {
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
      Nên có ít nhất 8 ký tự, kết hợp chữ hoa, chữ thường và số để tăng độ an toàn.
    </Typography.Text>
  )
}
