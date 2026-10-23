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
export function useOrderPaymentStatus(
  orderId: number | null,
  options?: Partial<UseQueryOptions<PaymentStatusResponse, Error>>,
) {
  return useQuery<PaymentStatusResponse, Error>({
    queryKey: paymentKeys.status(orderId ?? -1),
    queryFn: async () => {
      const result = await paymentApi.getOrderStatus(orderId as number)
      // Nếu API trả null (response không đúng shape) → trả về default
      if (!result) {
        return {
          success: false,
          data: {
            orderId: orderId ?? 0,
            orderStatus: 'PENDING' as const,
            paymentStatus: 'UNPAID' as const,
            paymentCode: '',
            amount: 0,
          },
        }
      }
      return result
    },
    enabled: orderId !== null && orderId > 0,
    // Polling khi payment còn active (PENDING/UNPAID)
    refetchInterval: (query) => {
      const status = query.state.data?.data?.paymentStatus
      return isPaymentActive(status) ? 3_000 : false
    },
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    ...options,
  })
}
