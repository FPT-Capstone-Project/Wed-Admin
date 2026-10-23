/**
 * Authentication DTOs — khớp 100% với Swagger schema.
 *
 * Auth backend dùng JWT (`bearerAuth`) và trả về User có snake_case.
 * Quy ước mapping trong codebase MCMS:
 *   - Giữ nguyên snake_case cho field do backend trả (vd: `user_id`).
 *   - Chuẩn hoá Role về UPPERCASE ('ADMIN' | 'OPERATOR' | 'CUSTOMER')
 *     để đồng bộ với `RoleGuard` và `user.store.ts`.
 */

// ─── POST /api/auth/login ─────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

/** User trả về bởi /api/auth/login (AuthResponse.user) — giữ snake_case. */
export interface BackendUser {
  user_id: number
  role_id: number
  email: string
  full_name: string
  phone: string | null
  address: string | null
  status: 'ACTIVE' | 'INACTIVE' | string
  created_at: string
  updated_at: string
}

/** Wrapper response của POST /api/auth/login */
export interface LoginResponse {
  message: string
  token: string
  user: BackendUser
}

// ─── GET /api/users/me ────────────────────────────────────────────────────

/** Response shape của /api/users/me — bọc User trong object. */
export interface MeResponse {
  user: BackendUser
}

// ─── Chuẩn hoá Role (cho store / RoleGuard) ───────────────────────────────

/**
 * Role mà UI dùng xuyên suốt. Đồng bộ với:
 *   - src/types/user.types.ts: USER_ROLES = ['ADMIN','OPERATOR','CUSTOMER']
 *   - src/routes/RoleGuard.tsx: normalizeRole() map theo cùng role_id
 *
 * Mapping role_id → role (ĐÃ VERIFY thực nghiệm với BE, 2026-10-22):
 *   - role_id === 1 → 'ADMIN'        (Quản trị viên)
 *   - role_id === 2 → 'OPERATOR'     (Vận hành trang trại — farm operator)
 *   - role_id === 3 → 'CUSTOMER'     (Khách thuê khay / user)
 *
 * Bằng chứng (BE `https://backend-75e1.onrender.com`):
 *   - `POST /api/rentals/admin/{id}/cancel` (chỉ Admin) → role_id 1 qua guard
 *     (400 "reason is required"), role_id 2 & 3 → 403.
 *   - `GET  /api/rentals/admin` (Admin + Farm Operator) → role_id 1, 2 → 200,
 *     role_id 3 → 403.
 *
 * ⚠ LƯU Ý: mô tả `roleId` trong Swagger schema `RegisterRequest` đang SAI
 * ("1 = Farm Operator, 2 = Admin") — đã báo BE sửa. Xem
 * `docs/backend-mock-gap-report.md` § "MISMATCH: role_id".
 *
 * Nếu backend sau này trả thẳng `role_name` thì chỉ cần đổi mapper.
 */
export type UserRole = 'ADMIN' | 'OPERATOR' | 'CUSTOMER'

/** UI-friendly User — dùng trong auth.store, RoleGuard, layout. */
export interface User {
  id: number
  email: string
  fullName: string
  phone: string | null
  address: string | null
  role: UserRole
  roleId: number
  status: string
}

export function backendRoleIdToUiRole(roleId: number): UserRole {
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

export function backendUserToUiUser(backend: BackendUser): User {
  return {
    id: backend.user_id,
    email: backend.email,
    fullName: backend.full_name,
    phone: backend.phone,
    address: backend.address,
    roleId: backend.role_id,
    role: backendRoleIdToUiRole(backend.role_id),
    status: backend.status,
  }
}

// ─── Legacy types (FE cũ vẫn dùng cho LoginForm / AuthGuard) ─────────────

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

// ─── POST /api/auth/forgot-password + /api/auth/reset-password-otp ──────

/** Body cho /api/auth/forgot-password — chỉ cần email. */
export interface ForgotPasswordRequest {
  email: string
}

/** Body cho /api/auth/reset-password-otp. */
export interface ResetPasswordRequest {
  email: string
  otp: string
  new_password: string
}

// ─── POST /api/auth/request-change-password-otp ────────────────────────
// ─── PUT  /api/auth/change-password-otp ───────────────────────────────

/**
 * Body cho /api/auth/change-password-otp.
 *
 * Lưu ý: endpoint này KHÔNG cần `email` — user được xác định từ JWT
 * (`bearerAuth`), BE tự gửi OTP về email đăng ký của tài khoản đang đăng nhập.
 */
export interface ChangePasswordOtpRequest {
  otp: string
  new_password: string
}