/**
 * Từ điển trạng thái — **camera Imou** (camera).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái camera đã đăng ký (`cameras.status`).
 *   - Trạng thái phiên live stream (`lives[].liveStatus` của Imou).
 *
 * ⚠ `liveStatus` là **số** do Imou cloud trả về (0 = đã dừng, 1 = đang
 *   phát) ⇒ chuẩn hoá về chuỗi trước khi tra cứu.
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** Trạng thái camera đã đăng ký (`cameras.status`). */
export type CameraStatusKey = 'ACTIVE' | 'INACTIVE' | 'OFFLINE'

/** Trạng thái phiên live stream (Imou `liveStatus`). */
export type LiveSessionStatusKey = '0' | '1'

/**
 * Trạng thái camera.
 *
 * ⚠ `OFFLINE` = mất kết nối ⇒ `danger` (cần nhân viên xử lý).
 */
export const CAMERA_STATUS_DICTIONARY: Record<
  CameraStatusKey,
  StatusPresentation
> = {
  ACTIVE: { tone: 'ok', label: 'Hoạt động' },
  INACTIVE: { tone: 'muted', label: 'Ngưng' },
  OFFLINE: { tone: 'danger', label: 'Mất kết nối' },
}

/**
 * Trạng thái phiên live stream.
 *
 * ⚠ Imou trả **số** ⇒ tra cứu bằng chuỗi `'0'` / `'1'`.
 *   Giá trị lạ (BE/Imou thêm mới) sẽ ra "Chưa xác định (x)" — không lộ raw.
 */
export const LIVE_SESSION_STATUS_DICTIONARY: StatusDictionary = {
  '0': { tone: 'muted', label: 'Đã dừng' },
  '1': { tone: 'ok', label: 'Đang phát' },
}
