/**
 * Từ điển trạng thái — **thu hoạch & bàn giao** (harvest).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái vụ thu hoạch (`harvests.status`).
 *   - Hình thức nhận hàng (`harvest_method`).
 *   - Trạng thái yêu cầu thu hoạch / bàn giao (`harvest_request_status`).
 *   - Chất lượng nấm (`quality_grade`).
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** Trạng thái vụ thu hoạch. */
export type HarvestStatusKey = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'

/** Hình thức nhận hàng. */
export type HarvestMethodKey = 'PICKUP' | 'DELIVERY'

/**
 * Trạng thái yêu cầu thu hoạch / bàn giao.
 *
 * ⚠ BE có thể trả thêm giá trị mới ⇒ tra cứu luôn qua `presentStatus()`.
 */
export type HarvestRequestStatusKey =
  | 'PENDING'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'

/** Trạng thái thu hoạch. */
export const HARVEST_STATUS_DICTIONARY: Record<
  HarvestStatusKey,
  StatusPresentation
> = {
  PLANNED: { label: 'Đã lên kế hoạch', tone: 'warning' },
  IN_PROGRESS: { label: 'Đang thu hoạch', tone: 'info' },
  COMPLETED: { label: 'Đã hoàn thành', tone: 'success' },
}

/** Hình thức nhận hàng. */
export const HARVEST_METHOD_DICTIONARY: Record<
  HarvestMethodKey,
  StatusPresentation
> = {
  PICKUP: { label: 'Nhận tại trang trại', tone: 'info' },
  DELIVERY: { label: 'Giao tận nơi', tone: 'info' },
}

/**
 * Trạng thái yêu cầu thu hoạch / bàn giao.
 *
 * ⚠ `PENDING` + `SCHEDULED` = phía khách **chưa hoàn tất** bàn giao ⇒
 *   bộ lọc "còn tồn đọng" của trang thu hoạch dựa vào đúng 2 giá trị này.
 */
export const HARVEST_REQUEST_STATUS_DICTIONARY: StatusDictionary = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warning' },
  SCHEDULED: { label: 'Đã lên lịch nhận', tone: 'info' },
  CONFIRMED: { label: 'Đã xác nhận bàn giao', tone: 'ok' },
  COMPLETED: { label: 'Đã bàn giao', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'danger' },
}

/**
 * Chất lượng nấm thu hoạch (`harvests.quality_grade`).
 *
 * ⚠ BE trả string tự do ⇒ tra cứu luôn an toàn.
 *
 * ⚠ Nhãn **rút gọn** ("Loại A") vì hiển thị ở cột bảng hẹp — mô tả đầy đủ
 *   nằm ở `description` (dùng làm tooltip của badge).
 */
export const HARVEST_QUALITY_DICTIONARY: StatusDictionary = {
  A: { label: 'Loại A', tone: 'success', description: 'Chất lượng tốt' },
  B: { label: 'Loại B', tone: 'info', description: 'Chất lượng khá' },
  C: { label: 'Loại C', tone: 'warning', description: 'Chất lượng trung bình' },
  PREMIUM: { label: 'Loại đặc biệt', tone: 'success' },
  STANDARD: { label: 'Loại tiêu chuẩn', tone: 'info' },
  REJECTED: { label: 'Không đạt', tone: 'danger' },
}
