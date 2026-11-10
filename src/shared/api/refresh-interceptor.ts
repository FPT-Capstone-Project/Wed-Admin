import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { tokenStorage } from './token-storage'
import {
  AUTH_REFRESH_URL,
  extractTokenPair,
  shouldAttemptRefresh,
  type TokenPair,
} from './token-refresh'

/**
 * Interceptor **tự xoay vòng refresh token** — tách riêng khỏi `client.ts`.
 *
 * ## Vì sao tách riêng?
 *
 * `client.ts` đọc `import.meta.env` ⇒ không import được trong Node test
 * runner. Tách phần interceptor ra đây (chỉ phụ thuộc `axios` + storage)
 * ⇒ có thể test bằng **adapter giả** của axios, không cần backend thật.
 *
 * ## Luồng
 *
 * ```
 * request → 401 → POST /api/auth/refresh (xoay vòng) → retry request gốc
 *                                     ↓ thất bại
 *                          clear storage + báo hết phiên → /login
 * ```
 */

/** Cờ đánh dấu request **đã** được thử refresh 1 lần. */
export interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  /** Đã refresh & retry 1 lần rồi. */
  __isRetried?: boolean
}

/** Timeout cho lệnh refresh (ms). */
const REFRESH_TIMEOUT_MS = 60_000

/**
 * Promise của lần refresh đang chạy — **dùng chung** cho mọi request 401.
 *
 * ⚠ Vì sao cần?
 *   Nhiều request có thể cùng trả 401 (poll nền 5s + 3 request song song).
 *   Nếu mỗi request tự gọi `/api/auth/refresh` ⇒ N request refresh chạy song
 *   song ⇒ BE **xoay vòng** ⇒ mọi request trừ request cuối đều dùng refresh
 *   token đã bị vô hiệu ⇒ phiên chết hẳn.
 *
 *   → Chỉ **một** request refresh chạy; các request 401 khác **chờ** nó.
 */
let refreshPromise: Promise<TokenPair | null> | null = null

/** Hook được gọi sau khi xoay vòng thành công (để store đồng bộ). */
let onTokenRefreshed: ((accessToken: string) => void) | null = null

/**
 * Đăng ký callback được gọi khi access token được xoay vòng.
 *
 * ⚠ Dùng callback (không import `auth.store`) để tránh vòng lặp import:
 *   store → client → store.
 */
export function setTokenRefreshedListener(
  listener: ((accessToken: string) => void) | null,
): void {
  onTokenRefreshed = listener
}

/**
 * Hàm gọi `POST /api/auth/refresh` — **inject được** để test.
 *
 * ⚠ Mặc định dùng **axios thuần** (không qua `apiClient`) ⇒ interceptor 401
 *   của `apiClient` không "bắt" được lỗi 401 của chính endpoint refresh ⇒
 *   không có nguy cơ vòng lặp vô hạn, và không gắn `Authorization` header cũ
 *   (đã hết hạn) lên request refresh.
 */
export type RefreshTransport = (
  baseUrl: string,
  refreshToken: string,
) => Promise<TokenPair | null>

