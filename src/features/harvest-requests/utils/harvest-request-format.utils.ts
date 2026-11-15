/**
 * Format hiển thị cho yêu cầu nhận nấm (WF-04).
 *
 * ⚠ **Múi giờ Việt Nam (UTC+7)** — server có thể trả ISO string ở UTC
 *   (`2026-11-05T02:00:00Z` = 09:00 VN) ⇒ **không** dùng `toISOString()`
 *   hay format không khai báo timezone.
 */

/** Chuyển 1 giá trị ngày/giờ về `Date` hợp lệ (null nếu thiếu / sai định dạng). */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === '0') return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  if (date.getFullYear() <= 1970) return null
  return date
}

/**
 * Ngày giờ theo giờ Việt Nam — dạng `DD/MM/YYYY HH:mm`.
 *
 * ⚐ Dùng `toLocaleString` với `timeZone: 'Asia/Ho_Chi_Minh'` ⇒ không phụ
 *   thuộc timezone của máy người dùng.
 */
export function formatVietnamDateTime(
  value: string | null | undefined,
): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Ngày (không giờ) theo giờ Việt Nam — dạng `DD/MM/YYYY`.
 */
export function formatVietnamDate(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
