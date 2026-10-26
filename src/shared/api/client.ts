import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { tokenStorage } from './token-storage'
import { extractApiError } from './error'
import { installErrorToast } from './error-toast'
import { normalizeResponse } from './response-adapter'

/**
 * Base URL — đọc từ Vite env `VITE_API_BASE_URL` trong file `.env`.
 *
 * Phân biệt theo mode:
 *   - Dev  : '' → axios dùng window.location.origin (cùng-origin với Vite proxy).
 *            Vite (xem vite.config.ts) sẽ forward /api/* → backend thật → né CORS.
 *   - Prod : **origin** của backend để client gọi thẳng (HTTPS, không CORS).
 *
 * ⚠ `VITE_API_BASE_URL` có thể được khai báo 2 kiểu:
 *     https://backend-75e1.onrender.com        (origin — chuẩn, nên dùng)
 *     https://backend-75e1.onrender.com/api    (kèm hậu tố /api)
 *   Endpoint trong `*.api.ts` đã chứa sẵn `/api/...` và axios cộng chuỗi,
 *   nên giữ hậu tố `/api` sẽ tạo ra `/api/api/users` → 404. Vì vậy hàm này
 *   luôn chuẩn hoá về origin (bỏ dấu `/` cuối và hậu tố `/api`).
 */
function resolveApiBaseUrl(): string {
  // Trong dev: luôn trả '' → axios dùng window.location.origin,
  // request /api/* sẽ được Vite proxy forward sang backend Render (xem vite.config.ts).
  // Lý do dùng DEV làm primary: lệch mode chỉ xảy ra khi build static, lúc đó
  // import.meta.env.VITE_API_BASE_URL trong .env mới là giá trị production thật.
  if (import.meta.env.DEV) return ''

  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
  const cleaned = raw.trim().replace(/\/+$/, '').replace(/\/api$/i, '')

  if (!cleaned) {
    console.warn(
      '[MCMS API] VITE_API_BASE_URL chưa được cấu hình trong production. ' +
        'Mọi request sẽ thất bại. Hãy set biến này qua CI/CD environment.',
    )
  }

  return cleaned
}

export const API_BASE_URL = resolveApiBaseUrl()

/**
 * Custom event dispatched khi phiên đăng nhập hết hạn (HTTP 401).
 * `auth.store` sẽ subscribe để clear session + navigate về /login.
 */
export const AUTH_EXPIRED_EVENT = 'mcms:auth-expired'

function notifyAuthExpired(error: AxiosError) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { status: error.response?.status ?? null },
    }),
  )
}

/**
 * Axios instance dùng chung cho toàn bộ app.
 *
 * - Tự đính kèm Bearer token vào mọi request (đọc từ tokenStorage).
 * - Tự clear session + dispatch event khi backend trả 401.
 * - Không retry tự động — để React Query quản lý retry policy.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ─── Request interceptor ─────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor ────────────────────────────────────────────────
const globalErrorToast = installErrorToast()

apiClient.interceptors.response.use(
  // Bọc data + meta về shape chuẩn (không thay `data` → không phá
  // các `ensureArray()`/`ensureObject()` hiện hữu).
  normalizeResponse,
  (error: AxiosError) => {
    // 401: token sai / hết hạn → clear + phát event
    if (error.response?.status === 401) {
      tokenStorage.clear()
      notifyAuthExpired(error)
    }

    // Toast thông báo lỗi từ `message` của BE (tự bỏ qua 401/403/404).
    globalErrorToast(error)

    return Promise.reject(error)
  },
)

/** Helper: chuẩn hoá error thành Error có message tiếng Việt. */
export async function unwrapApiCall<T>(
  factory: () => Promise<T>,
): Promise<T> {
  try {
    return await factory()
  } catch (cause) {
    const { message } = extractApiError(cause)
    // Giữ `cause` để stack gốc (AxiosError) không bị mất khi debug.
    throw new Error(message, { cause })
  }
}