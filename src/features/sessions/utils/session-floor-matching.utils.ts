import type { SessionFloorMapping } from '../types/session-floor-mapping.types'

/**
 * Khớp **tầng của phiên** với danh sách tầng đã map của BE.
 *
 * ⚠ **Vì sao cần fallback?**
 *
 *   Schema Swagger của `GET /api/iot/floors` **không khai báo `floor_id`** ⇒
 *   ở runtime cột này có thể thiếu. Nếu FE chỉ so khớp bằng `floor_id`
 *   ⇒ không tầng nào khớp ⇒ danh sách tầng trống + tab "Lệnh thiết bị" mất
 *   hoàn toàn dữ liệu.
 *
 *   → Ta khớp theo **thứ tự ưu tiên**:
 *     1. `floor_id` (chính xác nhất — BE định danh tầng bằng `floor_id`).
 *     2. `room_id` + `floor_number` (cặp ký hiệu ổn định, không đụng nhau vì
 *        `room_id` chỉ là phòng chứa tầng).
 *     3. `master_id` + `node_address` (cặp thiết bị — tầng nào dùng master
 *        và node nào).
 *     4. `floor_name` (so khớp **chính xác**, không phải "chứa" — tránh
 *        khớp nhầm "Tầng 1" với "Tầng 10").
 */

/** Khoá so khớp của 1 tầng của phiên. */
export interface SessionFloorKey {
  floorId: number | null
  roomId: number | null
  floorNumber: number | null
  floorName: string | null
  masterId: number | null
  nodeAddress: number | null
}

/**
 * Chuẩn hoá tên tầng về dạng so khớp: bỏ khoảng trắng + hạ chữ thường.
 */
function normalizeFloorName(name: string | null | undefined): string | null {
  if (typeof name !== 'string') return null
  const normalized = name.trim().toLowerCase()
  return normalized === '' ? null : normalized
}

/**
 * Tìm tầng đã map tương ứng với 1 tầng của phiên.
 *
 * @returns Tầng đã map, hoặc `null` nếu không tầng nào khớp.
 */
export function matchFloorMapping(
  key: SessionFloorKey,
  mappings: readonly SessionFloorMapping[],
): SessionFloorMapping | null {
  // 1) `floor_id` — khớp chính xác, ưu tiên tuyệt đối.
  if (key.floorId != null) {
    const byFloorId = mappings.find(
      (mapping) => mapping.floorId === key.floorId,
    )
    if (byFloorId) return byFloorId
  }

  // 2) `room_id` + `floor_number` — cặp định danh ổn định trong 1 phòng.
  if (key.roomId != null && key.floorNumber != null) {
    const byRoomAndNumber = mappings.find(
      (mapping) =>
        mapping.roomId === key.roomId &&
        mapping.floorNumber === key.floorNumber,
    )
    if (byRoomAndNumber) return byRoomAndNumber
  }

  // 3) `master_id` + `node_address` — cặp thiết bị.
  if (key.masterId != null && key.nodeAddress != null) {
    const byDevice = mappings.find(
      (mapping) =>
        mapping.masterId === key.masterId &&
        mapping.nodeAddress === key.nodeAddress,
    )
    if (byDevice) return byDevice
  }

  // 4) Tên tầng — so khớp chính xác (không dùng "includes").
  const targetName = normalizeFloorName(key.floorName)
  if (targetName) {
    const byName = mappings.find(
      (mapping) => normalizeFloorName(mapping.floorName) === targetName,
    )
    if (byName) return byName
  }

  return null
}

/**
 * Lọc danh sách tầng đã map theo các tầng của phiên.
 *
 * ⚠ Giữ **thứ tự** của `keys` (tầng của phiên) ⇒ hiển thị ổn định.
 */
export function filterSessionFloorMappings(
  keys: readonly SessionFloorKey[],
  mappings: readonly SessionFloorMapping[],
): SessionFloorMapping[] {
  const result: SessionFloorMapping[] = []
  const seen = new Set<SessionFloorMapping>()

  for (const key of keys) {
    const mapping = matchFloorMapping(key, mappings)
    if (!mapping || seen.has(mapping)) continue
    seen.add(mapping)
    result.push(mapping)
  }

  return result
}

/**
 * Lấy **tập `floor_id`** của các tầng đã map — dùng để gọi
 * `GET /api/iot/floors/{floorId}/auto-control/logs`.
 *
 * ⚠ Chỉ trả về `floor_id` **thực sự có** ⇒ không gọi nhầm endpoint với
 *   `room_id` (BE định danh tầng bằng `floor_id`, xem `types/iot.ts`).
 */
export function collectMappedFloorIds(
  mappings: readonly SessionFloorMapping[],
): number[] {
  const ids = new Set<number>()
  for (const mapping of mappings) {
    if (mapping.floorId != null && mapping.floorId > 0) {
      ids.add(mapping.floorId)
    }
  }
  return [...ids].sort((left, right) => left - right)
}

/**
 * Chuẩn hoá 1 tầng của phiên (từ `trays[]`) thành khoá so khớp.
 */
