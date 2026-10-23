import { apiClient } from '../../../shared/api/client'
import { ensureObject } from '../../../shared/api/response-normalizer'
import type { PaymentStatusResponse } from '../../../types/payment'

/**
 * Payment API — **read-only cho admin web**.
 *
 * Việc tạo link thanh toán PayOS do **app người dùng** thực hiện
 * (POST /api/payments/orders/{orderId}/payos). Admin chỉ cần theo dõi
 * trạng thái thanh toán để hỗ trợ vận hành.
 */
export const paymentApi = {
  /**
   * GET /api/payments/orders/{orderId}/status
   * Lấy trạng thái thanh toán PayOS hiện tại của đơn hàng.
   * READ-ONLY — không thay đổi payment hay order state.
   * Trả về null-safe fallback nếu response không đúng shape.
   */
  async getOrderStatus(
    orderId: number,
  ): Promise<PaymentStatusResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/payments/orders/${orderId}/status`,
    )
    return ensureObject<PaymentStatusResponse>(response.data)
  },
}
