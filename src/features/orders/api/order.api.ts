import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type { Order } from '../../../types/order'

/**
 * Order API — **read-only cho admin web**.
 *
 * Luồng tạo / hủy / thanh toán đơn do **app người dùng** thực hiện
 * (POST /api/orders/rentals, PATCH /api/orders/{id}/cancel,
 * POST /api/payments/orders/{id}/payos).
 *
 * Admin web chỉ cần đọc để theo dõi vận hành, nên các mutation cố ý
 * KHÔNG được export ở đây để tránh gọi nhầm từ giao diện quản trị.
 */
export const orderApi = {
  /** GET /api/orders (orders của user hiện tại)
   *
   *  LUÔN unwrap response về Order[] an toàn — chấp nhận:
   *  - `Order[]` (mảng trực tiếp)
   *  - `{ data: Order[] }`
   *  - `{ content: Order[] }`
   *  - ... → fallback `[]`
   */
  async list(): Promise<Order[]> {
    const response = await apiClient.get<unknown>('/api/orders')
    return ensureArray<Order>(response.data)
  },

  /** GET /api/orders/{orderId}
   *  Unwrap về Order | null an toàn.
   */
  async getById(orderId: number): Promise<Order | null> {
    const response = await apiClient.get<unknown>(`/api/orders/${orderId}`)
    return ensureObject<Order>(response.data)
  },
}
