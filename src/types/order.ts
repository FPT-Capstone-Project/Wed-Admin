/**
 * Orders — DTOs khớp Swagger.
 * Endpoint: /api/orders, /api/orders/{id}, /api/orders/{id}/cancel,
 *          /api/orders/cultivation (POST tạo đơn canh tác mới).
 *
 * Lưu ý: endpoint list/get trả về order của CUSTOMER đang đăng nhập,
 * không phải tất cả orders. Để admin xem toàn bộ cần BE mở rộng scope.
 *
 * Mapping sang UI: `src/types/order.types.ts` định nghĩa `AppOrder`
 * (camelCase, status PENDING_TRAY_ASSIGNMENT/GROWING/...). Xem
 * `beOrderToUiOrder()` bên dưới.
 */

/**
 * Trạng thái đơn hàng — **đồng bộ đúng 5 trạng thái của BE**.
 *
 * Nguồn: `Backend/database.sql` → `orders.status`
 * `CHECK (status IN ('PENDING','CONFIRMED','PROCESSING','COMPLETED','CANCELLED'))`.
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
  /** Mô tả tuỳ backend trả về (ví dụ: tên package + tên nấm). */
  item_id?: number
  order_id?: number
  package_id?: number
  mushroom_type_id?: number
  package_name?: string
  /**
   * Tên giống nấm — **nguyên bản** từ `mushroom_types.name`.
   *
   * ⚠ BE join `mushroom_types` và đặt tên cột là `mushroom_name`
   *   (xem `Backend/src/models/order.model.js` → `mt.name AS mushroom_name`),
   *   **không** phải `mushroom_type_name`.
   */
  mushroom_name?: string
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

/**
 * POST /api/orders/cultivation — tạo đơn canh tác.
 *
 * Swagger (`CreateCultivationOrderRequest`):
 *   - `packageId`      — gói thuê đang ACTIVE, thời lượng phải đủ cho
 *                        `growing_days` của giống nấm.
 *   - `mushroomTypeId` — giống nấm đang ACTIVE.
 *   - `quantity`       — số khay canh tác (mỗi khay cần 3 đơn vị phôi).
 */
export interface CreateCultivationOrderRequest {
  packageId: number
  mushroomTypeId: number
  /** Số khay canh tác được yêu cầu (>= 1). */
  quantity: number
}

/** PATCH /api/orders/{orderId}/cancel */
export interface CancelOrderRequest {
  reason?: string
}
