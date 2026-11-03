import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { tokenStorage } from './token-storage'
import { extractApiError } from './error'
import { installErrorToast, cancelPendingErrorToast } from './error-toast'
import { normalizeResponse } from './response-adapter'
import {
  reportApiConfigProblem,
  resolveApiConfig,
  type ApiConfigResolution,
} from './api-config'

/**
 * Cấu hình API đã resolve — đọc `import.meta.env` **một lần** cho cả app.
 *
 * ⚠ `import.meta.env` chỉ tồn tại trong bundle Vite ⇒ đọc ở đây (client
 *   layer), còn `api-config.ts` giữ logic thuần để test được.
 */
export const apiConfig: ApiConfigResolution = resolveApiConfig(
  (import.meta.env ?? {}) as unknown as Record<string, unknown>,
)

/**
 * Base URL của axios — xuất từ `api-config.ts` (đã validate).
 *
 * - **Dev**: `''` ⇒ axios gọi `window.location.origin/api/...` ⇒ **Vite proxy**
 *   forward sang backend thật ⇒ không bị CORS.
 * - **Production**: origin của backend (chuẩn hoá bỏ hậu tố `/api` vì các
 *   endpoint đã chứa sẵn `/api/...`).
 *
 * ⚐ Xem `api-config.ts` để hiểu vì sao `VITE_API_BASE_URL` được chuẩn hoá
 *   về origin và vì sao dev KHÔNG dùng nó làm `baseURL`.
 */
export const API_BASE_URL = apiConfig.baseUrl

/**
 * Custom event dispatched khi phiên đăng nhập hết hạn (HTTP 401).
 * `auth.store` sẽ subscribe để clear session + navigate về /login.
 */
export const AUTH_EXPIRED_EVENT = 'mcms:auth-expired'

/**
 * Đánh dấu đã thông báo hết phiên — tránh dispatch lặp khi nhiều request
 * cùng trả 401 (poll nền 5s + 3 request song song).
 */
let hasNotifiedAuthExpired = false

function notifyAuthExpired(error: AxiosError) {
  if (typeof window === 'undefined') return
  if (hasNotifiedAuthExpired) return
  hasNotifiedAuthExpired = true

  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { status: error.response?.status ?? null },
    }),
  )
}

/**
 * Reset cờ "đã thông báo hết phiên" — gọi khi user đăng nhập lại.
 *
 * ⚠ Không có bước này thì sau khi 1 lần 401, mọi 401 về sau đều bị bỏ qua
 *   ⇒ user đăng nhập lại xong thì lần 401 kế tiếp không thoát được nữa.
 */
export function resetAuthExpiredNotice(): void {
  hasNotifiedAuthExpired = false
}

/**
 * Timeout cho mọi request (ms).
 *
 * ⚠ Backend deploy trên Azure (App Service) **ngủ (sleep) khi không có
 * traffic** → request đầu tiên sau khi ngủ phải chờ server "đánh thức"
 * instance, thường mất 30–50s. Timeout 30s khiến request đó bị abort
 * dù server vẫn đang xử lý.
 *
 * → Nâng lên **60s** để chờ đủ cho lần khởi động lạnh. Kết hợp với
 * `retry: 1` của TanStack Query (xem `QueryProvider`), request bị timeout sẽ
 * được thử lại 1 lần — thường lần thứ 2 sẽ nhanh vì backend đã thức.
 */
const API_TIMEOUT_MS = 60_000

/**
 * Axios instance dùng chung cho toàn bộ app.
 *
 * - Tự đính kèm Bearer token vào mọi request (đọc từ `tokenStorage` —
 *   cùng nguồn với Zustand `auth.store`).
 * - Tự clear session + dispatch event khi backend trả 401.
 * - Không retry tự động ở tầng axios — để React Query quản lý retry policy
 *   (`retryApiErrors` ở `QueryProvider`).
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ─── Request interceptor ─────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Bearer token lấy từ `tokenStorage` — cùng nguồn với Zustand
    // `auth.store` (store ghi token vào đây khi đăng nhập, xoá khi logout).
    //
    // ⚠ Đọc **trực tiếp** từ storage thay vì từ Zustand store:
    //   `client.ts` nằm ở tầng thấp, import `auth.store` sẽ tạo vòng lặp
    //   (store → api → store). Storage là nguồn sự thật duy nhất cho token.
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
  (response) => {
    // Request thành công → nếu trước đó có lỗi đang chờ toast (vd lần 1
    // timeout rồi lần retry thành công) thì huỷ toast đó đi.
    cancelPendingErrorToast(response.config)
    return normalizeResponse(response)
  },
  (error: AxiosError) => {
    // 401: token sai / hết hạn →
    //   1. xoá token ở CẢ localStorage lẫn sessionStorage,
    //   2. dispatch `mcms:auth-expired` ⇒ `AdminLayout` clear store + về /login.
    //
    // ⚠ BE **không** có endpoint refresh token (`/api/auth/refresh` không tồn
    //   tại — xem `Backend/src/routes/auth.routes.js`), JWT là access token
    //   thuần. Vì vậy không có luồng refresh ⇒ 401 luôn dẫn tới đăng nhập lại.
    //   `tokenStorage` vẫn hỗ trợ refresh token để sẵn sàng khi BE bổ sung.
    if (error.response?.status === 401) {
      tokenStorage.clear()
      notifyAuthExpired(error)
    }

    // Toast thông báo lỗi từ `message` của BE (tự bỏ qua 401/403/404).
    globalErrorToast(error)

    return Promise.reject(error)
  },
)

/**
 * Validate cấu hình API — gọi **một lần** khi app khởi động.
 *
 * ⚠ Ở production, thiếu `VITE_API_BASE_URL` ⇒ mọi request gọi tới
 *   `window.location.origin` (trang static) ⇒ hỏng hết.
 *   Hàm này in lỗi rõ ràng ra console **trước** khi app render.
 *
 * @returns `true` nếu cấu hình hợp lệ.
 */
export function validateApiConfig(
  config: ApiConfigResolution = apiConfig,
): boolean {
  if (config.isValid) return true

  reportApiConfigProblem(config)
  return false
}

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