const defaultRefreshTransport: RefreshTransport = async (baseUrl, refreshToken) => {
  try {
    const response = await axios.post(
      `${baseUrl}${AUTH_REFRESH_URL}`,
      { refreshToken },
      {
        timeout: REFRESH_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    return extractTokenPair(response.data)
  } catch {
    // Refresh thất bại (401/400 ⇒ refresh token hết hạn hoặc đã bị dùng).
    return null
  }
}

/** Transport đang dùng — thay được trong test. */
let refreshTransport: RefreshTransport = defaultRefreshTransport

/**
 * Thay transport của lệnh refresh (dùng cho test).
 *
 * @returns Hàm khôi phục transport mặc định.
 */
export function setRefreshTransport(transport: RefreshTransport): () => void {
  const previous = refreshTransport
  refreshTransport = transport
  return () => {
    refreshTransport = previous
  }
}

/**
 * Gọi `POST /api/auth/refresh` để lấy access token mới.
 */
async function requestNewTokens(
  baseUrl: string,
): Promise<TokenPair | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  return refreshTransport(baseUrl, refreshToken)
}

/**
 * Refresh token (xoay vòng) — **mọi request 401 dùng chung** 1 lần gọi BE.
 *
 * @returns Cặp token mới, hoặc `null` nếu refresh thất bại.
 */
export function refreshAccessToken(baseUrl = ''): Promise<TokenPair | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = requestNewTokens(baseUrl)
    .then((pair) => {
      if (!pair) return null

      /*
       * ⚠ **Xoay vòng** ⇒ phải ghi **cả hai** token.
       *   - `accessToken` → bắt buộc mới.
       *   - `refreshToken` → nếu BE trả thì dùng bản mới; nếu BE **không**
       *     trả (chỉ xoay vòng access token) thì **giữ lại** refresh token cũ.
       *
       * Ghi vào **đúng** storage của phiên đang chạy (local vs session) — xem
       * `tokenStorage.getPersistence()`.
       */
      tokenStorage.setTokens(
        pair.accessToken,
        pair.refreshToken ?? tokenStorage.getRefreshToken(),
        tokenStorage.getPersistence(),
      )
      onTokenRefreshed?.(pair.accessToken)
      return pair
    })
    .finally(() => {
      // Cho phép lần 401 kế tiếp thử refresh lại (vd sau khi user đăng nhập lại).
      refreshPromise = null
    })

  return refreshPromise
}

/**
 * Gửi lại request gốc với access token **mới**.
 *
 * ⚠ Cần truyền lại `Authorization` header vì request interceptor đọc token
 *   từ storage ⇒ nếu không ép header, request gốc sẽ đi kèm token **cũ**
 *   (đã hết hạn) ⇒ 401 lần nữa.
 *
 * ⚠ `instance.request(config)` chạy lại **toàn bộ** interceptor chain ⇒
 *   nếu request lại trả 401, interceptor sẽ thấy cờ `__isRetried` ⇒ **không**
 *   refresh lần nữa ⇒ không có vòng lặp vô hạn.
 */
function retryWithFreshToken(
  instance: AxiosInstance,
  originalConfig: RetriableRequestConfig,
): Promise<AxiosResponse> {
  originalConfig.__isRetried = true
  originalConfig.headers = originalConfig.headers ?? {}
  originalConfig.headers.Authorization = `Bearer ${tokenStorage.getAccessToken()}`

  return instance.request(originalConfig)
}

/** Kết quả xử lý 401. */
export type RefreshOutcome =
  /** Refresh OK ⇒ đã retry (hoặc đang retry) request gốc. */
  | { kind: 'retried'; promise: Promise<AxiosResponse> }
  /** Refresh thất bại ⇒ phiên đã chết. */
  | { kind: 'failed' }
  /** Không cần refresh (không phải 401 / endpoint đặc biệt / đã retry). */
  | { kind: 'not-applicable' }

/**
 * Xử lý 401: thử xoay vòng refresh token rồi retry request gốc.
 *
 * ⚠ **Không** clear storage ở đây — việc đó thuộc về `client.ts` (nơi quyết
 *   định chính sách "hết phiên" + dispatch event điều hướng về /login).
 *
 * @returns `not-applicable` nếu request này không nên refresh.
 */
export async function attemptRefreshAndRetry(
  instance: AxiosInstance,
  error: AxiosError,
  baseUrl = '',
): Promise<RefreshOutcome> {
  const config = error.config as RetriableRequestConfig | undefined
  const status = error.response?.status ?? null

  if (
    !config ||
    !shouldAttemptRefresh({
      status,
      url: config.url,
      alreadyRetried: config.__isRetried,
    })
  ) {
    return { kind: 'not-applicable' }
  }

  const pair = await refreshAccessToken(baseUrl)
  if (!pair) return { kind: 'failed' }

  return { kind: 'retried', promise: retryWithFreshToken(instance, config) }
}
