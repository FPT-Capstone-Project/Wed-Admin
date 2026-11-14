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

/**
 * **Phạm vi tầng** của một phiên — dùng để lọc bản ghi cảm biến.
 *
 * ⚠ **Vì sao cần cả 2 loại định danh?**
 *
 *   Bản ghi `cultivation_environment_history` gắn với **`floor_id`** (khoá
 *   kỹ thuật trong DB — `SERIAL`, đánh số theo thứ tự tạo, **không** theo
 *   thứ tự tầng). Trong khi đó, khay của phiên (`trays[]`) trả cả
 *   `floor_id` **và** `floor_number` (số tầng thực tế).
 *
 *   ⇒ Ta dựng **cả 2 tập** để lọc:
 *     - `floorNumbers` — theo **số tầng thực tế** (đây là nguồn chuẩn,
 *       khớp với mong muốn "phiên #18 ở Tầng 2 ⇒ chỉ lấy Tầng 2").
 *     - `floorIds` — theo `floor_id` (fallback khi không xác định được
 *       `floor_number` của bản ghi).
 */
export interface SessionFloorScope {
  /** Tập `floor_id` (khoá kỹ thuật) của các tầng thuộc phiên. */
  floorIds: ReadonlySet<number>
  /** Tập `floor_number` (số tầng thực tế) của các tầng thuộc phiên. */
  floorNumbers: ReadonlySet<number>
}

/**
 * Dựng **phạm vi tầng** của phiên từ danh sách khoá tầng (`trays[]`).
 *
 * @param keys Danh sách khoá tầng của phiên (từ `toSessionFloorKey`).
 * @returns Tập `floor_id` + tập `floor_number` (có thể rỗng nếu phiên chưa
 *   gán khay nào).
 */
export function buildSessionFloorScope(
  keys: readonly SessionFloorKey[],
): SessionFloorScope {
  const floorIds = new Set<number>()
  const floorNumbers = new Set<number>()

  for (const key of keys) {
    if (key.floorId != null && key.floorId > 0) floorIds.add(key.floorId)
    if (key.floorNumber != null && key.floorNumber > 0) {
      floorNumbers.add(key.floorNumber)
    }
  }

  return { floorIds, floorNumbers }
}

/**
 * Dựng map **`floor_id` → `floor_number`** (số tầng thực tế).
 *
 * ⚠ Cần map này để **suy ra số tầng** của 1 bản ghi cảm biến từ `floor_id`
 *   ⇒ mới lọc được theo "đúng tầng của phiên" (xem
 *   `filterRecordsBySessionFloorScope`).
 *
 * @param sources Danh sách nguồn (BE map `/api/iot/floors` + `trays[]` của
 *   phiên) — **gộp lại** để luôn map được.
 */
export function buildFloorNumberMap(
  sources: readonly FloorLabelSource[],
): Map<number, number> {
  const map = new Map<number, number>()
  for (const source of sources) {
    if (source.floorId == null) continue
    if (source.floorNumber == null) continue
    if (map.has(source.floorId)) continue
    map.set(source.floorId, source.floorNumber)
  }
  return map
}

