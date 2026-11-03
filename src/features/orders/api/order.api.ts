import { normalizeOrder } from './order-normalizer'
import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type { Order } from '../../../types/order'

/**
 * Order API — **read-only cho admin web**.
 *
 * Luồng tạo / hủy / thanh toán đơn do **app người dùng** thực hiện
 * (POST /api/orders/cultivation, PATCH /api/orders/{id}/cancel,
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
    return ensureArray<unknown>(response.data).map(normalizeOrder)
  },

  /** GET /api/orders/{orderId}
   *  Unwrap về Order | null an toàn.
   */
  async getById(orderId: number): Promise<Order | null> {
    try {
      const response = await apiClient.get<unknown>(`/api/orders/${orderId}`)
      const raw = ensureObject<unknown>(response.data)
      return raw ? normalizeOrder(raw) : null
    } catch (error) {
      // 404 → đơn không tồn tại (hoặc không thuộc user đang đăng nhập).
      if (isNotFoundError(error)) return null
      throw error
    }
  },
}
