/**
 * Phân loại thông báo cho Trung tâm "Cảnh báo & Thông báo".
 *
 * ⚠ Nguồn sự thật **duy nhất** = `notification_type` của BE
 *   (`GET /api/notifications`). Không suy đoán từ tiêu đề / nội dung
 *   (BE sinh text tự do, có thể tiếng Việt hoặc tiếng Anh).
 *
 * ⚠ Vì sao cần module này?
 *   Trung tâm "Cảnh báo & Thông báo" có 2 tab dùng **chung** 1 nguồn dữ
 *   liệu (`GET /api/notifications`):
 *     - Tab 1 "Cảnh báo vi khí hậu & IoT" → nhóm **kỹ thuật** (IoT).
 *     - Tab 2 "Thông báo hệ thống"        → nhóm **nghiệp vụ** (vận hành).
 *
 *   Trước đây không có ranh giới rõ ⇒ cùng 1 bản ghi cảm biến IoT hiện
 *   ở **cả 2 tab** (23 bản ghi trùng). Nay mọi quyết định "vào tab nào"
 *   đều gọi `isTechnicalNotificationType()` ⇒ 2 tab **loại trừ lẫn nhau**,
 *   không thể trùng dữ liệu.
 */
import type { NotificationType } from '../types/notification.types'

/**
 * Loại thông báo thuộc nhóm **kỹ thuật** — IoT / thiết bị / cảm biến /
 * vi khí hậu.
 *
 * ⚠ Chỉ liệt kê type BE **thực sự phát sinh**:
 *   - `DEVICE_ISSUE` → `deviceIncident.model.js` (sự cố master / node /
 *     cảm biến, phục hồi thiết bị).
 *   - `SENSOR_ALERT` → cảnh báo cảm biến / vi khí hậu.
 *   - `MICROCLIMATE_ALERT` → cảnh báo vi khí hậu tầng (nhiệt độ / độ ẩm).
 */
export const TECHNICAL_NOTIFICATION_TYPES: readonly string[] = [
  'DEVICE_ISSUE',
  'SENSOR_ALERT',
  'MICROCLIMATE_ALERT',
]

/**
 * Tiền tố type thuộc nhóm **nghiệp vụ** (tab 2).
 *
 * ⚠ Được kiểm tra **trước** heuristic từ khoá, để type như
 *   `CULTIVATION_ALERT` / `PAYMENT_ALERT` không bị nhầm sang tab 1.
 */
const BUSINESS_PREFIXES: readonly string[] = [
  'CULTIVATION',
  'PAYMENT',
  'ORDER',
  'HARVEST',
  'MUSHROOM',
  'OPERATOR',
]

/**
 * Từ khoá nhận diện type kỹ thuật — dự phòng cho type BE thêm mới.
 *
 * ⚠ Chỉ dùng khi type **không** khớp tiền tố nghiệp vụ ở trên.
 *   VD: `IOT_FAULT`, `CLIMATE_ALERT`, `DEVICE_TEMPERATURE_HIGH`.
 */
const TECHNICAL_KEYWORDS: readonly string[] = [
  'DEVICE',
  'SENSOR',
  'IOT',
  'CLIMATE',
  'ALERT',
]

/**
 * Thông báo này có thuộc nhóm **kỹ thuật** (tab 1) không?
 *
 * @param type `notification_type` của BE (có thể `null` / rỗng).
 * @returns `true` ⇒ thuộc tab 1 "Cảnh báo vi khí hậu & IoT".
 */
export function isTechnicalNotificationType(
  type: NotificationType | string | null | undefined,
): boolean {
  const normalized = String(type ?? '').trim().toUpperCase()
  if (!normalized) return false

  // 1) Type kỹ thuật được khai báo tường minh.
  if (TECHNICAL_NOTIFICATION_TYPES.includes(normalized)) return true

  // 2) Tiền tố nghiệp vụ ⇒ chắc chắn KHÔNG phải tab 1.
  if (BUSINESS_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false
  }

  // 3) Heuristic theo từ khoá kỹ thuật.
  return TECHNICAL_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

/**
 * Thông báo này thuộc nhóm **nghiệp vụ** (tab 2) không?
 *
 * ⚠ Là phủ định của `isTechnicalNotificationType()` ⇒ 2 tab **loại trừ
 *   lẫn nhau**, không bao giờ hiển thị chung 1 bản ghi.
 */
export function isBusinessNotificationType(
  type: NotificationType | string | null | undefined,
): boolean {
  return !isTechnicalNotificationType(type)
}

/**
 * Nhóm nghiệp vụ của thông báo (chỉ dùng cho **tab 2**).
 */
export type NotificationBusinessGroup =
  | 'cultivation'
  | 'harvest'
  | 'order'
  | 'system'

/**
 * Mapping `notification_type` → nhóm nghiệp vụ của tab 2.
 *
 * ⚠ `MUSHROOM_DISEASE` nằm ở nhóm `cultivation` (sự cố bệnh hại) — KHÔNG
 *   phải kỹ thuật.
 */
const TYPE_TO_BUSINESS_GROUP: Record<string, NotificationBusinessGroup> = {
  MUSHROOM_DISEASE: 'cultivation',
  CULTIVATION_STARTED: 'cultivation',
  CULTIVATION_PROGRESS: 'cultivation',
  CULTIVATION_COMPLETED: 'cultivation',
  CULTIVATION_CANCELLED: 'cultivation',
  HARVEST_READY: 'harvest',
  HARVEST_COMPLETED: 'harvest',
  PAYMENT_STATUS: 'order',
  PAYMENT_REFUND_REQUIRED: 'order',
  ORDER_STATUS: 'order',
}

/**
 * Nhóm nghiệp vụ của thông báo — suy ra từ `notification_type` của BE.
 *
 * ⚠ Type lạ ⇒ rơi về `system` (thông báo hệ thống chung) — an toàn.
 */
export function businessNotificationGroup(
  type: NotificationType | string | null | undefined,
): NotificationBusinessGroup {
  const normalized = String(type ?? '').trim().toUpperCase()
  if (!normalized) return 'system'

  const exact = TYPE_TO_BUSINESS_GROUP[normalized]
  if (exact) return exact

  if (normalized.startsWith('CULTIVATION')) return 'cultivation'
  if (normalized.startsWith('MUSHROOM')) return 'cultivation'
  if (normalized.startsWith('HARVEST')) return 'harvest'
  if (normalized.startsWith('PAYMENT') || normalized.startsWith('ORDER')) {
    return 'order'
  }

  return 'system'
}
