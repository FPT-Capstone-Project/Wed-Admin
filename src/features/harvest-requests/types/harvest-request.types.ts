/**
 * DTO của `GET /api/harvest-requests/admin` (WF-04 — yêu cầu nhận nấm).
 *
 * ⚠ **Vì sao khai báo tay mà không dùng `components['schemas']`?**
 *   Swagger của BE khai báo response `200` với `content?: never` ⇒
 *   `openapi-typescript` **không** sinh schema cho endpoint này (xem
 *   `src/types/api-schema.d.ts` — path `/api/harvest-requests/admin`).
 *   ⇒ Ta khai báo tường minh theo đúng shape BE trả về (đã đối chiếu với
 *   `Backend/src/models/harvestRequest.model.js` + `database.sql`).
 *
 * ⚠ Mọi trường đều được coi là **có thể thiếu** ở tầng normalizer ⇒ UI
 *   không bao giờ crash vì BE bỏ bớt field.
 */

/** Hình thức nhận hàng mà khách chọn (WF-04). */
export type HarvestRequestMethod = 'PICKUP' | 'DELIVERY'

/**
 * Trạng thái yêu cầu nhận nấm.
 *
 * ⚠ BE có thể trả thêm giá trị mới ⇒ tra cứu luôn an toàn qua
 *   `presentStatus(HARVEST_REQUEST_STATUS_DICTIONARY, ...)`.
 */
export type HarvestRequestStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'

/** 1 dòng của `GET /api/harvest-requests/admin`. */
export interface HarvestRequestRow {
  /** Mã yêu cầu nhận nấm (`harvest_requests.harvest_request_id`). */
  harvest_request_id: number
  /** Phiên canh tác liên quan. */
  session_id: number
  /** Hình thức nhận: tự đến trang trại hay giao tận nơi. */
  harvest_method: HarvestRequestMethod | null
  /** Lịch hẹn khách đến nhận (ISO) — chỉ có với `PICKUP`. */
  scheduled_at: string | null
  /** Trạng thái yêu cầu. */
  status: HarvestRequestStatus | string
  /** Ghi chú của khách về cách nhận. */
  customer_note: string | null
  /** Thời điểm xác nhận bàn giao. */
  confirmed_at: string | null
  /** Thời điểm hoàn tất bàn giao. */
  completed_at: string | null
  /** ID nhân viên xác nhận (BE **không** trả tên) — map qua `GET /api/users`. */
  confirmed_by: number | null
  /** Địa chỉ giao hàng (chỉ có với `DELIVERY`). */
  delivery_address: string | null
  /** Đơn hàng gốc. */
  order_id: number | null
  /** Mã đơn hàng gốc (vd `ORD-0001`). */
  order_code: string | null
  /** ID khách hàng. */
  customer_id: number | null
  /** Tên khách hàng. */
  customer_name: string | null
  /** Số điện thoại khách. */
  customer_phone: string | null
  /** Email khách. */
  customer_email: string | null
  /** Trạng thái hiện tại của phiên canh tác. */
  session_status: string | null
}

/** Kết quả gọi API — đã unwrap + chuẩn hoá. */
export interface HarvestRequestListResult {
  /** Các yêu cầu nhận nấm (mới nhất trước — BE đã sort sẵn). */
  items: HarvestRequestRow[]
  /** Tổng số bản ghi BE báo (`total`). */
  total: number
}
