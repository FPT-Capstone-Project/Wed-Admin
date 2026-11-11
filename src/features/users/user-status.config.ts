/**
 * Cấu hình trạng thái tài khoản & vai trò — **re-export từ module trung tâm**.
 *
 * ⚠ File này **giữ nguyên API cũ** (mọi import hiện tại trong codebase vẫn
 *   chạy đúng) nhưng **nguồn sự thật duy nhất** đã chuyển sang
 *   `src/shared/i18n/status/user.ts`.
 */

import type { UserStatus } from '../../types/user.types'
import {
  ROLE_OPTION_BY_ID,
  ROLE_OPTIONS,
  USER_STATUS_LEGACY_CONFIG,
  USER_STATUS_OPTIONS,
  getRoleOption,
  getRoleLabel,
  nextToggleStatus,
  type RoleOption,
} from '../../shared/i18n/status/user'

/**
 * Nhãn tiếng Việt cho enum của BE.
 *
 * ⚠ BE KHÔNG có endpoint `/api/roles`, nên danh sách vai trò được khai báo tĩnh ở
 * FE, đồng bộ với seed hiện tại (đã verify 2026-10-22 — xem `types/auth.ts`):
 *   1 = ADMIN, 2 = OPERATOR, 3 = CUSTOMER.
 *
 * ⚠ Swagger mô tả sai ("1 = Farm Operator, 2 = Admin") — đã báo BE sửa.
 */
export type { RoleOption }

export { ROLE_OPTIONS, ROLE_OPTION_BY_ID, getRoleOption, getRoleLabel }

/** Shape legacy `{ color, label }` — dùng cho `Tag color` của antd. */
export interface StatusOption {
  color: string
  label: string
}

/** BE chỉ hỗ trợ 3 status: ACTIVE / INACTIVE / BLOCKED. */
export const USER_STATUS_CONFIG: Readonly<
  Record<UserStatus, StatusOption>
> = USER_STATUS_LEGACY_CONFIG

export { USER_STATUS_OPTIONS }

/**
 * Status đích khi bấm nút khoá / mở khoá.
 * - ACTIVE → BLOCKED (chặn đăng nhập)
 * - BLOCKED | INACTIVE → ACTIVE (kích hoạt lại)
 */
export { nextToggleStatus }
