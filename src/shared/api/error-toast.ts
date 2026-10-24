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
 */

const SILENT_STATUSES = new Set([401, 403, 404])

/** Tránh spam cùng một lỗi lặp lại (vd polling 5s gặp lỗi mạng). */
const DEDUPE_WINDOW_MS = 4_000
const lastToastAt = new Map<string, number>()

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

    if (shouldShow(status, text)) {
      void message.error(text)
    }
  }
}

/** Xoá cache dedupe — gọi khi logout hoặc trong test. */
export function resetErrorToastCache(): void {
  lastToastAt.clear()
}