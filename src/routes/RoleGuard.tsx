import type { ReactNode } from 'react'
import { Result, Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../features/auth/store/auth.store'
import {
  isRoleAllowed,
  resolveUserRole,
} from './access-policy'
import type { UserRole } from '../types/user.types'

interface RoleGuardProps {
  /** Danh sách role được phép truy cập route. */
  allowedRoles: readonly UserRole[]
  children?: ReactNode
  /**
   * Hành vi khi user **không đủ quyền**:
   *
   * - `'redirect'` (mặc định): chuyển hướng tới `/unauthorized` kèm URL gốc
   *   ⇒ URL rõ ràng, có nút quay lại dashboard, không giữ lại URL bị chặn.
   * - `'inline'`: render `<Result status="403">` ngay tại chỗ.
   *
   * ⚠ Dùng `'inline'` cho **route cha** (`/`): route cha đã chặn CUSTOMER,
   *   nếu chuyển hướng tới `/unauthorized` (nằm trong route cha) thì CUSTOMER
   *   bị chặn lần nữa ⇒ **vòng lặp redirect vô hạn**.
   */
  unauthorizedBehavior?: 'redirect' | 'inline'
}

/**
 * RoleGuard — bảo vệ route theo quyền.
 *
 * ## Luồng
 *   1. Chưa đăng nhập / đang hydrate → chờ (không redirect sai).
 *   2. Đã đăng nhập nhưng **không đủ quyền**:
 *      - route con → chuyển hướng `/unauthorized` (kèm URL gốc trong
 *        `location.state.from`),
 *      - route cha → render 403 tại chỗ (tránh vòng lặp).
 *   3. Đủ quyền → render `children` (hoặc `<Outlet>` cho route lồng nhau).
 *
 * CRITICAL FIX: Kiểm tra `isHydrating` TRƯỚC khi redirect.
 * Nếu đang hydrate (re-validate session sau F5), chờ cho đến khi hoàn tất.
 * Tránh redirect sai khi `isAuthenticated` chưa được set đúng.
 */
export function RoleGuard({
  allowedRoles,
  children,
  unauthorizedBehavior = 'redirect',
}: RoleGuardProps) {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrating = useAuthStore((state) => state.isHydrating)
  const authUser = useAuthStore((state) => state.user)

  // ── Chưa login hoặc đang hydrate → chờ ──────────────────────────────
  if (!isAuthenticated || isHydrating) {
    if (isHydrating) {
      // AuthGuard đang hydrate session, hiển thị loading nhẹ
      return (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: '40vh',
            color: '#64748b',
          }}
        >
          <Spin description="Đang xác thực phiên đăng nhập…" size="large" />
        </div>
      )
    }

    // Không có token → redirect về login
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // ── Đã authenticate → kiểm tra role ─────────────────────────────────
  const currentRole = resolveUserRole(authUser)
  const hasPermission = isRoleAllowed(allowedRoles, currentRole)

  if (!hasPermission) {
    if (unauthorizedBehavior === 'inline') {
      // Route cha — render 403 tại chỗ, KHÔNG redirect (tránh vòng lặp).
      return (
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập khu vực quản trị này."
        />
      )
    }

    // Route con → về trang 403 chuyên dụng (kèm URL gốc để hiển thị).
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          from: location.pathname,
          requiredRoles: allowedRoles,
          currentRole,
        }}
      />
    )
  }

  return children ?? <Outlet />
}
