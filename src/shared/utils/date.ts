import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'

dayjs.extend(relativeTime)

/**
 * ⚠ Locale mặc định của dayjs là **tiếng Anh** ⇒ `fromNow()` trả
 *   "5 minutes ago" ⇒ lệch ngôn ngữ với toàn app (tiếng Việt).
 *   `dayjs/locale/vi` chuyển sang "5 phút trước".
 *
 * ⚠ `dayjs.locale('vi')` là **global** ⇒ đặt ở module này (nơi duy nhất
 *   dùng relativeTime) để không ảnh hưởng format ngày đang có.
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
 *   fallback "—"), KHÔNG trả chuỗi rỗng.
 */
export function formatRelativeTime(dateValue: DateValue): string | null {
  if (!dateValue || (typeof dateValue === 'string' && (!dateValue.trim() || dateValue.trim() === '0'))) return null
  const parsed = dayjs(dateValue)
  if (!parsed.isValid() || parsed.year() <= 1970) return null
  return parsed.fromNow()
}

/**
 * **Công thức chuẩn dùng chung** cho tiến độ sinh trưởng của 1 phiên canh tác
 * (0–100 %), tính theo **thời gian thực** (mili-giây).
 *
 * ⚠ Vì sao cần 1 nguồn sự thật duy nhất?
 *   Trước đây mỗi màn hình tự tính tiến độ theo cách khác nhau:
 *     - Trang "Phiên canh tác" dùng `progress_percent` của BE (thường = 0 vì
 *       nhân viên chưa bấm cập nhật) → hiển thị **0 %**.
 *     - Trang "Sinh trưởng & thu hoạch" hardcode theo giai đoạn
 *       (`CULTIVATING` → **70 %**) → hiển thị **70 %**.
 *     - Drawer "Chi tiết khay" dùng `growthDay / expectedHarvestDay`.
 *
 *   ⇒ Cùng 1 phiên hiển thị 2 con số khác nhau ⇒ người dùng mất niềm tin vào
 *   số liệu. Nay **mọi màn hình đều gọi hàm này** ⇒ luôn khớp nhau.
 *
 * Công thức:
 *   `progress = clamp(round((now - start) / (end - start) * 100), 0, 100)`
 *
 * @param startDate Ngày bắt đầu canh tác (ISO).
 * @param expectedHarvestDate Ngày dự kiến thu hoạch / kết thúc chu kỳ (ISO).
 * @param status Trạng thái phiên — `COMPLETED` / `HARVESTED` ⇒ 100 %,
 *               `PENDING` / `ALLOCATING` ⇒ 0 %.
 */
export const calculateSessionProgress = (
  startDate?: string | null,
  expectedHarvestDate?: string | null,
  status?: string
): number => {
  if (status === 'COMPLETED' || status === 'HARVESTED') return 100
  if (!startDate || !expectedHarvestDate || status === 'PENDING' || status === 'ALLOCATING') return 0

  const start = new Date(startDate).getTime()
  const end = new Date(expectedHarvestDate).getTime()
  const now = Date.now()

  if (isNaN(start) || isNaN(end) || end <= start) return 0
  if (now <= start) return 0
  if (now >= end) return 100

  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
}

/** Ngày có parse được không? (dùng để fallback khi dữ liệu BE lỗi) */
export function isValidDateValue(value: DateValue): boolean {
  if (!value) return false
  if (typeof value === 'string' && (!value.trim() || value.trim() === '0')) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1970
}

/**
 * Cộng thêm N ngày lên 1 mốc thời gian và trả về chuỗi ISO.
 *
 * ⚠ Dùng khi BE không trả `expected_harvest_date` nhưng có `duration_days`
 *   ⇒ suy ra ngày kết thúc chu kỳ để tính tiến độ theo thời gian.
 */
export function addDaysToIso(value: DateValue, days: number): string | null {
  if (!isValidDateValue(value)) return null
  const date = new Date(value as string | number | Date)
  date.setDate(date.getDate() + Math.round(days))
  return date.toISOString()
}
