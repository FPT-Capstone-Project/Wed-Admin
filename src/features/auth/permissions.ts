/**
 * Hệ thống phân quyền phía FE — mirror của BE.
 *
 * ── Vì sao suy ra từ `roleId` thay vì gọi API? ──────────────────────────
 * `GET /api/auth/me` của BE **không** trả field `permissions` (chỉ trả
 * `{ user: User }`). BE tự check quyền server-side qua bảng
 * `role_permissions` / `permissions` (xem
 * `D:\Backend\src\middlewares\autoMisting.middleware.js`):
 *
 *     SELECT 1 FROM role_permissions rp JOIN permissions p USING(permission_id)
 *      WHERE rp.role_id = $1 AND p.permission_name = 'iot.automation.manage'
 *
 * → Mảng `permissions` bên dưới chỉ phục vụ **UI**: ẩn/disable nút để tránh
 * gọi vào chỗ chắc chắn bị 403. BE vẫn là nguồn quyết định cuối cùng.
 *
 * ⚠ Khi BE bổ sung endpoint trả `permissions`, chỉ cần thay phần body của
 *   `rolePermissionsFor()` bằng `user.permissions` — phần còn lại giữ nguyên.
 */

// ─── Danh sách quyền ─────────────────────────────────────────────────────

export const IOT_AUTOMATION_MANAGE = 'iot.automation.manage'
export const USER_MANAGE = 'user.manage'
export const RENTAL_MANAGE = 'rental.manage'
export const RENTAL_CANCEL = 'rental.cancel'
export const CAMERA_VIEW = 'camera.view'
export const CAMERA_MANAGE = 'camera.manage'

/** Tất cả quyền FE biết — dùng cho test/assert. */
export const ALL_PERMISSIONS = [
  IOT_AUTOMATION_MANAGE,
  USER_MANAGE,
  RENTAL_MANAGE,
  RENTAL_CANCEL,
  CAMERA_VIEW,
  CAMERA_MANAGE,
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]

// ─── Mapping role → quyền ─────────────────────────────────────────────────

/**
 * Quyền theo role (đã verify với BE, 2026-10-22 — xem `types/auth.ts`):
 *   role_id 1 = ADMIN, 2 = OPERATOR (Farm Operator), 3 = CUSTOMER.
 *
 * Bảng dưới suy ra từ chính middleware của BE:
 *   - `/api/users/*`        → `authorizeRoles(1)`          → Admin
 *   - `/api/rentals/admin`  → `authorizeRoles(1, 2)`, trừ `/cancel` → Admin
 *   - `/api/cameras/*`      → `authorizeRoles(1, 2)`, CRUD + stop → Admin
 *   - `/api/iot/floors/*`   → `manageAutomation` (role_permissions)
 */
const ROLE_PERMISSIONS: Readonly<Record<number, readonly Permission[]>> = {
  1: [
    IOT_AUTOMATION_MANAGE,
    USER_MANAGE,
    RENTAL_MANAGE,
    RENTAL_CANCEL,
    CAMERA_VIEW,
    CAMERA_MANAGE,
  ],
  // Farm Operator: vận hành vụ thuê + xem camera, nhưng KHÔNG huỷ vụ thuê,
  // KHÔNG quản lý camera, KHÔNG quản lý tài khoản.
  2: [RENTAL_MANAGE, CAMERA_VIEW],
  3: [],
}

/** Quyền của một `roleId` (mảng rỗng nếu role lạ). */
export function rolePermissionsFor(
  roleId: number | null | undefined,
): readonly Permission[] {
  if (typeof roleId !== 'number') return []
  return ROLE_PERMISSIONS[roleId] ?? []
}

/** Kiểm tra một quyền cụ thể. */
export function hasPermission(
  roleId: number | null | undefined,
  permission: Permission,
): boolean {
  return rolePermissionsFor(roleId).includes(permission)
}