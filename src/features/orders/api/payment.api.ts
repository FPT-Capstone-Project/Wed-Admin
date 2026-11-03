import { apiClient } from '../../../shared/api/client'
import { ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type { PaymentStatusResponse } from '../../../types/payment'

/**
 * Payment API — **read-only cho admin web**.
 *
 * Việc tạo link thanh toán PayOS do **app người dùng** thực hiện
 * (POST /api/payments/orders/{orderId}/payos). Admin chỉ cần theo dõi
 * trạng thái thanh toán để hỗ trợ vận hành.
 *
 * ## Về HTTP 404
 *
 * ⚠ Đơn ở trạng thái `PENDING` chưa có bản ghi thanh toán ⇒ BE trả 404.
 *   Đây là trạng thái **bình thường**, không phải lỗi ⇒ `getOrderStatus()`
 *   trả `null` (hook sẽ dùng giá trị mặc định) thay vì ném lỗi làm đỏ
 *   phần thanh toán trong drawer chi tiết đơn.
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
    try {
      const response = await apiClient.get<unknown>(
        `/api/payments/orders/${orderId}/status`,
      )
      return ensureObject<PaymentStatusResponse>(response.data)
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
  },
}
