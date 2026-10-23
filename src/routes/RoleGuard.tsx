import type { ReactNode } from 'react'
import { Result, Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../features/auth/store/auth.store'
import type { UserRole } from '../types/user.types'

interface RoleGuardProps {
  allowedRoles: readonly UserRole[]
  children?: ReactNode
}

/**
 * Chuẩn hóa role từ API response (có thể là string hoặc number).
 *
 * - Nếu `role` là string → toUpperCase() rồi map
 * - Nếu `roleId` là number → map qua backendRoleIdToUiRole()
 *
 * Đảm bảo `RoleGuard` hoạt động DÙ role trả về dạng nào:
 *   'admin', 'ADMIN', 'Admin' → 'ADMIN'
 *   'operator', 'OPERATOR', 'FARM_MANAGER', 'FARM_OPERATOR' → 'OPERATOR'
 *   'customer', 'CUSTOMER' → 'CUSTOMER'
 * Mapping role_id → role (ĐÃ VERIFY thực nghiệm với BE, 2026-10-22):
 *   1 → ADMIN, 2 → OPERATOR, 3 → CUSTOMER
 *   (Swagger mô tả sai "1 = Farm Operator, 2 = Admin" — đã báo BE sửa)
 */
function normalizeRole(role: string | undefined | null, roleId?: number): UserRole | null {
  // Ưu tiên map từ role string (UPPERCASE)
  if (role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'ADMIN'
      case 'OPERATOR':
      case 'FARM_MANAGER':
      case 'FARM_OPERATOR':
        return 'OPERATOR'
      case 'CUSTOMER':
      case 'USER':
        return 'CUSTOMER'
      default:
        break // fallback sang roleId
    }
  }

  // Fallback: map từ roleId number (khớp DB hiện tại)
  if (typeof roleId === 'number') {
    switch (roleId) {
      case 1:
        return 'ADMIN'
      case 2:
        return 'OPERATOR'
      case 3:
      default:
        return 'CUSTOMER'
    }
  }

  return null
}

/**
 * RoleGuard — bảo vệ route theo quyền.
 *
 * CRITICAL FIX: Kiểm tra `isHydrating` TRƯỚC khi redirect.
 * Nếu đang hydrate (re-validate session sau F5), chờ cho đến khi hoàn tất.
 * Tránh redirect sai khi `isAuthenticated` chưa được set đúng.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
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
  const currentRole = normalizeRole(authUser?.role, authUser?.roleId)
  const hasPermission = currentRole
    ? allowedRoles.map((r) => r.toUpperCase()).includes(currentRole)
    : false

  if (!hasPermission) {
    // Không có quyền → về dashboard
    return (
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập trang này."
      />
    )
  }

  return children ?? <Outlet />
}
