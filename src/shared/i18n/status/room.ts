/**
 * Từ điển trạng thái — **phòng & khay** (room & tray).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái phòng (`cultivation_rooms.status`).
 *   - Trạng thái khay **của BE** (`cultivation_trays.status`).
 *   - Trạng thái khay **của UI** (`TrayStatus` — dùng cho lưới kệ).
 *
 * ⚠ Vì sao có 2 bộ trạng thái khay?
 *   - BE (`cultivation_trays.status`): `AVAILABLE | OCCUPIED | MAINTENANCE |
 *     INACTIVE` — trạng thái vật lý của khay trong DB.
 *   - UI (`TrayStatus`): `empty | rented | harvesting | maintenance` — trạng
 *     thái **hiển thị** đã quy đổi thêm ngữ cảnh phiếu thuê.
 *
 *   Cả hai đều cần nhãn riêng ⇒ không gộp chung 1 bảng.
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** Trạng thái phòng (`cultivation_rooms.status`). */
export type RoomStatusKey = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

/** Trạng thái khay của BE (`cultivation_trays.status`). */
export type CultivationTrayStatusKey =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'INACTIVE'

/**
 * Trạng thái khay của UI (`TrayStatus` — lưới kệ).
 */
export type TrayUiStatusKey = 'empty' | 'rented' | 'harvesting' | 'maintenance'

/** Trạng thái thu hoạch của lô thuê (legacy `HarvestStatus`). */
export type RentalHarvestStatusKey =
  | 'GROWING'
  | 'READY_TO_HARVEST'
  | 'OVERDUE'
  | 'AUTO_HARVESTED'

/**
 * Trạng thái phòng.
 *
 * ⚠ `MAINTENANCE` dùng `warning` — phòng còn dùng được nhưng cần bảo trì.
 */
export const ROOM_STATUS_DICTIONARY: Record<RoomStatusKey, StatusPresentation> = {
  ACTIVE: { tone: 'ok', label: 'Hoạt động' },
  INACTIVE: { tone: 'muted', label: 'Ngưng hoạt động' },
  MAINTENANCE: { tone: 'warning', label: 'Bảo trì' },
}

/**
 * Trạng thái khay của BE.
 *
 * ⚠ `INACTIVE` dùng `muted` (không dùng) còn `MAINTENANCE` dùng `warning`.
 */
export const CULTIVATION_TRAY_STATUS_DICTIONARY: Record<
  CultivationTrayStatusKey,
  StatusPresentation
> = {
  AVAILABLE: { tone: 'muted', label: 'Còn trống' },
  OCCUPIED: { tone: 'ok', label: 'Đang thuê' },
  MAINTENANCE: { tone: 'warning', label: 'Bảo trì' },
  INACTIVE: { tone: 'muted', label: 'Ngưng sử dụng' },
}

/**
 * Trạng thái khay của UI — dùng cho ô khay nhỏ trong lưới kệ.
 *
 * ⚠ `label` = nhãn đầy đủ (drawer chi tiết, bảng quản trị, legend).
 * `shortLabel` = nhãn rút gọn cho ô khay nhỏ — badge ở đó chỉ rộng ~158px
 * nên "Nhiễm bệnh / Cách ly" bị tràn/wrapping.
 */
export const TRAY_UI_STATUS_DICTIONARY: Record<
  TrayUiStatusKey,
  StatusPresentation & { readonly shortLabel: string }
> = {
  empty: { tone: 'muted', label: 'Khay trống', shortLabel: 'Trống' },
  rented: { tone: 'ok', label: 'Đang thuê', shortLabel: 'Đang thuê' },
  harvesting: {
    tone: 'warning',
    label: 'Chờ thu hoạch',
    shortLabel: 'Chờ thu hoạch',
  },
  maintenance: {
    tone: 'danger',
    label: 'Nhiễm bệnh / Cách ly',
    shortLabel: 'Nhiễm bệnh',
  },
}

/** Trạng thái thu hoạch của lô thuê (legacy). */
export const RENTAL_HARVEST_STATUS_DICTIONARY: StatusDictionary = {
  GROWING: { tone: 'info', label: 'Đang sinh trưởng' },
  READY_TO_HARVEST: { tone: 'ok', label: 'Sẵn sàng thu hoạch' },
  OVERDUE: { tone: 'danger', label: 'Quá hạn thu hoạch' },
  AUTO_HARVESTED: { tone: 'success', label: 'Đã thu hoạch tự động' },
}
