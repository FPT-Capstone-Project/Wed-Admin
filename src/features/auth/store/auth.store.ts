import { create } from 'zustand'
import { useNotificationStore } from '../../notifications/store/notification.store'
import { authApi } from '../api/auth.api'
import { tokenStorage } from '../../../shared/api/token-storage'
import { resetErrorToastCache } from '../../../shared/api/error-toast'
import { rolePermissionsFor } from '../permissions'
import {
  backendUserToUiUser,
  type LoginRequest,
  type User,
  type UserRole,
} from '../../../types/auth'

const REMEMBERED_EMAIL_KEY = 'mcms-remembered-email'
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
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
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
  if (typeof window === 'undefined') return
  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY)
    }
  } catch {
    /* storage blocked → bỏ qua */
  }
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

function readRememberedEmail(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeRememberedEmail(value: string) {
  if (typeof window === 'undefined') return
  try {
    if (value) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, value)
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    }
  } catch {
    /* storage blocked → bỏ qua */
  }
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

      tokenStorage.setTokens(response.token)
      writeUserCache(user)
      if (rememberMe) {
        writeRememberedEmail(email.trim().toLowerCase())
      } else {
        writeRememberedEmail('')
      }

      set({
        user,
        accessToken: response.token,
        isAuthenticated: true,
        rememberedEmail: rememberMe ? email.trim().toLowerCase() : '',
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
