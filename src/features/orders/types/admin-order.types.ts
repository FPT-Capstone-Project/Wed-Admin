/**
 * Dòng đơn hàng cho Web Admin — **read-only**.
 *
 * ⚠ Vì sao cần type riêng (không dùng `AppOrder` của `types/order.types.ts`)?
 *
 *   `GET /api/orders` của BE **chỉ trả đơn của chính user đang đăng nhập**
 *   → Admin không thấy đơn của khách khác.
 *
 *   → Admin dựng lại danh sách đơn bằng cách **hợp nhất 3 nguồn GET**:
 *     1. `GET /api/orders`                        — đơn của chính admin (nếu có).
 *     2. `GET /api/cultivation-sessions/admin`    — có `order_id` + khách + gói.
 *     3. `GET /api/farm/sessions`                 — có `order_id` + khách + gói +
 *                                                   `mushroom_name` + `spawn_issued`.
 *
 *   Mỗi đơn có thể xuất hiện ở nhiều nguồn → gộp theo `order_id`, ưu tiên
 *   nguồn giàu thông tin hơn.
 */

/** Trạng thái đơn — **đúng 5 trạng thái thật của BE**. */
export type AdminOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'

import type { CultivationSessionStatus } from '../../sessions/types/session.types'

/** Nguồn dữ liệu đã dùng để dựng dòng đơn (để hiển thị nguồn dữ liệu). */
export type AdminOrderSource = 'order' | 'session' | 'farm'

export interface AdminOrderRow {
  /** `order_id` — khóa gộp. */
  orderId: number
  /** Mã đơn hiển thị (fallback `#<order_id>`). */
  orderCode: string
  customerName: string
  customerEmail: string
  customerPhone: string
  packageName: string
  mushroomName: string
  /** Trạng thái đơn (BE). */
  status: AdminOrderStatus
  /** Trạng thái phiên canh tác (nếu đơn đã tạo phiên). */
  sessionStatus: CultivationSessionStatus | null
  /** `session_id` của phiên gắn với đơn (nếu có). */
  sessionId: number | null
  /** Trạng thái thanh toán (từ `GET /api/orders` hoặc payment status). */
  paymentStatus: string
  /** Tổng tiền (chỉ có ở nguồn `order`). */
  totalAmount: number
  /** Số phôi đã cấp (từ nguồn `farm`). */
  spawnIssued: number | null
  createdAt: string
  /** Các nguồn đã dùng để dựng dòng này. */
  sources: AdminOrderSource[]
}
