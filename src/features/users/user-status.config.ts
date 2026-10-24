import type { UserRole, UserStatus } from '../../types/user.types'

/**
 * Nhãn tiếng Việt cho enum của BE.
 *
 * BE KHÔNG có endpoint `/api/roles`, nên danh sách vai trò được khai báo tĩnh ở
 * FE, đồng bộ với seed hiện tại (đã verify 2026-10-22 — xem `types/auth.ts`):
 *   1 = ADMIN, 2 = OPERATOR, 3 = CUSTOMER.
 *
 * ⚠ Swagger mô tả sai ("1 = Farm Operator, 2 = Admin") — đã báo BE sửa.
 */
export interface RoleOption {
  roleId: number
  role: UserRole
  label: string
  description: string
}

export const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    roleId: 1,
    role: 'ADMIN',
    label: 'Quản trị viên',
    description: 'Toàn quyền: tài khoản, vụ thuê, IoT, cấu hình.',
  },
  {
    roleId: 2,
    role: 'OPERATOR',
    label: 'Vận hành trang trại',
    description: 'Vận hành vụ thuê, khay, IoT. Không huỷ vụ thuê.',
  },
  {
    roleId: 3,
    role: 'CUSTOMER',
    label: 'Khách thuê khay',
    description: 'Đặt gói thuê, theo dõi tiến độ canh tác.',
  },
]

/** roleId → option, dùng để map nhanh khi render bảng. */
export const ROLE_OPTION_BY_ID: ReadonlyMap<number, RoleOption> = new Map(
  ROLE_OPTIONS.map((option) => [option.roleId, option]),
)

export function getRoleOption(roleId: number): RoleOption | undefined {
  return ROLE_OPTION_BY_ID.get(roleId)
}

export function getRoleLabel(roleId: number, roleName?: string | null): string {
  return getRoleOption(roleId)?.label ?? roleName ?? `Vai trò #${roleId}`
}

export interface StatusOption {
  color: string
  label: string
}

/** BE chỉ hỗ trợ 3 status: ACTIVE / INACTIVE / BLOCKED. */
export const USER_STATUS_CONFIG: Readonly<
  Record<UserStatus, StatusOption>
> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  INACTIVE: { color: 'default', label: 'Tạm ngưng' },
  BLOCKED: { color: 'error', label: 'Đã khoá' },
}

export const USER_STATUS_OPTIONS = (
  Object.keys(USER_STATUS_CONFIG) as UserStatus[]
).map((status) => ({
  value: status,
  label: USER_STATUS_CONFIG[status].label,
}))

/**
 * Status đích khi bấm nút khoá / mở khoá.
 * - ACTIVE → BLOCKED (chặn đăng nhập)
 * - BLOCKED | INACTIVE → ACTIVE (kích hoạt lại)
 */
export function nextToggleStatus(status: UserStatus): UserStatus {
  return status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
}