import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { orderApi } from '../api/order.api'
import type { Order } from '../../../types/order'

/**
 * Query keys
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: () => [...orderKeys.lists()] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
}

/**
 * Lưu ý quan trọng:
 * - Admin web chỉ ĐỌC đơn đặt. Việc tạo / hủy / thanh toán do **app người dùng**
 *   thực hiện, nên admin KHÔNG dùng mutation của order API.
 * - Tất cả API responses đã được unwrap về domain type ngay tại `order.api.ts`.
 * - `list()` luôn trả `Order[]` (không bao giờ `null`/`undefined`).
 * - `getById()` có thể trả `Order | null` nếu BE trả object rỗng → hook filter null.
 *
 * UI consumers (OrderManagementPage, etc.) luôn gọi `.map()` trên domain
 * array — không cần guard thêm vì đã đảm bảo ở API layer.
 */

// ─── Queries ──────────────────────────────────────────────────────────────

/** Default value khi query chưa sẵn sàng / lỗi → mảng rỗng để UI không crash. */
const EMPTY_ORDERS = Object.freeze([]) as unknown as Order[]

export function useOrders(
  options?: Partial<UseQueryOptions<Order[], Error>>,
) {
  return useQuery<Order[], Error>({
    queryKey: orderKeys.list(),
    queryFn: () => orderApi.list(),
    staleTime: 30_000,
    ...options,
  })
}

/** Helper: lấy danh sách orders an toàn cho UI consumers.
 *  Trả về mảng rỗng nếu query error / pending.
 */
export function useOrdersList(): {
  orders: Order[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  const { data, isLoading, isError, error, refetch } = useOrders()
  return {
    orders: Array.isArray(data) ? data : EMPTY_ORDERS,
    isLoading,
    isError,
    error: error ?? null,
    refetch: () => {
      void refetch()
    },
  }
}

export function useOrderDetail(
  id: number | null,
  options?: Partial<UseQueryOptions<Order | null, Error>>,
) {
  return useQuery<Order | null, Error>({
    queryKey: orderKeys.detail(id ?? -1),
    queryFn: async () => orderApi.getById(id as number),
    enabled: id !== null && id > 0,
    ...options,
  })
}
