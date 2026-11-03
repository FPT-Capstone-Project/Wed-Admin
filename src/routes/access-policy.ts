/**
 * Chính sách phân quyền route + menu — **nguồn sự thật duy nhất**.
 *
 * ⚠ Vì sao cần module riêng?
 *   `router/index.tsx` và `AdminLayout` (sidebar) đều cần biết "route nào
 *   dành cho ADMIN, route nào cho phép OPERATOR". Nếu hai chỗ tự khai báo
 *   riêng → dễ lệch nhau (ví dụ sidebar cho OPERATOR thấy mục "Tài khoản"
 *   nhưng click vào lại bị 403).
 *   → Toàn bộ khai báo nằm ở đây, cả hai bên cùng import.
 *
 * ## Mapping role (đã verify với BE, 2026-10-22)
 *   - `role_id` 1 → `ADMIN`    (Quản trị viên)
 *   - `role_id` 2 → `OPERATOR` (Vận hành trang trại — Farm Operator)
 *   - `role_id` 3 → `CUSTOMER` (khách thuê khay — không dùng web admin)
 *
 * ## Đối chiếu với BE
 *   - `/api/users/*`             → `authorizeRoles(1)`          → ADMIN
 *   - `/api/cameras` (list)      → `authorizeRoles(1)`          → ADMIN
 *   - `/api/farm/sessions*`      → `authorizeRoles(1, 2)`       → ADMIN + OPERATOR
 *   - `/api/cultivation-sessions/*` → `authorizeRoles(1, 2)`     → ADMIN + OPERATOR
 *   - `/api/harvests/*`          → `authorizeRoles(1, 2)`       → ADMIN + OPERATOR
 *   - `/api/iot/*` (đọc)         → `authenticate`               → ADMIN + OPERATOR
 */
import type { UserRole } from '../types/user.types'

/** Chỉ Quản trị viên. */
export const ADMIN_ONLY: readonly UserRole[] = ['ADMIN']

/** Quản trị viên + Vận hành trang trại (Farm Operator). */
export const ADMIN_AND_OPERATOR: readonly UserRole[] = ['ADMIN', 'OPERATOR']

/**
 * Nhãn hiển thị cho từng vai trò — dùng ở header & trang 403.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  OPERATOR: 'Vận hành trang trại',
  CUSTOMER: 'Khách hàng',
}

/**
 * Chuẩn hoá role từ API response (có thể là string hoặc number).
 *
 * - Nếu `role` là string → toUpperCase() rồi map
 * - Nếu `roleId` là number → map qua `roleId` (nguồn sự thật của BE)
 *
 * Đảm bảo guard hoạt động DÙ role trả về dạng nào:
 *   'admin', 'ADMIN', 'Admin' → 'ADMIN'
 *   'operator', 'OPERATOR', 'FARM_MANAGER', 'FARM_OPERATOR' → 'OPERATOR'
 *   'customer', 'CUSTOMER' → 'CUSTOMER'
 */
export function normalizeRole(
  role: string | undefined | null,
  roleId?: number,
): UserRole | null {
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

/** Role của user trong auth store (Zustand) — `null` khi chưa đăng nhập. */
export function resolveUserRole(
  user:
    | { role?: string | null; roleId?: number | null }
    | null
    | undefined,
): UserRole | null {
  if (!user) return null
  return normalizeRole(user.role ?? undefined, user.roleId ?? undefined)
}

/** `true` khi role nằm trong danh sách được phép. */
export function isRoleAllowed(
  allowedRoles: readonly UserRole[],
  role: UserRole | null,
): boolean {
  if (!role) return false
  return allowedRoles.map((r) => r.toUpperCase()).includes(role)
}
