import { Typography } from 'antd'

type Strength = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

const LABELS: Record<Strength, string> = {
  empty: '',
  weak: 'Mật khẩu yếu',
  fair: 'Mật khẩu khá',
  good: 'Mật khẩu tốt',
  strong: 'Mật khẩu mạnh',
}

/**
 * Ước lượng độ mạnh mật khẩu theo 4 tiêu chí thực tế.
 * Không nhằm mã hoá an toàn — chỉ để NGƯỜI DÙNG biết mật khẩu của họ có
 * đủ đa dạng hay không trước khi gửi lên server.
 */
export function scorePassword(value: string): Exclude<Strength, 'empty'> | 'empty' {
  if (!value) return 'empty'

  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^\w\s]/.test(value)) score += 1

  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'good'
  return 'strong'
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