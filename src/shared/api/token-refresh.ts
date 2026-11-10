/**
 * Logic thuần cho luồng **xoay vòng refresh token** (`POST /api/auth/refresh`).
 *
 * ## Vì sao tách module riêng?
 *
 * `client.ts` cài interceptor axios — phụ thuộc `import.meta.env` và axios ⇒
 * **không test được** bằng Node test runner. Mọi quyết định "có refresh
 * không?", "lấy token ở field nào?" được đặt ở đây (logic thuần) ⇒ test
 * được & không tạo vòng lặp import với `auth.store`.
 *
 * ## Vì sao cần refresh token?
 *
 * Access token (JWT) hết hạn thì mọi request trả 401. Nếu không có refresh
 * token, user phải đăng nhập lại. BE mới bổ sung `POST /api/auth/refresh`
 * (xem `src/types/api-schema.d.ts`) — BE **xoay vòng** (rotation): trả về
 * cả access token mới **và** refresh token mới, refresh token cũ bị vô hiệu.
 */

/** Endpoint xoay vòng refresh token của BE. */
export const AUTH_REFRESH_URL = '/api/auth/refresh'

/** Endpoint đăng nhập — 401 ở đây = **sai thông tin**, KHÔNG phải hết phiên. */
export const AUTH_LOGIN_URL = '/api/auth/login'

/**
 * Cặp token sau khi refresh.
 *
 * ⚠ `refreshToken` có thể `null` — BE có thể chỉ trả access token mới (không
 *   xoay vòng refresh token) ⇒ khi đó phải **giữ lại** refresh token cũ.
 */
export interface TokenPair {
  accessToken: string
  refreshToken: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Bóc body thật của response — hỗ trợ wrapper `{ data: {...} }`.
 *
 * ⚠ BE trả không nhất quán: `/api/auth/login` trả object trực tiếp, một số
 *   endpoint trả `{ data: {...} }` ⇒ phải bóc 1 cấp.
 */
function unwrap(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null
  const inner = payload.data
  return isRecord(inner) ? inner : payload
}

/**
 * Lấy access token từ body response.
 *
 * ⚠ Hỗ trợ **cả 2 shape**:
 *   - BE mới: `{ accessToken, refreshToken }` (khớp `AuthResponse` trong
 *     `api-schema.d.ts`).
 *   - BE cũ: `{ token }` (JWT thuần, xem `Backend/src/services/auth.service.js`).
 */
export function extractAccessToken(payload: unknown): string | null {
  const body = unwrap(payload)
  if (!body) return null
  return readString(body, 'accessToken') ?? readString(body, 'token')
}

/** Lấy refresh token từ body response (`null` nếu BE không trả / không xoay vòng). */
export function extractRefreshToken(payload: unknown): string | null {
  const body = unwrap(payload)
  if (!body) return null
  return readString(body, 'refreshToken')
}

/**
 * Bóc cặp token từ body response.
 *
 * @returns `null` nếu không có access token ⇒ coi như refresh thất bại.
 */
export function extractTokenPair(payload: unknown): TokenPair | null {
  const accessToken = extractAccessToken(payload)
  if (!accessToken) return null
  return { accessToken, refreshToken: extractRefreshToken(payload) }
}

/** URL này có gọi tới endpoint refresh không? */
export function isAuthRefreshUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.includes(AUTH_REFRESH_URL)
}

/** URL này có gọi tới endpoint đăng nhập không? */
export function isAuthLoginUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.includes(AUTH_LOGIN_URL)
}

/** Đầu vào của quyết định "có thử refresh không?". */
export interface RefreshDecisionInput {
  /** HTTP status của response lỗi. */
  status: number | null
  /** URL của request vừa lỗi. */
  url?: string | null
  /** Request này cố tình bỏ qua refresh (chính request refresh). */
  skipRefresh?: boolean
  /** Request này đã được retry 1 lần sau khi refresh. */
  alreadyRetried?: boolean
}

/**
 * Có được thử refresh access token cho request này không?
 *
 * ⚠ Chỉ khi **đủ** 4 điều kiện:
 *   1. Status = 401 (access token hết hạn / không hợp lệ).
 *   2. Không phải chính endpoint refresh (tránh vòng lặp vô hạn).
 *   3. Không phải endpoint đăng nhập (401 ở đó = sai mật khẩu).
 *   4. Chưa retry lần nào (mỗi request chỉ được refresh 1 lần).
 */
export function shouldAttemptRefresh(input: RefreshDecisionInput): boolean {
  if (input.status !== 401) return false
  if (input.skipRefresh) return false
  if (input.alreadyRetried) return false
  if (isAuthLoginUrl(input.url)) return false
  if (isAuthRefreshUrl(input.url)) return false
  return true
}
