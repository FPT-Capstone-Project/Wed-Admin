import { Input } from 'antd'

interface OtpFieldProps {
  /** Số ô OTP, mặc định 6 theo swagger. */
  length?: number
  /** Giá trị controlled (string nhiều ký tự). */
  value?: string
  /** Change handler — gọi mỗi khi user gõ/xoá 1 ô. */
  onChange?: (value: string) => void
  /** Auto submit khi đủ số ô. */
  onComplete?: (value: string) => void
  /** Gợi ý hiển thị phía trên OTP. */
  hint?: React.ReactNode
  disabled?: boolean
}

/**
 * Wrapper quanh `Input.OTP` của AntD — dùng chung cho luồng đăng ký OTP
 * và quên mật khẩu OTP.
 *
 * AntD 6 Input.OTP không expose `onComplete` ở type public, nên tự phát
 * hiện khi length đủ qua `onChange`.
 */
export function OtpField({
  length = 6,
  value,
  onChange,
  onComplete,
  hint,
  disabled,
}: OtpFieldProps) {
  const handleChange = (next: string) => {
    onChange?.(next)
    if (next.length === length) {
      onComplete?.(next)
    }
  }

  return (
    <div>
      {/*
        Hint PHẢI được bọc trong 1 element duy nhất: container `.auth-v2-otp-head`
        là flex, nên mọi child trực tiếp sẽ trở thành 1 flex item riêng và bị
        xếp thành cột hẹp (text wrapping rất xấu). Bọc ở đây thay vì bắt từng
        call-site truyền fragment trần.
      */}
      {hint && <div className="auth-v2-otp-head"><span>{hint}</span></div>}
      <div className="auth-v2-otp">
        <Input.OTP
          length={length}
          size="large"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          autoFocus
        />
      </div>
    </div>
  )
}