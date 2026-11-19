/**
 * Chuẩn hoá tên tầng trong nội dung thông báo.
 *
 * ⚠ Vì sao cần?
 *   BE (`deviceIncident.model.js` → `deviceLabel()`) dựng nhãn thiết bị bằng
 *   **khoá kỹ thuật**: `Cảm biến ${sensor_address} của tầng ID ${floor_id}` /
 *   `Node ${node_address} của tầng ID ${floor_id}`.
 *
 *   `floor_id` là SERIAL trong DB ⇒ **không** phải số tầng. VD `floor_id = 3`
 *   có thể là tầng 2 (`floor_number = 2`). In thẳng ra UI là sai.
 *
 *   ⇒ Lớp normalizer này thay chuỗi `tầng ID <id>` bằng **tên tầng thật**
 *     lấy từ `GET /api/iot/floors`.
 *
 * ⚠ Quy ước nhãn tầng (đồng bộ `features/alerts/api/alert.api.ts`,
 *   `features/rooms/utils/tray-layout.utils.ts`):
 *   1. `Tầng ${floor_number}` nếu có `floor_number`.
 *   2. `floor_name` nếu không có `floor_number`.
 *   3. `Tầng ${floor_id}` — fallback cuối cùng (vẫn tốt hơn `tầng ID 3`).
 */
import type { CultivationFloorMapping } from '../../../types/iot'
import type {
  AppNotification,
  NotificationListResult,
} from '../types/notification.types'

/**
 * Mẫu khớp chuỗi `tầng ID <id>` do BE sinh ra.
 *
 * - `i`: BE có thể ghi `Tầng ID` (đầu câu) hoặc `tầng ID` (giữa câu).
 * - `\s*` sau `ID`: chấp nhận cả `tầng ID3` lẫn `tầng ID 3`.
 */
const FLOOR_ID_PATTERN = /\btầng\s+ID\s*(\d+)\b/gi

/** Nhãn hiển thị của một tầng — ưu tiên số tầng thực tế. */
export function formatFloorLabel(floor: CultivationFloorMapping): string {
  if (Number.isFinite(floor.floor_number)) {
    return `Tầng ${floor.floor_number}`
  }
  const name = floor.floor_name?.trim()
  if (name) return name
  return `Tầng ${floor.floor_id}`
}

/**
 * Dựng map `floor_id` → nhãn hiển thị từ danh sách floors của IoT API.
 *
 * ⚠ Map rỗng khi:
 *   - API floors lỗi / chưa tải xong ⇒ nội dung giữ nguyên (không làm hỏng
 *     hiển thị), chỉ bỏ qua bước thay thế.
 *   - BE trả floor không có `floor_id` hợp lệ ⇒ bỏ qua entry đó.
 */
export function buildFloorLabelLookup(
  floors: readonly CultivationFloorMapping[] | undefined | null,
): Map<number, string> {
  const lookup = new Map<number, string>()
  if (!Array.isArray(floors)) return lookup

  for (const floor of floors) {
    if (!floor || !Number.isSafeInteger(floor.floor_id) || floor.floor_id <= 0) {
      continue
    }
    lookup.set(floor.floor_id, formatFloorLabel(floor))
  }
  return lookup
}

/**
 * Thay mọi chuỗi `tầng ID <id>` trong `text` bằng tên tầng tương ứng.
 *
 * ⚠ Tầng không có trong map ⇒ giữ nguyên chuỗi gốc (an toàn hơn là hiển thị
 *   sai tên tầng).
 */
export function replaceFloorIdReferences(
  text: string | null | undefined,
  lookup: ReadonlyMap<number, string>,
): string | null {
  if (!text) return text ?? null
  if (lookup.size === 0) return text

  return text.replace(FLOOR_ID_PATTERN, (match, rawId: string) => {
    const floorId = Number(rawId)
    if (!Number.isSafeInteger(floorId)) return match
    return lookup.get(floorId) ?? match
  })
}

/** Áp nhãn tầng lên **tiêu đề + nội dung** của 1 thông báo. */
export function applyFloorLabelsToNotification(
  notification: AppNotification,
  lookup: ReadonlyMap<number, string>,
): AppNotification {
  if (lookup.size === 0) return notification

  const title = replaceFloorIdReferences(notification.title, lookup)
  const message = replaceFloorIdReferences(notification.message, lookup)

  if (title === notification.title && message === notification.message) {
    return notification
  }
  return { ...notification, title, message }
}

/** Áp nhãn tầng lên toàn bộ kết quả danh sách thông báo. */
export function applyFloorLabelsToResult(
  result: NotificationListResult,
  lookup: ReadonlyMap<number, string>,
): NotificationListResult {
  if (lookup.size === 0) return result
  return {
    ...result,
    items: result.items.map((item) => applyFloorLabelsToNotification(item, lookup)),
  }
}
