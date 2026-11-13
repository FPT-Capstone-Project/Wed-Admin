import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/vi'

dayjs.extend(relativeTime)

/**
 * ⚠ Locale mặc định của dayjs là **tiếng Anh** ⇒ `fromNow()` trả
 *   "5 minutes ago" ⇒ lệch ngôn ngữ với toàn app (tiếng Việt).
 *
 * ⚠ `dayjs.locale('vi')` là **global** ⇒ đặt ở module này (nơi duy nhất
 * dùng relativeTime) để không ảnh hưởng format ngày đang có.
 */
dayjs.locale('vi')

export type DateValue = string | number | Date | null | undefined
export function formatDate(dateValue: DateValue, formatStr = 'HH:mm DD/MM/YYYY'): string {
  if (!dateValue || (typeof dateValue === 'string' && (!dateValue.trim() || dateValue.trim() === '0'))) return '—'
  const parsed = dayjs(dateValue)
  if (!parsed.isValid() || parsed.year() <= 1970) return '—'
  return parsed.format(formatStr)
}

/**
 * Thời gian **tương đối** — vd "5 phút trước", "2 giờ trước".
 *
 * ⚠ Vì sao cần? Thông báo / nhật ký là dòng thời gian ⇒ "3 giờ trước"
 *   đọc nhanh hơn "14:32:07 04/11/2026". Vẫn hiện mốc tuyệt đối trong
 *   `title` (tooltip) để không mất thông tin.
 *
 * ⚠ Giá trị không hợp lệ / rỗng ⇒ trả `null` (component tự quyết định
 * fallback "—"), KHÔNG trả chuỗi rỗng.
 */
export function formatRelativeTime(dateValue: DateValue): string | null {
  if (!dateValue || (typeof dateValue === 'string' && (!dateValue.trim() || dateValue.trim() === '0'))) return null
  const parsed = dayjs(dateValue)
  if (!parsed.isValid() || parsed.year() <= 1970) return null
  return parsed.fromNow()
}

/**
 * ⚠ **ĐÃ GỠ** — công thức tiến độ theo thời gian thực
 * (`calculateSessionProgress`).
 *
 * ## Vì sao gỡ?
 *
 * Tiến độ sinh trưởng phải phản ánh **đúng** những gì Farm OP đã cập nhật
 * trên Phiên canh tác (`progress_percent`). Công thức theo ngày
 * `(now - start) / (end - start) * 100` là **nhẩm** ⇒ cùng 1 phiên hiển thị
 * 0 % ở một trang và 70 % ở trang khác ⇒ người dùng mất niềm tin vào số liệu.
 *
 * → Nguồn duy nhất nay là
 *   `features/sessions/utils/session-progress.utils.ts` → `resolveSessionProgress()`
 *   (đọc thẳng `progress_percent` của Phiên canh tác).
 */

/** Ngày có parse được không? (dùng để fallback khi dữ liệu BE lỗi) */
export function isValidDateValue(value: DateValue): boolean {
  if (!value) return false
  if (typeof value === 'string' && (!value.trim() || value.trim() === '0')) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1970
}
