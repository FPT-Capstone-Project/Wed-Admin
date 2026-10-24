/**
 * Users (quản trị tài khoản) — DTOs khớp 100% với Swagger schemas.
 *
 * Nhóm endpoint BE mới:
 *   - GET   /api/users?roleId=            → `{ data: UserWithRole[] }`
 *   - POST  /api/users                    → `201 { data: UserAccountDetail }`
 *   - GET   /api/users/{userId}           → `{ data: UserAccountDetail }`
 *   - PATCH /api/users/{userId}/status    → `{ data: User }`  (User ⊂ UserWithRole)
 *
 * Lưu ý phân quyền: mọi endpoint trên đều yêu cầu **Admin** (role_id 1).
 * `UserRole` được re-export từ `types/auth.ts` để `RoleGuard` và màn hình này
 * dùng chung một nguồn sự thật (không khai báo trùng lặp).
 */
import type { UserRole } from './auth'

export type { UserRole }
export { backendRoleIdToUiRole } from './auth'

export const USER_ROLES = [
  'ADMIN',
  'OPERATOR',
  'CUSTOMER',
] as const satisfies readonly UserRole[]

/** Enum status tài khoản — BE chỉ hỗ trợ 3 giá trị này. */
export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

/** Schema `UserWithRole` — item của GET /api/users. */
export interface UserWithRole {
  user_id: number
  role_id: number
  role_name: string | null
  role_description: string | null
  email: string
  full_name: string
  phone: string | null
  address: string | null
  status: UserStatus
  created_at: string
  updated_at: string
}

/** Schema `UserAccountDetail` — UserWithRole + số đơn / số vụ thuê. */
export interface UserAccountDetail extends UserWithRole {
  order_count: number
  rental_count: number
}

/** Body của POST /api/users. */
export interface CreateManagedUserRequest {
  email: string
  /** Tối thiểu 8 ký tự (BE validate). */
  password: string
  fullName: string
  roleId: number
  phone?: string
  address?: string
}

/** Body của PATCH /api/users/{userId}/status. */
export interface UpdateUserStatusRequest {
  status: UserStatus
}

/** Query của GET /api/users — BE chỉ hỗ trợ lọc theo `roleId`. */
export interface UserListQuery {
  roleId?: number
}