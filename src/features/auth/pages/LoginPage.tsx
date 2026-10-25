import {
  CloudServerOutlined,
  LineChartOutlined,
  RadarChartOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import '../styles/auth.css'

/**
 * Trang đăng nhập — 2 cột: branding (trái) + form (phải).
 *
 * Branding panel: tone màu xanh lá chủ đạo từ tokens.ts (`palette.primary` / `palette.teal`)
 * kết hợp bố cục và hoạ tiết trang trại nấm thông minh hiện đại (kệ nấm, vi khí hậu, mạng IoT).
 * Form panel: Card form sang trọng, cân đối, nút Đăng nhập đạt chiều cao tối thiểu 44px.
 */
export function LoginPage() {
  const navigate = useNavigate()

  const handleLoginSuccess = () => {
    navigate('/', { replace: true })
  }

  return (
    <main className="login-page mcms-login">
      {/* ── Cột trái: Branding panel ─────────────────────────────────── */}
      <aside
        className="mcms-login-brand"
        aria-label="Giới thiệu hệ thống quản lý trang trại nấm thông minh MCMS"
      >
        {/* Hoạ tiết trang trại nấm thông minh & mạng cảm biến IoT */}
        <svg
          className="mcms-login-brand-pattern"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {/* Pattern kệ nuôi nấm nhiều tầng */}
            <pattern
              id="mcms-rack-grid"
              width="140"
              height="110"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="12"
                y="16"
                width="116"
                height="64"
                rx="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.5"
              />
              <path
                d="M12 44h116M12 72h116M70 16v64"
                stroke="currentColor"
                strokeWidth="0.8"
                opacity="0.35"
              />
              {/* Biểu tượng tai nấm sinh trưởng trên khay */}
              <path
                d="M36 40c0-6 4-10 9-10s9 4 9 10zM45 40v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.4"
              />
              <path
                d="M86 40c0-6 4-10 9-10s9 4 9 10zM95 40v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.4"
              />
              <path
                d="M36 68c0-6 4-10 9-10s9 4 9 10zM45 68v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.4"
              />
              <path
                d="M86 68c0-6 4-10 9-10s9 4 9 10zM95 68v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.4"
              />
            </pattern>
          </defs>

          <rect width="600" height="800" fill="url(#mcms-rack-grid)" />

          {/* Luồng vi khí hậu & đối lưu không khí */}
          <path
            d="M-20 280 C 120 230, 240 330, 380 270 S 520 210, 640 260"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            opacity="0.3"
          />
          <path
            d="M-20 540 C 140 480, 260 590, 420 510 S 540 460, 640 520"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            opacity="0.25"
          />

          {/* Đường truyền tín hiệu cảm biến IoT */}
          <path
            d="M50 720 C 160 640, 220 560, 310 470 S 480 320, 550 180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="6 8"
            opacity="0.65"
          />
          <circle cx="50" cy="720" r="6" fill="currentColor" opacity="0.9" />
          <circle cx="50" cy="720" r="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <circle cx="310" cy="470" r="6" fill="currentColor" opacity="0.9" />
          <circle cx="310" cy="470" r="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <circle cx="550" cy="180" r="6" fill="currentColor" opacity="0.9" />
          <circle cx="550" cy="180" r="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        </svg>

        <div className="mcms-login-brand-inner">
          <div className="mcms-login-brand-top">
            <span className="mcms-login-brand-mark">
              <img src="/mcms-mark.svg" alt="" width="34" height="34" />
              <strong>MCMS</strong>
            </span>
            <div className="mcms-login-telemetry-chip">
              <span className="mcms-telemetry-pulse" aria-hidden="true" />
              <span>Hệ thống buồng nuôi: <strong>24°C</strong> · <strong>88% RH</strong></span>
            </div>
          </div>

          <div className="mcms-login-brand-copy">
            <p className="mcms-login-brand-eyebrow">Trang trại nấm thông minh</p>
            <h1 className="mcms-login-brand-title">
              Nuôi trồng chuẩn xác,
              <br />
              <em>theo dõi từng khay.</em>
            </h1>
            <p className="mcms-login-brand-desc">
              Nền tảng giám sát IoT chuyên sâu: tự động hoá vi khí hậu buồng nuôi,
              quản lý giống nấm và gói thuê khay trong một hệ thống duy nhất.
            </p>
          </div>

          <ul className="mcms-login-brand-features">
            <li className="mcms-login-brand-feature">
              <RadarChartOutlined aria-hidden="true" />
              <span className="mcms-login-brand-feature-text">
                <strong>Giám sát vi khí hậu 24/7</strong>
                <span>Nhiệt độ, độ ẩm khay, nồng độ CO₂ và ánh sáng theo thời gian thực.</span>
              </span>
            </li>
            <li className="mcms-login-brand-feature">
              <CloudServerOutlined aria-hidden="true" />
              <span className="mcms-login-brand-feature-text">
                <strong>Tự động hoá tưới &amp; điều khiển</strong>
                <span>Đặt ngưỡng môi trường, tưới tự động và cảnh báo tức thời.</span>
              </span>
            </li>
            <li className="mcms-login-brand-feature">
              <LineChartOutlined aria-hidden="true" />
              <span className="mcms-login-brand-feature-text">
                <strong>Quản lý mùa vụ &amp; khay thuê</strong>
                <span>Theo dõi vòng đời sinh trưởng, sản lượng thu hoạch và gói thuê.</span>
              </span>
            </li>
          </ul>
        </div>
      </aside>

      {/* ── Cột phải: Form đăng nhập ────────────────────────────────── */}
      <section className="login-form-panel mcms-login-form-panel" aria-label="Đăng nhập hệ thống">
        <LoginForm onSuccess={handleLoginSuccess} />
      </section>
    </main>
  )
}
