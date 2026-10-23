/**
 * Orders — DTOs khớp Swagger.
 * Endpoint: /api/orders, /api/orders/{id}, /api/orders/{id}/cancel,
 *          /api/orders/rentals (POST tạo đơn mới).
 *
 * Lưu ý: endpoint list/get trả về order của CUSTOMER đang đăng nhập,
 * không phải tất cả orders. Để admin xem toàn bộ cần BE mở rộng scope.
 *
 * Mapping sang UI: `src/types/order.types.ts` định nghĩa `AppOrder`
 * (camelCase, status PENDING_TRAY_ASSIGNMENT/GROWING/...). Xem
 * `beOrderToUiOrder()` bên dưới.
 */

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'

export interface OrderItem {
  /** Mô tả tuỳ backend trả về (ví dụ: tên package + mushroomType). */
  item_id?: number
  order_id?: number
  package_id?: number
  mushroom_type_id?: number
  package_name?: string
  mushroom_type_name?: string
  growing_days?: number
  duration_days?: number
  unit_price?: number
  quantity?: number
  subtotal?: number
}

/** Order — schema tối thiểu dựa trên Swagger OrderStatus + PaymentStatus.
 *  BE hiện không công khai schema chi tiết của Order → best-effort. */
export interface Order {
  order_id: number
  order_code?: string
  user_id?: number
  customer_name?: string
  customer_email?: string
  status: OrderStatus
  payment_status?: PaymentStatus
  total_amount?: number
  items?: OrderItem[]
  created_at: string
  updated_at?: string
}

/** POST /api/orders/rentals */
export interface CreateRentalOrderRequest {
  packageId: number
  mushroomTypeId: number
}

/** PATCH /api/orders/{orderId}/cancel */
export interface CancelOrderRequest {
  reason?: string
}
