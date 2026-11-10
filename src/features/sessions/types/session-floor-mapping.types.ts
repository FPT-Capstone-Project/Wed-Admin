/**
 * Tầng đã map sang thiết bị IoT — dùng cho tab "Lệnh thiết bị" của drawer
 * phiên canh tác.
 *
 * ⚠ **Vì sao không dùng thẳng `CultivationFloorMapping`?**
 *
 *   Schema Swagger của `GET /api/iot/floors` **không khai báo `floor_id`**:
 *
 *   ```ts
 *   data?: {
 *     room_id: number
 *     floor_number: number
 *     floor_name: string
 *     master_id: number
 *     node_address: number
 *     misting_ssr_channel: number
 *     status?: 'ACTIVE' | 'INACTIVE'
 *     total_rows?: number | null
 *     total_columns?: number | null
 *   }[]
 *   ```
 *
 *   ⇒ Ở runtime `floor_id` có thể là `undefined` (BE có thể không trả cột
 *   này, hoặc tên cột khác). Nếu FE tin chắc `floor_id` luôn có mặt ⇒ mọi
 *   nơi lọc "tầng của phiên" sẽ rơi hết ⇒ danh sách tầng trống và tab
 *   "Lệnh thiết bị" không có dữ liệu.
 *
 *   → Ta chuẩn hoá về type này với `floorId: number | null` để **bắt buộc**
 *     mọi nơi phải xử lý trường hợp thiếu, thay vì tin vào `floor_id`.
 */

/** Tầng đã map — đã chuẩn hoá từ response `GET /api/iot/floors`. */
export interface SessionFloorMapping {
  /**
   * `floor_id` của BE (`cultivation_floors.floor_id`).
   *
   * ⚠ `null` nếu endpoint **không** trả cột này ⇒ phải fallback sang cặp
   *   `room_id` + `floor_number` (xem `utils/session-floor-matching.utils.ts`).
   */
  floorId: number | null
  /** `room_id` — phòng chứa tầng (nhiều tầng có thể cùng một phòng). */
  roomId: number | null
  /** Số thứ tự tầng trong phòng. */
  floorNumber: number | null
  /** Tên hiển thị của tầng (vd "Tầng 1"). */
  floorName: string | null
  /** Master RS485 phục vụ tầng. */
  masterId: number | null
  /** Địa chỉ node RS485. */
  nodeAddress: number | null
  /** Trạng thái map (`ACTIVE` / `INACTIVE`). */
  status: string | null
  /** Số hàng của tầng. */
  totalRows: number | null
  /** Số cột của tầng. */
  totalColumns: number | null
}