/**
 * Lọc bản ghi môi trường theo **đúng tầng của phiên**.
 *
 * ⚠ **Vì sao cần lọc ở FE?**
 *
 *   BE ghi bản ghi vào `cultivation_environment_history` theo
 *   `(session_id, floor_id, period_start)`. Khi **cùng 1 tầng** được dùng lại
 *   cho phiên khác (hoặc dữ liệu cũ còn sót), endpoint
 *   `GET /api/environment-history/sessions/{sessionId}` có thể trả về bản ghi
 *   của **tầng khác** (vd phiên #18 ở Tầng 2 nhưng vẫn lẫn dòng Tầng 3 từ
 *   dữ liệu cũ) ⇒ hộp "Chỉ số môi trường mới nhất" hiển thị **sai tầng**.
 *
 * ⚠ **Luật lọc (giữ nếu khớp BẤT KỲ điều kiện nào):**
 *   1. `floor_id` của bản ghi thuộc tập `floor_id` của phiên ⇒ **giữ**
 *      (đây là điều kiện **mạnh nhất** — phiên được gán tầng này ⇒ dữ liệu
 *      thuộc tầng này).
 *   2. Suy ra được `floor_number` (qua map `floor_id` → `floor_number`) và
 *      `floor_number` thuộc tập `floor_number` của phiên ⇒ **giữ**.
 *   3. Bản ghi **không** có `floor_id` ⇒ không xác định được tầng ⇒ **loại**
 *      (an toàn — không hiển thị tầng lạ).
 *
 * ⚠ **Vì sao dùng "hoặc" chứ không phải "và"?**
 *
 *   `floor_id` là SERIAL ⇒ 1 tầng có thể có `floor_id = 3` nhưng `floor_number
 *   = 2`. Nếu BE map (`/api/iot/floors`) và `trays[]` của phiên **mâu thuẫn**
 *   về `floor_number` của cùng 1 `floor_id` ⇒ dùng điều kiện "và" sẽ loại
 *   nhầm bản ghi **đúng** của phiên ⇒ hộp "chỉ số mới nhất" trống.
 *   ⇒ Dùng "hoặc" ⇒ giữ được cả 2 trường hợp, vẫn loại được dữ liệu rác của
 *     tầng khác (tầng khác ⇒ khác cả `floor_id` lẫn `floor_number`).
 *
 * @param records Bản ghi gốc (chưa lọc).
 * @param scope Phạm vi tầng của phiên (`buildSessionFloorScope`).
 * @param floorNumberByFloorId Map `floor_id` → `floor_number`.
 */
export function filterRecordsBySessionFloorScope<T extends { floor_id: number | null }>(
  records: readonly T[],
  scope: SessionFloorScope,
  floorNumberByFloorId: ReadonlyMap<number, number> = new Map(),
): T[] {
  // ⚠ Không có thông tin tầng nào ⇒ không lọc (giữ nguyên hành vi cũ).
  if (scope.floorIds.size === 0 && scope.floorNumbers.size === 0) {
    return [...records]
  }

  /*
   * ⚠ **2 điều kiện độc lập** — giữ nếu khớp **bất kỳ** điều kiện nào:
   *   1. `floor_id` thuộc tập tầng của phiên.
   *   2. Suy ra được `floor_number` và nó thuộc tập tầng của phiên.
   *
   *   ⇒ Dữ liệu rác của tầng khác (khác cả `floor_id` lẫn `floor_number`) vẫn
   *     bị loại; còn bản ghi **đúng** của phiên không bị loại nhầm khi BE map
   *     mâu thuẫn với `trays[]`.
   */
  const canCompareByNumber = scope.floorNumbers.size > 0

  return records.filter((record) => {
    const floorId = record.floor_id
    if (floorId == null) return false

    if (scope.floorIds.has(floorId)) return true

    const floorNumber = floorNumberByFloorId.get(floorId)
    if (floorNumber != null && canCompareByNumber) {
      return scope.floorNumbers.has(floorNumber)
    }

    return false
  })
}

/**
 * Sắp xếp bản ghi theo thời gian **giảm dần** (mới nhất trước).
 *
 * ⚠ Dùng cho hộp "Chỉ số môi trường mới nhất" và dòng đầu tiên của bảng
 *   "Dữ liệu cảm biến chi tiết" ⇒ 2 nơi **luôn khớp nhau**.
 *
 * ⚠ Tie-break theo `floor_id` tăng dần ⇒ thứ tự **ổn định** giữa các lần
 *   render (không nhảy loạn khi 2 tầng có cùng mốc thời gian).
 */
export function sortEnvironmentRecordsByTimeDesc<
  T extends { period_start?: string | null; floor_id?: number | null },
>(records: readonly T[]): T[] {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.period_start ?? '')
    const rightTime = Date.parse(right.period_start ?? '')
    const leftValid = Number.isFinite(leftTime)
    const rightValid = Number.isFinite(rightTime)

    // Bản ghi không có mốc thời gian ⇒ đẩy xuống cuối.
    if (leftValid !== rightValid) return leftValid ? -1 : 1
    if (leftValid && rightValid && leftTime !== rightTime) {
      return rightTime - leftTime
    }

    return (left.floor_id ?? 0) - (right.floor_id ?? 0)
  })
}
