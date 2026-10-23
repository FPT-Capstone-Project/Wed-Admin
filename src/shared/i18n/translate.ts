/**
 * i18n helpers — chuyển enum/string từ tiếng Anh (từ BE) sang tiếng Việt
 * để UI hiển thị dễ đọc hơn cho operator Việt Nam.
 *
 * Nguyên tắc:
 *   - Giữ nguyên giá trị gốc trong DB / API responses.
 *   - Chỉ translate ở layer hiển thị (table, select, tag).
 *   - Thêm key rỗng '' cho fallback nếu BE trả giá trị lạ.
 */

/** Map tên phổ biến từ EN → VI cho mục "Giống nấm" + "Thông số canh tác".
 *
 * Nguyên tắc:
 *   - translateMushroomName(name) trả về tên VI, ghép sub-type (King/Gray/...) vào ngoặc nếu có
 *     trong original string để tránh 2 loại cùng tên VI bị trùng nhau.
 *   - translateMushroomNameForCondition(name) chỉ trả tên VI, không thêm sub-type
 *     (dùng trong combobox để map theo id).
 */

const MUSHROOM_NAME_MAP: Record<string, string> = {
  'oyster mushroom': 'Nấm Bào Ngư',
  'king oyster mushroom': 'Nấm Bào Ngư King',
  'king oyster premium': 'Nấm Bào Ngư King Premium',
  'pink oyster mushroom': 'Nấm Bào Ngư Hồng',
  'golden oyster mushroom': 'Nấm Bào Ngư Vàng',
  'gray oyster mushroom': 'Nấm Bào Ngư Xám',
  'white oyster mushroom': 'Nấm Bào Ngư Trắng',
  'oyster': 'Nấm Bào Ngư',
  "lion's mane": 'Nấm Đầu Khỉ',
  'lions mane': 'Nấm Đầu Khỉ',
  'lion mane': 'Nấm Đầu Khỉ',
  'hericium erinaceus': 'Nấm Đầu Khỉ',
  'shiitake': 'Nấm Đông Cô',
  'lentinula edodes': 'Nấm Đông Cô',
  'enoki': 'Nấm Kim Châm',
  'enoki mushroom': 'Nấm Kim Châm',
  'flammulina velutipes': 'Nấm Kim Châm',
  'shimeji': 'Nấm Shimeji',
  'nameko': 'Nấm Nameko',
  'maitake': 'Nấm Maitake',
  'grifola frondosa': 'Nấm Maitake',
  'reishi': 'Nấm Linh Chi',
  'ganoderma': 'Nấm Linh Chi',
  'cordyceps': 'Đông Trùng Hạ Thảo',
  'cordyceps militaris': 'Đông Trùng Hạ Thảo',
  'snow fungus': 'Nấm Tuyết',
  'tremella fuciformis': 'Nấm Tuyết',
  'wood ear': 'Mộc Nhĩ',
  'auricularia auricula': 'Mộc Nhĩ',
  'straw mushroom': 'Nấm Rơm',
  'volvariella volvacea': 'Nấm Rơm',
  'matsutake': 'Nấm Matsutake',
  'morel': 'Nấm Morel',
  'chanterelle': 'Nấm Chanterelle',
  'porcini': 'Nấm Porcini',
  'truffle': 'Nấm Truffle',
  'pleurotus ostreatus': 'Nấm Bào Ngư Xám',
  'pleurotus eryngii': 'Nấm Bào Ngư King',
  'king oyster': 'Nấm Bào Ngư King',
  'oyster premium': 'Nấm Bào Ngư Premium',
}

const PACKAGE_NAME_MAP: Record<string, string> = {
  'standard': 'Tiêu chuẩn',
  'standard package': 'Gói Tiêu chuẩn',
  'standard 30-day package': 'Gói Tiêu chuẩn 30 ngày',
  'premium': 'Cao cấp',
  'premium package': 'Gói Cao cấp',
  'premium 30-day package': 'Gói Cao cấp 30 ngày',
  'basic': 'Cơ bản',
  'basic package': 'Gói Cơ bản',
  'basic 30-day package': 'Gói Cơ bản 30 ngày',
  'vip': 'VIP',
  'vip package': 'Gói VIP',
  'trial': 'Dùng thử',
  'trial package': 'Gói Dùng thử',
  'professional': 'Chuyên nghiệp',
  'pro package': 'Gói Chuyên nghiệp',
  'enterprise': 'Doanh nghiệp',
}

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

/** Match tên có/không có tiền tố "Nấm"/"Premium" — tránh chính xác ký tự đặc biệt. */
function lookupExact(raw: string, map: Record<string, string>): string | null {
  return map[raw] ?? null
}

function lookupContains(raw: string, map: Record<string, string>): string | null {
  for (const key of Object.keys(map)) {
    if (raw.includes(key)) return map[key]
  }
  return null
}

/** Trả về tên nấm tiếng Việt + sub-type trong ngoặc.
 *
 * Ví dụ:
 *   "Oyster Mushroom"      → "Nấm Bào Ngư"
 *   "Oyster Mushroom Gray" → "Nấm Bào Ngư (Xám)"
 *   "King Oyster Premium"  → "Nấm Bào Ngư King Premium"
 */
export function translateMushroomName(name: string | null | undefined): string {
  if (!name) return ''
  const raw = name.trim()
  const key = raw.toLowerCase()

  const vi =
    lookupExact(key, MUSHROOM_NAME_MAP) ??
    lookupContains(key, MUSHROOM_NAME_MAP) ??
    raw

  // Nếu trùng với 1 trong các tên cơ bản, thêm qualifier vào ngoặc
  const baseNames = [
    'nấm bào ngư',
    'nấm đầu khỉ',
    'nấm đông cô',
    'nấm kim châm',
    'nấm shimeji',
    'nấm linh chi',
    'đông trùng hạ thảo',
    'nấm maitake',
    'mộc nhĩ',
    'nấm rơm',
  ]
  const isBaseName = baseNames.some((b) => vi.toLowerCase().startsWith(b))
  if (!isBaseName) return vi

  // Tìm qualifier có trong original string
  const qualifierMap: Record<string, string> = {
    king: 'King',
    gray: 'Xám',
    golden: 'Vàng',
    pink: 'Hồng',
    white: 'Trắng',
    premium: 'Premium',
    black: 'Đen',
  }
  for (const [kw, label] of Object.entries(qualifierMap)) {
    if (key.includes(kw) && !vi.toLowerCase().includes(label.toLowerCase())) {
      return `${vi} (${label})`
    }
  }
  return vi
}

/** Chỉ trả tên VI, KHÔNG thêm sub-type — dùng khi map theo id từ lookup table. */
export function translateMushroomNameOnly(name: string | null | undefined): string {
  if (!name) return ''
  const raw = name.trim()
  const key = raw.toLowerCase()
  return (
    lookupExact(key, MUSHROOM_NAME_MAP) ??
    lookupContains(key, MUSHROOM_NAME_MAP) ??
    raw
  )
}

/** Trả về tên gói thuê tiếng Việt. */
export function translatePackageName(name: string | null | undefined): string {
  if (!name) return ''
  const raw = name.trim()
  const key = raw.toLowerCase()
  return (
    lookupExact(key, PACKAGE_NAME_MAP) ??
    lookupContains(key, PACKAGE_NAME_MAP) ??
    raw
  )
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
