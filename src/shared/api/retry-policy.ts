import type { AxiosError } from 'axios'

/**
 * Retry policy dùng chung cho các query đọc (GET).
 *
 * ## Vấn đề
 *
 * Backend deploy trên Render (free tier) **ngủ (sleep) khi không có
 * traffic**. Request đầu tiên sau khi ngủ phải chờ Render "đánh thức"
 * instance ⇒ có thể mất 30–50s, hoặc bị timeout ở tầng mạng.
 *
 * → Cần retry để lần thứ 2 (backend đã thức) thành công.
 *
 * ## Vì sao không retry mọi lỗi?
 *
 * Một số lỗi **không bao giờ** thành công khi thử lại, retry chỉ làm chậm
 * UI và spam server:
 *
 * | Lỗi                    | Retry? | Lý do                              |
 * | ---------------------- | ------ | ---------------------------------- |
 * | Timeout / network      | ✅ Có  | Lỗi tạm thời, thường hết khi thức |
 * | 5xx (500/502/503/504)  | ✅ Có  | Lỗi server tạm thời                |
 * | 429 Too Many Requests  | ✅ Có  | Server bảo "thử lại sau"           |
 * | 400 / 401 / 403 / 404  | ❌ Không| Request sai hoặc không có quyền     |
 * | 409 Conflict           | ❌ Không| Tranh chấp dữ liệu, retry vô nghĩa  |
 *
 * → `retryApiErrors` chỉ retry nhóm "an toàn để thử lại".
 */

/** HTTP status nên thử lại (lỗi tạm thời ở phía server). */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

/**
 * Lỗi có phải do mạng/timeout không?
 *
 * Axios báo timeout qua `code === 'ECONNABORTED'` (khi `timeout` bị set) và
 * lỗi mạng qua `code` bắt đầu bằng `ERR_NETWORK` / `ECONNRESET` /
 * `ETIMEDOUT` / `ENOTFOUND`.
 *
 * ⚠ Chỉ xét lỗi **của axios** (`isAxiosError`). Một `Error` thuần (vd bug
 * logic trong `queryFn`) cũng không có `response`, nhưng retry sẽ chỉ lặp
 * lại lỗi logic → không có ích và che mất nguyên nhân thật.
 */
function isNetworkOrTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const axiosError = error as AxiosError<unknown>
  if (!axiosError.isAxiosError) return false

  const code = axiosError.code ?? ''

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return true
  if (code.startsWith('ERR_NETWORK')) return true
  if (code === 'ECONNRESET' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return true
  }

  // Không có `response` ⇒ request chưa tới server (mạng chết, CORS, DNS…).
  // Với axios, timeout cũng rơi vào nhóm này.
  return !axiosError.response
}

/**
 * Có nên thử lại request này không?
 *
 * @param failureCount Số lần đã thất bại (0 = lần đầu vừa fail).
 * @param error Lỗi vừa nhận.
 * @param maxRetries Số lần thử lại tối đa (mặc định 1).
 */
export function retryApiErrors(
  failureCount: number,
  error: unknown,
  maxRetries = 1,
): boolean {
  if (failureCount >= maxRetries) return false

  // Lỗi mạng / timeout → luôn thử lại.
  if (isNetworkOrTimeoutError(error)) return true

  // Lỗi có HTTP status → chỉ retry nếu status thuộc nhóm tạm thời.
  const status = (error as AxiosError<unknown>)?.response?.status
  if (typeof status === 'number') {
    return RETRYABLE_STATUS_CODES.has(status)
  }

  // Lỗi không xác định → không retry (an toàn).
  return false
}
