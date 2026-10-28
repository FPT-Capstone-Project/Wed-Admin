import { message } from 'antd'
import { extractApiError } from './error'

/**
 * Toast lỗi tập trung cho toàn bộ request thất bại.
 *
 * ⚠ Dùng **static** `message` của AntD, không dùng `App.useApp()`:
 *   interceptor nằm ngoài React nên không có context. AntD khuyến nghị static
 *   API chỉ cho tình huống này; vấn đề `getContainer`/theme chỉ ảnh hưởng
 *   style của toast, không ảnh hưởng hành vi.
 *
 * 401 được **bỏ qua**: `notifyAuthExpired` đã xử lý (clear session + điều
 * hướng /login), toast thêm chỉ gây trùng lặp.
 *
 * 403/404 cũng bỏ qua: nhiều màn hình poll nền (IoT status 5s, log) sẽ spam
 * toast khi camera offline hoặc role thiếu quyền — trường hợp đó UI tự hiển
 * thị trạng thái rỗng, không cần toast toàn cục.
 *
 * ⚠ Toast được **trì hoãn** một nhịp ngắn (`TOAST_DELAY_MS`) vì TanStack Query
 *   retry 1 lần: nếu request lần 1 timeout nhưng lần 2 thành công, hiện toast
 *   ngay sẽ báo lỗi oán cho người dùng dù thực tế đã thành công. Chỉ khi
 *   request thất bại hẳn (không còn lần retry nào) mới hiện toast.
 *
 *   → Toast đang chờ được đánh dấu theo **request** (`method + url`) nên khi
 *   lần retry thành công, interceptor success huỷ đúng toast đó.
 */

const SILENT_STATUSES = new Set([401, 403, 404])

/** Ngừng hiện toast, chờ xem request có retry thành công không. */
const TOAST_DELAY_MS = 1_200

/** Tránh spam cùng một lỗi lặp lại (vd polling 5s gặp lỗi mạng). */
const DEDUPE_WINDOW_MS = 4_000
const lastToastAt = new Map<string, number>()

/** Timer đang chờ, đánh dấu theo request (`method + url`). */
const pendingToasts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Khóa nhận diện request — dùng để ghép lỗi với lần retry thành công.
 *
 * Chỉ dùng `method` + `url` (không dùng body/params) vì thân request là
 * giống nhau giữa các lần retry.
 */
function requestKey(config: {
  method?: string
  url?: string
} | null | undefined): string {
  return `${(config?.method ?? 'get').toUpperCase()} ${config?.url ?? ''}`
}

function shouldShow(status: number | null, text: string): boolean {
  if (status !== null && SILENT_STATUSES.has(status)) return false

  const key = `${status ?? 'net'}:${text}`
  const now = Date.now()
  const previous = lastToastAt.get(key)

  if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) {
    return false
  }

  lastToastAt.set(key, now)
  return true
}

/**
 * Cài đặt toast toàn cục cho axios error interceptor.
 *
 * Gọi từ `client.ts`. Trả về hàm gỡ (dùng cho test).
 */
export function installErrorToast(): (error: unknown) => void {
  return function globalErrorToast(error: unknown): void {
    const { status, message: text } = extractApiError(error)

    if (status !== null && SILENT_STATUSES.has(status)) return

    const key = requestKey(
      (error as { config?: { method?: string; url?: string } })?.config,
    )

    // Đã có toast pending cho request này → không lặp lại.
    if (pendingToasts.has(key)) return

    const timer = setTimeout(() => {
      pendingToasts.delete(key)
      if (shouldShow(status, text)) {
        void message.error(text)
      }
    }, TOAST_DELAY_MS)

    pendingToasts.set(key, timer)
  }
}

/**
 * Huỷ toast đang chờ — gọi khi request đã thành công (tức là lần retry
 * đã cứu được request).
 *
 * @param config Config của request vừa thành công (axios `response.config`).
 */
export function cancelPendingErrorToast(config: {
  method?: string
  url?: string
} | null | undefined): void {
  const key = requestKey(config)

  const timer = pendingToasts.get(key)
  if (timer === undefined) return

  clearTimeout(timer)
  pendingToasts.delete(key)
}

/** Xoá cache dedupe + huỷ mọi toast đang chờ — gọi khi logout hoặc trong test. */
export function resetErrorToastCache(): void {
  lastToastAt.clear()
  for (const timer of pendingToasts.values()) clearTimeout(timer)
  pendingToasts.clear()
}