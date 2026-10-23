import type { ReactNode } from 'react'
import { Alert, Card } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'

export interface AuthStep {
  /** Nhãn ngắn hiển thị trong pill. */
  label: string
}

interface AuthShellProps {
  /** Nhãn in hoa nhỏ phía trên title, vd "KHỞI TẠO TÀI KHOẢN". */
  kicker?: string
  title: string
  description?: string
  /**
   * Các bước của flow. Khi truyền, hiển thị pill progress ở đầu card.
   * `currentStep` = index 0-based của bước đang thực hiện.
   */
  steps?: AuthStep[]
  currentStep?: number
  children: ReactNode
  /** Thông báo lỗi chung — hiển thị dạng focusable error summary. */
  errorMessage?: string | null
  onDismissError?: () => void
  /** Link phụ ở chân card — vd "Đã có tài khoản? Đăng nhập". */
  footerLink?: { prompt: string; label: string; to: string }
  /** Gợi ý thông tin phụ dưới form (callout nhẹ). */
  note?: ReactNode
}

/**
 * Layout dùng chung cho các trang đăng ký / OTP / quên mật khẩu.
 *
 * Đơn giản: logo + brand ở top, card form canh giữa. Một chút ảnh hero
 * blur ở góc phải-bottom làm background atmosphere — không phân tâm.
 *
 * Mobile: 1 cột. Tablet/desktop: card giãn ra tối đa 480px để dễ đọc.
 *
 * Tuân thủ: focus ring rõ, error summary `role="alert"` + focusable,
 * touch target ≥ 44px, transition ngắn, tôn trọng `prefers-reduced-motion`.
 */
export function AuthShell({
  kicker,
  title,
  description,
  steps,
  currentStep = 0,
  children,
  errorMessage,
  onDismissError,
  footerLink,
  note,
}: AuthShellProps) {
  const navigate = useNavigate()
  const stepCount = steps?.length ?? 0
  const hasError = Boolean(errorMessage)

  return (
    <main className="auth-v2">
      {/* Background atmosphere: cùng 1 ảnh hero, blur nhẹ ở góc */}
      <div className="auth-v2-bg" aria-hidden="true">
        <img
          src="/auth/hero-mushroom-rows.jpg"
          alt=""
          width="1400"
          height="933"
          loading="lazy"
          decoding="async"
        />
        <div className="auth-v2-bg-overlay" />
      </div>

      <header className="auth-v2-top">
        <button
          type="button"
          className="auth-v2-back"
          onClick={() => navigate(-1)}
          aria-label="Quay lại trang trước"
        >
          <ArrowLeftOutlined aria-hidden="true" />
          Quay lại
        </button>
        <span className="auth-v2-lockup">
          <img src="/mcms-mark.svg" alt="" width="30" height="30" />
          <strong>MCMS</strong>
        </span>
        <span className="auth-v2-top-spacer" aria-hidden="true" />
      </header>

      <Card className="auth-v2-card" variant="outlined">
        {stepCount > 1 && (
          <nav className="auth-v2-steps" aria-label="Tiến độ đăng ký">
            {steps!.map((step, index) => {
              const state =
                index === currentStep
                  ? 'is-active'
                  : index < currentStep
                    ? 'is-done'
                    : ''
              return (
                <div
                  key={step.label}
                  className={`auth-v2-step ${state}`}
                  aria-current={index === currentStep ? 'step' : undefined}
                >
                  <span className="auth-v2-step-index" aria-hidden="true">
                    {index < currentStep ? <CheckOutlined /> : index + 1}
                  </span>
                  <span>{step.label}</span>
                </div>
              )
            })}
          </nav>
        )}

        {kicker && <span className="auth-v2-kicker">{kicker}</span>}
        <h1 className="auth-v2-title">{title}</h1>
        {description && <p className="auth-v2-desc">{description}</p>}

        {hasError && (
          <Alert
            className="auth-v2-error-summary"
            type="error"
            showIcon
            role="alert"
            message={errorMessage}
            closable={Boolean(onDismissError)}
            onClose={onDismissError}
          />
        )}

        {children}

        {note && (
          <div className="auth-v2-note">
            <InfoCircleOutlined aria-hidden="true" />
            {note}
          </div>
        )}

        {footerLink && (
          <div className="auth-v2-alt">
            {footerLink.prompt}{' '}
            <Link to={footerLink.to}>{footerLink.label}</Link>
          </div>
        )}
      </Card>
    </main>
  )
}