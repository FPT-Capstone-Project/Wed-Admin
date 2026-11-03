/**
 * Hệ thống phân quyền phía FE — mirror của BE.
 *
 * ── Vì sao suy ra từ `roleId` thay vì gọi API? ──────────────────────────
 * `GET /api/auth/me` của BE **không** trả field `permissions` (chỉ trả
 * `{ user: User }`). BE tự check quyền server-side qua bảng
 * `role_permissions` / `permissions`.
 *
 * → Mảng `permissions` bên dưới chỉ phục vụ **UI**: ẩn/disable nút để tránh
 *   gọi vào chỗ chắc chắn bị 403. BE vẫn là nguồn quyết định cuối cùng.
 *
 * ⚠ Giai đoạn 1 + 5 (read-only): các quyền `rental.manage` /
 *   `rental.cancel` đã bị gỡ vì luồng "vụ thuê" không còn tồn tại — thay
 *   bằng `session.view` (quyền ĐỌC phiên canh tác).
 *
 * Web Admin quản trị tài nguyên và điều phối bệnh học; nghiệp vụ hiện trường: không tạo/sửa/xoá phiên, không
 *   ghi tiến độ, không tạo kiểm tra phôi, không nhập thu hoạch, không chuyển
 *   giai đoạn, không gửi thông báo. Mọi thao tác đó do **nhân viên (staff)**
 *   thực hiện trên app — BE kiểm tra server-side.
 */

// ─── Danh sách quyền ─────────────────────────────────────────────────────

export const IOT_AUTOMATION_MANAGE = 'iot.automation.manage'
export const USER_MANAGE = 'user.manage'
/** Quyền ĐỌC phiên canh tác (`GET /api/farm/sessions`). */
export const SESSION_VIEW = 'session.view'
/** Alias giữ tên gọi "xem & quản lý phiên" cho Admin. */
export const SESSION_MANAGE = SESSION_VIEW
export const CAMERA_VIEW = 'camera.view'
export const CAMERA_MANAGE = 'camera.manage'

/** Tất cả quyền FE biết — dùng cho test/assert. */
export const ALL_PERMISSIONS = [
  IOT_AUTOMATION_MANAGE,
  USER_MANAGE,
  SESSION_VIEW,
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
 *   - `/api/users/*`                 → `authorizeRoles(1)`          → Admin
 *   - `/api/cultivation-sessions/*`  → `authorizeRoles(1, 2)`       → Admin + Operator
 *   - `/api/farm/sessions*`          → `authorizeRoles(1, 2)`       → Admin + Operator
 *   - `/api/cameras/*`               → `authorizeRoles(1, 2)`, CRUD → Admin
 *   - `/api/iot/floors/*`            → `manageAutomation` (role_permissions)
 */
const ROLE_PERMISSIONS: Readonly<Record<number, readonly Permission[]>> = {
  1: [
    IOT_AUTOMATION_MANAGE,
    USER_MANAGE,
    SESSION_VIEW,
    CAMERA_VIEW,
    CAMERA_MANAGE,
  ],
  // Farm Operator: xem phiên canh tác + xem camera, nhưng KHÔNG quản lý
  // camera, KHÔNG quản lý tài khoản, KHÔNG cấu hình tự động hoá.
  2: [SESSION_VIEW, CAMERA_VIEW],
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
