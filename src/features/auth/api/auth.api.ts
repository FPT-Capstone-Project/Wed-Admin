import { apiClient } from '../../../shared/api/client'
import { ensureObject } from '../../../shared/api/response-normalizer'
import type {
  ChangePasswordOtpRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshRequest,
  RefreshResponse,
  ResetPasswordRequest,
} from '../../../types/auth'

/**
 * Authentication endpoints.
 *
 * Web admin KHÔNG có đăng ký: tài khoản được cấp bởi quản trị viên (BE tạo
 * ADMIN/OPERATOR), nên không expose `register*` ở đây.
 *
 * - `login()` không yêu cầu token.
 * - `me()` yêu cầu token → nếu thiếu/hết hạn → 401 → interceptor clear token + dispatch event.
 * - `forgot/reset*()` không yêu cầu token (public).
 * - `requestChangePasswordOtp()` / `changePasswordOtp()` yêu cầu token
 *   (`bearerAuth`) — dành cho user đang đăng nhập muốn đổi mật khẩu.
 */
export const authApi = {
  /** POST /api/auth/login */
  async login(payload: LoginRequest): Promise<LoginResponse | null> {
    const response = await apiClient.post<unknown>(
      '/api/auth/login',
      payload,
    )
    return ensureObject<LoginResponse>(response.data)
  },

  /**
   * POST /api/auth/refresh — **xoay vòng** refresh token.
   *
   * ⚠ BE trả access token mới **và** refresh token mới (rotation) ⇒ refresh
   *   token cũ bị vô hiệu sau lần dùng đầu tiên. Vì vậy phải lưu **cả hai**
   *   token mới, không giữ refresh token cũ.
   *
   * ⚠ Endpoint này **không** được đi qua interceptor refresh (tránh vòng lặp
   *   vô hạn) — xem `client.ts`.
   */
  async refresh(payload: RefreshRequest): Promise<RefreshResponse | null> {
    const response = await apiClient.post<unknown>(
      '/api/auth/refresh',
      payload,
    )
    return ensureObject<RefreshResponse>(response.data)
  },

  /**
   * POST /api/auth/logout — thu hồi cả họ refresh token của phiên hiện tại.
   *
   * ⚠ **Best-effort**: lỗi không được ném ra — logout ở FE vẫn phải xoá token
   *   cục bộ dù BE lỗi (mạng chết, refresh token đã hết hạn…).
   *
   * ⚠ `accessToken` được truyền **tường minh** vì store xoá storage ngay
   *   sau khi gọi ⇒ request interceptor sẽ không còn tìm thấy token để gắn
   *   `Authorization` header.
   */
  async logout(payload: {
    refreshToken: string
    accessToken?: string | null
  }): Promise<void> {
    await apiClient.post<unknown>('/api/auth/logout', { refreshToken: payload.refreshToken }, {
      headers: payload.accessToken
        ? { Authorization: `Bearer ${payload.accessToken}` }
        : undefined,
    })
  },

  /** GET /api/users/me */
  async me(): Promise<MeResponse | null> {
    const response = await apiClient.get<unknown>('/api/users/me')
    return ensureObject<MeResponse>(response.data)
  },

  /**
   * POST /api/auth/forgot-password — gửi OTP reset mật khẩu.
   * BE luôn trả `200` (generic) kể cả email không tồn tại, chống user enumeration.
   */
  async forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    await apiClient.post<unknown>('/api/auth/forgot-password', payload)
  },

  /**
   * POST /api/auth/reset-password-otp — đặt lại mật khẩu bằng OTP.
   * Trả `200` khi đổi thành công.
   */
  async resetPassword(payload: ResetPasswordRequest): Promise<void> {
    await apiClient.post<unknown>(
      '/api/auth/reset-password-otp',
      payload,
    )
  },

  /**
   * POST /api/auth/request-change-password-otp — gửi OTP để đổi mật khẩu.
   *
   * Yêu cầu token (`bearerAuth`). Endpoint không có body — BE tự gửi OTP về
   * email đã đăng ký của user đang đăng nhập.
   *
   * BE trả `200` khi gửi OTP thành công, `429` khi vượt cooldown/rate limit.
   */
  async requestChangePasswordOtp(): Promise<void> {
    await apiClient.post<unknown>('/api/auth/request-change-password-otp')
  },

  /**
   * PUT /api/auth/change-password-otp — đổi mật khẩu bằng OTP.
   *
   * Yêu cầu token (`bearerAuth`). Không cần `email` vì user được suy ra từ JWT.
   * Trả `200` khi đổi thành công, `400` khi OTP sai, `401` khi token hết hạn.
   */
  async changePasswordOtp(payload: ChangePasswordOtpRequest): Promise<void> {
    await apiClient.put<unknown>(
      '/api/auth/change-password-otp',
      payload,
    )
  },
}
