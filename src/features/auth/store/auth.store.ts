import { create } from 'zustand'
import { useNotificationStore } from '../../notifications/store/notification.store'
import { authApi } from '../api/auth.api'
import { tokenStorage } from '../../../shared/api/token-storage'
import {
  readKey,
  removeKeyEverywhere,
  writeKey,
} from '../../../shared/api/persistence'
import { resetErrorToastCache } from '../../../shared/api/error-toast'
import { rolePermissionsFor } from '../permissions'
import {
  backendUserToUiUser,
  type LoginRequest,
  type User,
  type UserRole,
} from '../../../types/auth'

/**
 * Key lưu email "ghi nhớ đăng nhập" trong `localStorage`.
 *
 * ⚠ Tên key theo đúng yêu cầu nghiệp vụ: `saved_email`.
 *
 * ⚠ Email luôn nằm ở `localStorage` (KHÔNG phụ thuộc checkbox) — mục đích
 * của nó chỉ là "tiện cho user không phải gõ lại email", không liên quan
 * tới vòng đời phiên đăng nhập. Còn token thì đổi nơi lưu theo checkbox
 * (xem `tokenStorage`).
 *
 * (Key cũ `mcms-remembered-email` vẫn được đọc 1 lần để tương thích với
 * phiên đã dùng trước khi deploy bản này — xem `readRememberedEmail`.)
 */
const REMEMBERED_EMAIL_KEY = 'saved_email'

/** Key cũ — chỉ đọc để migrate, không ghi mới. */
const LEGACY_REMEMBERED_EMAIL_KEY = 'mcms-remembered-email'

/**
 * Key cache user trong `localStorage`.
 *
 * ⚠ Cache user KHÔNG chứa token — token nằm riêng ở `tokenStorage` (có thể
 * ở `sessionStorage` tuỳ checkbox). Vì vậy cache user vẫn ở `localStorage`
 * bất kể chế độ phiên: nó chỉ là dữ liệu hiển thị, không phải xác thực.
 */
const USER_CACHE_KEY = 'mcms-user-cache'

/**
 * Đọc user từ cache localStorage.
 *
 * ⚠ Cache có thể được ghi bởi phiên bản code CŨ (trước khi `permissions`
 * được thêm vào `User`) → JSON trong cache **không có** key `permissions`.
 * Nếu trả nguyên cache, `useHasPermission()` đọc `undefined` → mọi nút
 * gated theo quyền sẽ biến mất (vd "Gửi thông báo", "Huỷ vụ thuê") dù
 * user đăng nhập đúng role.
 *
 * → Luôn suy ra lại `permissions` từ `roleId` (nguồn sự thật duy nhất) khi
 *   cache thiếu field. `roleId` đã có mặt trong cache từ trước nên việc này
 *   hoạt động với cả cache cũ lẫn cache mới.
 */
function readUserCache(): User | null {
  const raw = readKey(USER_CACHE_KEY, 'local')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<User> | null
    if (!parsed || typeof parsed !== 'object') return null

    // Cache cũ: thiếu `permissions` → suy ra từ `roleId`.
    if (!Array.isArray(parsed.permissions)) {
      return {
        ...(parsed as User),
        permissions: [...rolePermissionsFor(parsed.roleId)],
      }
    }

    return parsed as User
  } catch {
    return null
  }
}

function writeUserCache(user: User | null) {
  writeKey(USER_CACHE_KEY, user ? JSON.stringify(user) : null, 'local')
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isHydrating: boolean
  rememberedEmail: string
  /** Lỗi cuối cùng để component có thể reset sau khi hiển thị. */
  lastError: string | null

  login: (credentials: LoginRequest & { rememberMe?: boolean }) => Promise<void>
  logout: () => void
  /**
   * Gọi `/api/users/me` để xác thực lại session sau khi F5.
   * - Trả về `true` nếu còn phiên hợp lệ.
   * - Trả về `false` nếu token sai/hết hạn (đã được interceptor clear).
   */
  hydrate: () => Promise<boolean>
  clearError: () => void
}

/**
 * Đọc email đã "ghi nhớ" từ `localStorage`.
 *
 * Ưu tiên key chuẩn `saved_email`; fallback key cũ `mcms-remembered-email`
 * để user đang đăng nhập không bị mất email đã lưu sau khi deploy.
 */
