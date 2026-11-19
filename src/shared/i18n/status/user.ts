/**
 * Từ điển trạng thái — **người dùng & vai trò** (user).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái tài khoản (`users.status` — 3 giá trị).
 *   - Danh sách vai trò (BE **không** có endpoint `/api/roles` ⇒ khai báo
 *     tĩnh ở FE, đồng bộ với seed hiện tại).
 *
 * ⚠ Mapping `role_id` đã verify thực nghiệm với BE (2026-10-22):
 *   1 = ADMIN, 2 = OPERATOR, 3 = CUSTOMER, 4 = EXPERT.
 *   Swagger mô tả sai ("1 = Farm Operator, 2 = Admin") — đã báo BE sửa.
 */

import type { StatusPresentation } from './types'

/** Vai trò của tài khoản (chuẩn hoá về UPPERCASE ở tầng UI). */
export type UserRoleKey = 'ADMIN' | 'OPERATOR' | 'CUSTOMER' | 'EXPERT'

/** Trạng thái tài khoản (`users.status`). */
export type UserStatusKey = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

/** Một lựa chọn vai trò — dùng cho `Select` lọc & hiển thị. */
export interface RoleOption {
  roleId: number
  role: UserRoleKey
  label: string
  description: string
}

/** Danh sách vai trò (khai báo tĩnh — BE không có endpoint `/api/roles`). */
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
    label: 'Nhân viên vận hành',
    description: 'Vận hành vụ thuê, khay, IoT. Không huỷ vụ thuê.',
  },
  {
    roleId: 3,
    role: 'CUSTOMER',
    label: 'Khách thuê khay',
    description: 'Đặt gói thuê, theo dõi tiến độ canh tác.',
  },
  {
    roleId: 4,
    role: 'EXPERT',
    label: 'Chuyên gia',
    description: 'Tư vấn chẩn đoán và điều trị bệnh nấm.',
  },
]

/** roleId → option, dùng để map nhanh khi render bảng. */
export const ROLE_OPTION_BY_ID: ReadonlyMap<number, RoleOption> = new Map(
  ROLE_OPTIONS.map((option) => [option.roleId, option]),
)

/** Tra cứu option của 1 vai trò theo `role_id`. */
export function getRoleOption(roleId: number): RoleOption | undefined {
  return ROLE_OPTION_BY_ID.get(roleId)
}

/**
 * Chuẩn hoá tên vai trò từ BE về dạng khoá so sánh.
 *
 * ⚠ BE trả `roles.role_name` theo **tên hiển thị**, KHÔNG phải enum:
 *   `Admin` / `Farm Operator` / `Customer` / `Mushroom Expert`
 *   (xem `Backend/database.sql` → bảng `public.roles`).
 *
 *   Nhưng Swagger/API có chỗ trả enum (`ADMIN`, `OPERATOR`, `CUSTOMER`,
 *   `EXPERT`) ⇒ chuẩn hoá cả hai về cùng một dạng: bỏ khoảng trắng, gạch
 *   dưới, gạch ngang và ký tự đặc biệt, rồi viết hoa.
 */
