import { type ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../features/auth/store/auth.store'

interface AuthGuardProps {
  children: ReactNode
}

/**
 * Chặn truy cập khi chưa đăng nhập.
 *
 * - Nếu có token trong localStorage → thử `hydrate()` (gọi /api/users/me).
 *   Trong lúc hydrate, hiển thị fallback nhẹ để tránh flash redirect.
 * - Nếu KHÔNG có token → redirect thẳng về /login.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)
  const isHydrating = useAuthStore((state) => state.isHydrating)
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    if (accessToken && !isAuthenticated && !isHydrating) {
      void hydrate()
    }
  }, [accessToken, isAuthenticated, isHydrating, hydrate])

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAuthenticated) {
    // Đang re-validate session sau F5.
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: '60vh',
          color: '#64748b',
        }}
      >
        Đang xác thực phiên đăng nhập…
      </div>
    )
  }

  return children
}