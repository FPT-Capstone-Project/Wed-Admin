import { useMemo } from 'react'
import { useAuthStore } from '../store/auth.store'
import {
  hasPermission as checkPermission,
  rolePermissionsFor,
  type Permission,
} from '../permissions'

/**
 * Hook phân quyền cho UI.
 *
 * Dùng thay vì so sánh `roleId === 1` rải rác khắp component:
 *
 * ```tsx
 * const canManageUsers = useHasPermission(USER_MANAGE)
 * return <Button disabled={!canManageUsers}>…</Button>
 * ```
 *
 * ⚠ Đây chỉ là **UI affordance** — không phải bảo mật. BE vẫn kiểm tra quyền
 * ở mọi endpoint; nếu gọi endpoint không đủ quyền, BE trả 403 và
 * `getApiErrorMessage()` hiển thị thông báo tương ứng.
 */
export function useHasPermission(permission: Permission): boolean {
  const permissions = useAuthStore((state) => state.user?.permissions)

  return useMemo(
    () => permissions?.includes(permission) ?? false,
    [permission, permissions],
  )
}

/**
 * Hook trả về hàm kiểm tra quyền theo tham số động.
 *
 * Dùng khi permission không đổi theo render:
 * ```tsx
 * const can = usePermissionChecker()
 * if (can(RENTAL_CANCEL)) { … }
 * ```
 */
export function usePermissionChecker(): (permission: Permission) => boolean {
  const permissions = useAuthStore((state) => state.user?.permissions)

  return useMemo(() => {
    const list = permissions ?? []
    return (permission: Permission) => list.includes(permission)
  }, [permissions])
}

/**
 * Toàn bộ quyền của tài khoản đang đăng nhập (mảng rỗng nếu chưa đăng nhập).
 */
export function useCurrentPermissions(): readonly Permission[] {
  const permissions = useAuthStore((state) => state.user?.permissions)
  return useMemo(() => permissions ?? [], [permissions])
}

/**
 * Phân quyền dựa trên `roleId` — dùng khi chưa có user trong store
 * (ví dụ màn hình public) hoặc cần kiểm tra role của user khác.
 */
export function useRolePermission(): (roleId: number | null | undefined) => {
  can: (permission: Permission) => boolean
  permissions: readonly Permission[]
} {
  return useMemo(
    () => (roleId: number | null | undefined) => ({
      can: (permission: Permission) => checkPermission(roleId, permission),
      permissions: rolePermissionsFor(roleId),
    }),
    [],
  )
}