/**
 * Dòng đơn hàng cho Web Admin — **read-only**.
 *
 * ⚠ Vì sao cần type riêng (không dùng `Order` của `types/order.ts`)?
 *
 *   `GET /api/orders` của BE **chỉ trả đơn của chính user đang đăng nhập**
 *   → Admin không thấy đơn của khách khác.
 *
 *   → Endpoint quản trị `GET /api/orders/admin` trả về **mọi đơn của mọi
 *     khách hàng** (roles 1 = Admin, 2 = Farm Operator) ⇒ dùng làm nguồn
 *     chính cho trang "Đơn đặt từ App".
 *
 *   Payload này **phẳng (flat)** và đã gộp theo đơn: tên gói / tên nấm là
 *   chuỗi nhiều mục nối bằng dấu phẩy, `quantity` là tổng số khay của các
 *   item, các cột tiền là chuỗi (Postgres `numeric`).
 *
 *   ⚠ BE **không** sinh `order_code` ⇒ hiển thị mã đơn bằng `#<order_id>`.
 */

/** Trạng thái đơn — **đúng 5 trạng thái thật của BE**. */
export type AdminOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'

import type { PaymentStatus } from '../../../types/order'
import type { CultivationSessionStatus } from '../../sessions/types/session.types'

/** Nguồn dữ liệu đã dùng để dựng dòng đơn (để hiển thị nguồn dữ liệu). */
export type AdminOrderSource = 'order' | 'session' | 'farm'

/**
 * Payload 1 đơn từ `GET /api/orders/admin`.
 *
 * ⚠ Giữ nguyên `snake_case` của BE (quy ước chung của module).
 */
export interface AdminOrderDto {
  /** `orders.order_id` — khóa gộp. */
  order_id: number
  /** `orders.user_id` (BE đặt tên là `customer_id`). */
  customer_id: number | null
  customer_name: string | null
  customer_email: string | null
  /** Tên gói thuê — BE gộp nhiều item bằng dấu phẩy. */
  package_name: string | null
  /** Tên giống nấm — BE gộp nhiều item bằng dấu phẩy. */
  mushroom_name: string | null
  /** Tổng số khay (= tổng `quantity` của các item). */
  quantity: number | null
  /** Tổng tiền item (chuỗi — Postgres `numeric`). */
  total_price: string | null
  subtotal: string | null
  discount: string | null
  shipping_fee: string | null
  /** Tổng tiền thực thu (sau giảm giá + phí vận chuyển). */
  total_amount: string | null
  /** Trạng thái đơn (BE). */
  status: AdminOrderStatus
  /** Trạng thái thanh toán — lấy từ `orders.payment_status`. */
  payment_status: PaymentStatus | null
  created_at: string | null
  updated_at: string | null
}

export interface AdminOrderRow {
  /** `order_id` — khóa gộp. */
  orderId: number
  /** Mã đơn hiển thị (BE không sinh `order_code` ⇒ fallback `#<order_id>`). */
  orderCode: string
  /** `customer_id` — id tài khoản khách sở hữu đơn. */
  customerId: number | null
  customerName: string
  customerEmail: string
  customerPhone: string
  packageName: string
  mushroomName: string
  /** Tổng số khay của đơn (từ nguồn `order`). */
  quantity: number | null
  /**
   * Trạng thái đơn — giá trị trực tiếp từ BE (`orders.status`) **hoặc** trạng
   * thái **dẫn xuất** từ trạng thái phiên canh tác.
   */
  status: AdminOrderStatus
  /**
   * `true` khi `status` được **suy ra** từ trạng thái phiên (không phải giá
   * trị trực tiếp từ `orders.status` của BE).
   *
   * ⚠ Xem `derive-order-status.ts` — BE có lỗi quên update `orders.status` ở
   *   luồng bàn giao thu hoạch ⇒ đơn kẹt "Đang xử lý" dù phiên đã xong.
   */
  statusDerived: boolean
  /** Trạng thái phiên canh tác (nếu đơn đã tạo phiên). */
  sessionStatus: CultivationSessionStatus | null
  /** `session_id` của phiên gắn với đơn (nếu có). */
  sessionId: number | null
  /** Trạng thái thanh toán (từ `GET /api/orders/admin` hoặc payment status). */
  paymentStatus: string
  /** Tổng tiền (chỉ có ở nguồn `order`). */
  totalAmount: number
  /** Số phôi đã cấp (từ nguồn `farm`). */
  spawnIssued: number | null
  createdAt: string | null
  updatedAt: string | null
  /** Các nguồn đã dùng để dựng dòng này. */
  sources: AdminOrderSource[]
}
