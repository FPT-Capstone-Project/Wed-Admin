import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { paymentApi } from '../api/payment.api'
import type { PaymentStatusResponse } from '../../../types/payment'
import { isPaymentActive } from '../../../types/payment'

/**
 * Payment hooks — **read-only cho admin web**.
 *
 * Không có mutation: tạo link thanh toán PayOS do app người dùng thực hiện.
 */

/** Query keys */
export const paymentKeys = {
  all: ['payments'] as const,
  status: (orderId: number) =>
    [...paymentKeys.all, 'status', orderId] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────
/**
 * Trạng thái thanh toán PayOS của một đơn — **có thể là `null`**.
 *
 * ⚠ **Vì sao `null` mà không phải object mặc định?**
 *
 *   Trước đây khi API trả 404 (đơn `PENDING` chưa có bản ghi thanh toán) hoặc
 *   response sai shape, hook trả về object **mock**:
 *   `{ paymentStatus: 'UNPAID', amount: 0, paymentCode: '' }`.
 *
 *   ⇒ Hai hậu quả nghiêm trọng:
 *     1. UI hiển thị "Chưa thanh toán" + "0 đ" cho đơn **đã thanh toán** →
 *        dữ liệu sai trên màn hình.
 *     2. `isPaymentActive('UNPAID')` = true ⇒ **polling 3s chạy vô tận** dù
 *        không có giao dịch PayOS nào ⇒ spam request.
 *
 *   ⇒ Nay: không có thông tin thanh toán hợp lệ ⇒ `data = null` ⇒ UI fallback
 *     về dữ liệu chuẩn của đơn và polling **dừng hẳn**.
 */
export function useOrderPaymentStatus(
  orderId: number | null,
  options?: Partial<UseQueryOptions<PaymentStatusResponse | null, Error>>,
) {
  return useQuery<PaymentStatusResponse | null, Error>({
    queryKey: paymentKeys.status(orderId ?? -1),
    queryFn: async () => {
      try {
        const result = await paymentApi.getOrderStatus(orderId as number)
        // 404 / response sai shape ⇒ không có thông tin thanh toán ⇒ `null`.
        return result ?? null
      } catch {
        // ⚠ Lỗi mạng / 5xx ⇒ cũng coi như "chưa có thông tin thanh toán" ⇒
        //   trả `null` thay vì ném lỗi (tránh đỏ cả khối thanh toán) và để
        //   UI fallback về dữ liệu chuẩn của đơn.
        return null
      }
    },
    enabled: orderId !== null && orderId > 0,
    /*
     * ⚠ **Polling chỉ chạy khi có thông tin thanh toán hợp lệ.**
     *
     *   - `data` = `null` (404 / lỗi) ⇒ `status` = `undefined` ⇒
     *     `isPaymentActive(undefined)` = false ⇒ **dừng polling hẳn**.
     *   - Chỉ khi PayOS trả về giao dịch đang chạy (`PENDING` / `UNPAID`)
     *     mới poll tiếp để bắt trạng thái thanh toán.
     */
    refetchInterval: (query) => {
      const status = query.state.data?.data?.paymentStatus
      return isPaymentActive(status) ? 3_000 : false
    },
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    ...options,
  })
}
