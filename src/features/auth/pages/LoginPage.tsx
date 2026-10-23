import { useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  const navigate = useNavigate()

  const handleLoginSuccess = () => {
    navigate('/', { replace: true })
  }

  return (
    <main className="login-page">
      {/* Cột trái: ảnh full-bleed + overlay + 1 hook duy nhất */}
      <aside
        className="login-hero"
        aria-label="Trang trại nấm thông minh MCMS"
      >
        <img
          className="login-hero-img"
          src="/auth/hero-mushroom-rows.jpg"
          alt=""
          width="1400"
          height="933"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="login-hero-overlay" aria-hidden="true" />
        <div className="login-hero-content">
          <span className="login-hero-mark" aria-hidden="true">
            <img src="/mcms-mark.svg" alt="" width="32" height="32" />
            <strong>MCMS</strong>
          </span>
          <p className="login-hero-hook">
            Nuôi mùa vụ.
            <br />
            <em>Giữ bình yên cho kệ nấm.</em>
          </p>
        </div>
      </aside>

      {/* Cột phải: form đăng nhập */}
      <section className="login-form-panel" aria-label="Đăng nhập hệ thống">
        <LoginForm onSuccess={handleLoginSuccess} />
      </section>
    </main>
  )
}