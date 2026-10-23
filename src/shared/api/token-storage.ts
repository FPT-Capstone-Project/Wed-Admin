/**
 * Centralised access to JWT token in localStorage.
 *
 * Token storage key chỉ là "accessToken" đơn giản — không nhét vào cùng
 * session object của Zustand để interceptor có thể đọc TRƯỚC khi store hydrate.
 */
const ACCESS_TOKEN_KEY = 'mcms-access-token'
const REFRESH_TOKEN_KEY = 'mcms-refresh-token'

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(ACCESS_TOKEN_KEY)
    } catch {
      return null
    }
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  },

  setTokens(accessToken: string, refreshToken?: string | null): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      if (refreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      }
    } catch {
      /* storage blocked — bỏ qua, in-memory store vẫn còn */
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
      window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      /* bỏ qua */
    }
  },
}