export function toSessionFloorKey(tray: {
  floor_id?: number | null
  room_id?: number | null
  floor_number?: number | null
  floor_name?: string | null
}): SessionFloorKey {
  return {
    floorId: typeof tray.floor_id === 'number' ? tray.floor_id : null,
    roomId: typeof tray.room_id === 'number' ? tray.room_id : null,
    floorNumber: typeof tray.floor_number === 'number' ? tray.floor_number : null,
    floorName: tray.floor_name ?? null,
    masterId: null,
    nodeAddress: null,
  }
}

/**
 * Nguồn thông tin tầng — dùng để dựng nhãn hiển thị.
 *
 * ⚠ Cả `SessionFloorMapping` (từ BE) và `SessionFloorKey` (từ `trays[]` của
 *   phiên) đều thỏa mãn shape này ⇒ dùng chung 1 hàm dựng map.
 */
export interface FloorLabelSource {
  floorId: number | null
  floorNumber: number | null
  floorName: string | null
}

/**
 * Dựng map **nhãn tầng** theo `floor_id` — dùng để hiển thị tầng trong bảng
 * nhật ký thiết bị và bảng cảm biến chi tiết.
 *
 * ⚠ **Vì sao cần map này?**
 *   `floor_id` là **khoá kỹ thuật** trong DB (`cultivation_floors.floor_id`),
 *   **không** phải số tầng hiển thị cho con người.
 *
 *   ⚠ Ví dụ thực tế: tầng "Tầng 2" có thể có `floor_id = 3` (vì `floor_id`
 *      là SERIAL, đánh số theo thứ tự tạo, không theo thứ tự tầng) ⇒ in
 *      trực tiếp `floor_id` sẽ hiện **"Tầng 3"** cho tầng "Tầng 2" ⇒ sai.
 *
 *   ⇒ Ta luôn hiển thị theo **`floor_number`** (số tầng thực tế) ⇒ "Tầng 2".
 *
 * @param sources Danh sách nguồn (BE map + tầng của phiên) — **gộp lại**.
 * @returns Map `floor_id` → nhãn hiển thị.
 *
 * ⚠ **Vì sao gộp nhiều nguồn?**
 *   - BE map (`/api/iot/floors`) có `floor_number` nhưng có thể **thiếu**
 *     `floor_id` (Swagger không khai báo cột này).
 *   - `trays[]` của phiên có `floor_id` + `floor_number` nhưng có thể thiếu
 *     `floor_name`.
 *   ⇒ Gộp cả hai ⇒ luôn map được `floor_id` → `floor_number` ⇒ **không bao
 *     giờ** rơi vào nhánh fallback in ID database.
 */
export function buildFloorLabelMap(
  sources: readonly FloorLabelSource[],
): Map<number, string> {
  /*
   * ⚠ **Lượt 1** — thu thập `floor_number` theo `floor_id`.
   *
   *   Tách riêng vì `floor_number` là thông tin **quan trọng nhất**: nếu có
   *   bất kỳ nguồn nào (BE map hoặc `trays[]` của phiên) cung cấp, ta dùng
   *   nó ⇒ **không bao giờ** rơi vào nhánh fallback in ID database.
   */
  const floorNumbers = new Map<number, number>()
  const floorNames = new Map<number, string>()

  for (const source of sources) {
    if (source.floorId == null) continue

    if (source.floorNumber != null && !floorNumbers.has(source.floorId)) {
      floorNumbers.set(source.floorId, source.floorNumber)
    }
    if (source.floorName && !floorNames.has(source.floorId)) {
      floorNames.set(source.floorId, source.floorName)
    }
  }

  // ─── Lượt 2 — dựng nhãn theo thứ tự ưu tiên ───────────────────────────
  const labels = new Map<number, string>()

  for (const source of sources) {
    if (source.floorId == null) continue
    if (labels.has(source.floorId)) continue

    const floorNumber = floorNumbers.get(source.floorId)
    const floorName = floorNames.get(source.floorId)

    /*
     * ⚠ Thứ tự ưu tiên:
     *   1. `floor_number` — **số tầng thực tế** (đây là thứ user muốn thấy).
     *   2. `floor_name` — tên do BE đặt (có thể là "Tầng 2" hoặc tên riêng).
     *   3. `floor_id` — fallback cuối cùng.
     */
    const label =
      floorNumber != null
        ? `Tầng ${floorNumber}`
        : (floorName ?? `Tầng ${source.floorId}`)

    labels.set(source.floorId, label)
  }

  return labels
}

/**
 * Dựng map nhãn tầng **từ thông tin tầng của phiên** (`trays[]`).
 *
 * ⚠ Dùng làm **fallback** khi BE map (`/api/iot/floors`) không khớp được tầng
 *   nào — trường hợp đó `buildFloorLabelMap(mappedFloors)` sẽ rỗng ⇒ bảng nhật
 *   ký thiết bị in `Tầng ${floor_id}` ⇒ **sai**.
 *
 * @param keys Danh sách khoá tầng của phiên (từ `toSessionFloorKey`).
 * @returns Map `floor_id` → nhãn hiển thị.
 */
export function buildFloorLabelMapFromKeys(
  keys: readonly SessionFloorKey[],
): Map<number, string> {
  return buildFloorLabelMap(keys)
}
