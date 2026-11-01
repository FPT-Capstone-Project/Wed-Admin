/**
 * i18n helpers — chuyển enum/string từ tiếng Anh (từ BE) sang tiếng Việt
 * để UI hiển thị dễ đọc hơn cho operator Việt Nam.
 *
 * Nguyên tắc:
 *   - Giữ nguyên giá trị gốc trong DB / API responses.
 *   - Chỉ translate ở layer hiển thị (table, select, tag).
 *   - Thêm key rỗng '' cho fallback nếu BE trả giá trị lạ.
 *
 * ⚠ **KHÔNG dịch tên nấm / tên gói thuê.**
 *   Tên giống nấm và tên gói là dữ liệu nghiệp vụ do người dùng nhập và
 *   lưu trong DB (`mushroom_types.name`, `rental_packages.package_name`).
 *   FE hiển thị **nguyên bản** giá trị BE trả về — không có bảng EN → VI.
 *   (Bảng dịch cũ đã bị gỡ: mọi tên nấm tiếng Việt trong UI giờ đến thẳng
 *   từ DB, nên đổi tên trong DB là đổi luôn trên UI.)
 */

/* ─── Status enum → tiếng Việt ──────────────────────────────────────────── */

const STATUS_MAP: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Tạm ngưng',
  AVAILABLE: 'Còn trống',
  OCCUPIED: 'Đang sử dụng',
  RENTED: 'Đang cho thuê',
  MAINTENANCE: 'Bảo trì',
  OPEN: 'Đang mở bán',
  CLOSED: 'Đã đóng',
}

const ROOM_STATUS_MAP: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngưng',
  MAINTENANCE: 'Bảo trì',
}

const TRAY_STATUS_MAP: Record<string, string> = {
  AVAILABLE: 'Còn trống',
  OCCUPIED: 'Đang thuê',
  MAINTENANCE: 'Bảo trì',
  RESERVED: 'Đã đặt',
}

/** Status enum → tiếng Việt. */
export function translateStatus(
  value: string | null | undefined,
  fallback?: string,
): string {
  if (!value) return fallback ?? ''
  const key = value.trim().toUpperCase()
  return STATUS_MAP[key] ?? fallback ?? value
}

export function translateRoomStatus(value: string | null | undefined): string {
  if (!value) return ''
  return ROOM_STATUS_MAP[value.trim().toUpperCase()] ?? value
}

export function translateTrayStatus(value: string | null | undefined): string {
  if (!value) return ''
  return TRAY_STATUS_MAP[value.trim().toUpperCase()] ?? value
}

/** Map đơn vị đo chung. */
export const UNIT_LABELS = {
  days: 'ngày',
  celsius: '℃',
  percent: '%',
  ppm: 'ppm',
  vnd: '₫',
} as const