function readRememberedEmail(): string {
  return (
    readKey(REMEMBERED_EMAIL_KEY, 'local') ??
    readKey(LEGACY_REMEMBERED_EMAIL_KEY, 'local') ??
    ''
  )
}

/**
 * Ghi (hoặc xoá) email "ghi nhớ" trong `localStorage`.
 *
 * - Có giá trị → lưu vào `saved_email`.
 * - Rỗng → xoá `saved_email` (đồng thời dọn key cũ cho sạch).
 */
function writeRememberedEmail(value: string) {
  writeKey(REMEMBERED_EMAIL_KEY, value || null, 'local')
  // Dọn key cũ sau khi đã migrate sang key mới.
  removeKeyEverywhere(LEGACY_REMEMBERED_EMAIL_KEY)
}

/**
 * Đảm bảo user.role luôn là UPPERCASE UserRole.
 * Phòng trường hợp backend trả string role ('admin') thay vì role_id.
 */
function ensureUpperCaseRole(user: User): User {
  return {
    ...user,
    role: (user.role?.toUpperCase() ?? 'CUSTOMER') as UserRole,
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const cachedToken = tokenStorage.getAccessToken()
  const cachedUser = readUserCache()
  return {
    user: cachedToken ? cachedUser : null,
    accessToken: cachedToken,
    isAuthenticated: Boolean(cachedToken),
    isHydrating: false,
    rememberedEmail: readRememberedEmail(),
    lastError: null,

    login: async ({ email, password, rememberMe = false }) => {
    set({ lastError: null })
    try {
      const response = await authApi.login({ email, password })
      if (!response) {
        throw new Error('Đăng nhập thất bại. Vui lòng thử lại.')
      }

      // Chuẩn hóa role về UPPERCASE để RoleGuard so sánh chính xác
      const user = ensureUpperCaseRole(backendUserToUiUser(response.user))

      // ── Yêu cầu B: chọn nơi lưu token theo checkbox ──────────────────
      //   - có tích "Ghi nhớ đăng nhập" → `localStorage` → tồn tại qua
      //     lần tắt trình duyệt.
      //   - không tích                  → `sessionStorage` → mất khi đóng tab.
      tokenStorage.setTokens(
        response.token,
        null,
        rememberMe ? 'local' : 'session',
      )
      writeUserCache(user)

      // ── Yêu cầu A: lưu (hoặc xoá) email đã ghi nhớ ───────────────────
      const normalizedEmail = email.trim().toLowerCase()
      writeRememberedEmail(rememberMe ? normalizedEmail : '')

      set({
        user,
        accessToken: response.token,
        isAuthenticated: true,
        rememberedEmail: rememberMe ? normalizedEmail : '',
      })
    } catch (cause) {
      const text =
        cause instanceof Error
          ? cause.message
          : 'Đăng nhập thất bại. Vui lòng thử lại.'
      set({ lastError: text })
      // Giữ `cause` để giữ nguyên stack gốc khi debug ở Error Boundary.
      throw new Error(text, { cause })
    }
  },

  logout: () => {
    tokenStorage.clear()
    writeUserCache(null)
    // Badge thông báo thuộc về user trước → phải xoá, nếu không user sau
    // sẽ thấy số chưa đọc của người khác.
    useNotificationStore.getState().reset()
    resetErrorToastCache()
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      lastError: null,
    })
  },

  hydrate: async () => {
    const token = tokenStorage.getAccessToken()
    if (!token) {
      writeUserCache(null)
      set({ isAuthenticated: false, user: null })
      return false
    }

    set({ isHydrating: true })
    try {
      const response = await authApi.me()
      if (!response) {
        writeUserCache(null)
        set({ isAuthenticated: false, user: null, isHydrating: false })
        return false
      }

      // Chuẩn hóa role về UPPERCASE để RoleGuard so sánh chính xác
      const user = ensureUpperCaseRole(backendUserToUiUser(response.user))
      writeUserCache(user)
      set({
        user,
        isAuthenticated: true,
        accessToken: token,
        isHydrating: false,
      })
      return true
    } catch {
      // Interceptor đã clear token + dispatch event rồi.
      writeUserCache(null)
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isHydrating: false,
      })
      return false
    }
  },

  clearError: () => set({ lastError: null }),
  }
})

// Selector tiện ích cho component không muốn subscribe to:
export const selectIsAuthenticated = (state: AuthState) =>
  state.isAuthenticated
export const selectCurrentUser = (state: AuthState) => state.user