function normalizeRoleKey(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

/**
 * Tên vai trò (tiếng Anh) → enum nội bộ.
 *
 * ⚠ Bao gồm **cả** tên hiển thị của BE lẫn mã enum, để không nơi nào lọt
 *   chuỗi tiếng Anh ra UI khi BE đổi cách đặt tên.
 */
const ROLE_NAME_ALIASES: Readonly<Record<string, UserRoleKey>> = {
  // Admin
  ADMIN: 'ADMIN',
  ADMINISTRATOR: 'ADMIN',
  SUPERADMIN: 'ADMIN',
  // Farm Operator
  OPERATOR: 'OPERATOR',
  FARMOPERATOR: 'OPERATOR',
  FARMMANAGER: 'OPERATOR',
  STAFF: 'OPERATOR',
  // Customer
  CUSTOMER: 'CUSTOMER',
  USER: 'CUSTOMER',
  TENANT: 'CUSTOMER',
  RENTER: 'CUSTOMER',
  // Expert
  EXPERT: 'EXPERT',
  MUSHROOMEXPERT: 'EXPERT',
  MUSHROOMDISEASEEXPERT: 'EXPERT',
}

/**
 * Tra enum của vai trò từ **tên** BE trả về.
 *
 * @returns `undefined` khi tên không khớp vai trò nào đã biết.
 */
export function getRoleKeyByName(
  roleName?: string | null,
): UserRoleKey | undefined {
  const key = normalizeRoleKey(roleName)
  if (!key) return undefined
  return ROLE_NAME_ALIASES[key]
}

/**
 * Nhãn tiếng Việt của vai trò.
 *
 * ⚠ **Không bao giờ** in mã enum tiếng Anh (`ADMIN`, `EXPERT`…) ra UI:
 *   tên từ BE được tra qua registry, tên lạ thì rơi về nhãn theo `role_id`,
 *   cuối cùng là "Vai trò chưa xác định".
 *
 * ⚠ Ưu tiên `role_id` (khoá chuẩn của DB) hơn `role_name` — vì `role_name`
 *   là chuỗi tự do do BE trả và có thể đổi theo thời gian.
 */
export function getRoleLabel(
  roleId: number,
  roleName?: string | null,
): string {
  const byId = getRoleOption(roleId)
  if (byId) return byId.label

  const key = getRoleKeyByName(roleName)
  if (key) return ROLE_OPTIONS.find((option) => option.role === key)?.label ?? 'Vai trò chưa xác định'

  return 'Vai trò chưa xác định'
}

/**
 * Trạng thái tài khoản — dùng tone ngữ nghĩa của design system.
 *
 * ⚠ `INACTIVE` (tạm ngưng) dùng `muted` còn `BLOCKED` (khoá) dùng `danger`
 *   ⇒ phân biệt rõ "tạm dừng" với "bị khoá".
 */
export const USER_STATUS_DICTIONARY: Record<UserStatusKey, StatusPresentation> =
  {
    ACTIVE: { tone: 'ok', label: 'Hoạt động' },
    INACTIVE: { tone: 'muted', label: 'Tạm ngưng' },
    BLOCKED: { tone: 'danger', label: 'Đã khoá' },
  }

/**
 * Trạng thái tài khoản theo **màu preset của antd** — dành cho các chỗ
 * legacy vẫn dùng `Tag color="..."` của antd.
 *
 * ⚠ Màu preset của antd **FAIL WCAG AA** ⇒ chỉ dùng cho `Tag` cũ, mọi
 *   badge mới phải dùng `StatusBadge` + `SemanticTone`.
 */
export const USER_STATUS_ANTD_COLORS: Record<UserStatusKey, string> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  BLOCKED: 'error',
}

/**
 * Trạng thái tài khoản theo **shape legacy** (`{ color, label }`).
 *
 * ⚠ Giữ lại để tương thích ngược với các `Tag color={...}` của antd đang
 *   tồn tại trong codebase. Màu ở đây là **preset của antd**, không phải
 *   tone ngữ nghĩa — dùng `USER_STATUS_DICTIONARY` cho badge mới.
 */
export interface UserStatusLegacyOption {
  color: string
  label: string
}

/** Trạng thái tài khoản — shape legacy `{ color, label }`. */
export const USER_STATUS_LEGACY_CONFIG: Record<
  UserStatusKey,
  UserStatusLegacyOption
> = {
  ACTIVE: { color: USER_STATUS_ANTD_COLORS.ACTIVE, label: 'Hoạt động' },
  INACTIVE: { color: USER_STATUS_ANTD_COLORS.INACTIVE, label: 'Tạm ngưng' },
  BLOCKED: { color: USER_STATUS_ANTD_COLORS.BLOCKED, label: 'Đã khoá' },
}

/**
 * Status đích khi bấm nút khoá / mở khoá.
 * - ACTIVE → BLOCKED (chặn đăng nhập)
 * - BLOCKED | INACTIVE → ACTIVE (kích hoạt lại)
 */
export function nextToggleStatus(status: UserStatusKey): UserStatusKey {
  return status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
}

/**
 * Options cho `Select` lọc theo trạng thái tài khoản.
 *
 * ⚠ Shape `{ value, label }` — tương thích trực tiếp với antd `Select`.
 */
export const USER_STATUS_OPTIONS: Array<{ value: UserStatusKey; label: string }> =
  (Object.keys(USER_STATUS_DICTIONARY) as UserStatusKey[]).map((status) => ({
    value: status,
    label: USER_STATUS_DICTIONARY[status].label,
  }))
