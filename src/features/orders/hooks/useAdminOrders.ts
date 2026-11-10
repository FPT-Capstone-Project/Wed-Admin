import { useMemo } from 'react'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  fetchAllAdminOrders,
  type AdminOrderQuery,
} from '../api/order.api'
import { mergeOrderSources } from '../utils/merge-order-sources'
import { useAllAdminCultivationSessionsDetailed } from '../../sessions/hooks/useAdminCultivationSessions'
import type { AdminOrderDto, AdminOrderRow } from '../types/admin-order.types'

/** Query keys cho endpoint quản trị đơn hàng. */
export const adminOrderKeys = {
  all: ['admin-orders'] as const,
  list: (query: AdminOrderQuery) =>
    [...adminOrderKeys.all, 'list', query] as const,
}

/**
 * Danh sách đơn hàng của **toàn bộ khách hàng**.
 *
 * ⚠ Nguồn chính: `GET /api/orders/admin` (roles 1 = Admin, 2 = Farm Operator).
 *   Đây là endpoint **mới** — trước đây trang này phải hợp nhất 3 nguồn
 *   (`/api/orders` + `/api/farm/sessions` × 2) vì `/api/orders` chỉ trả đơn
 *   của chính user đăng nhập.
 *
 * ⚠ Vì sao kéo **toàn bộ** trang? `GET /api/orders/admin` **không** hỗ trợ
 *   lọc theo trạng thái hay từ khóa ⇒ UI cần tập dữ liệu đầy đủ để lọc
 *   tab trạng thái + tìm kiếm ở client. `fetchAllAdminOrders` tự đọc
 *   `pagination.totalPages` rồi gọi tiếp các trang còn lại.
 *
 * ⚠ Nguồn phụ: `GET /api/cultivation-sessions/admin` — bổ sung **trạng thái
 *   phiên canh tác** cho đơn (đơn đã tạo phiên thì có trạng thái phiên).
 *   Nguồn phụ lỗi KHÔNG làm hỏng bảng đơn → chỉ hiện cảnh báo nguồn thiếu.
 *
 * ⚠ **Vì sao tải TOÀN BỘ phiên (mọi trang) chứ không chỉ trang 1?**
 *   BE có lỗi: luồng bàn giao thu hoạch set `cultivation_sessions.status =
 *   'COMPLETED'` mà **không** update `orders.status` ⇒ đơn kẹt "Đang xử lý".
 *   FE sửa bằng cách **suy ra** trạng thái đơn từ trạng thái phiên — nhưng
 *   chỉ suy ra được khi đã nắm **đủ** mọi phiên của đơn ⇒ phải tải hết các
 *   trang. Xem `derive-order-status.ts`.
 */
export function useAdminOrders(
  query: AdminOrderQuery = {},
  options?: Partial<UseQueryOptions<AdminOrderDto[], Error>>,
) {
  const ordersQuery = useQuery<AdminOrderDto[], Error>({
    queryKey: adminOrderKeys.list(query),
    queryFn: () => fetchAllAdminOrders({ pageSize: query.pageSize ?? 100 }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    ...options,
  })

  // Nguồn phụ: trạng thái phiên của từng đơn.
  // ⚠ Tải **toàn bộ** trang phiên ⇒ biết đủ phiên của mọi đơn ⇒ suy ra được
  //   trạng thái đơn (đơn kẹt "Đang xử lý" dù phiên đã hoàn tất).
  // ⚠ Nguồn phụ lỗi KHÔNG làm hỏng bảng đơn → chỉ hiện cảnh báo nguồn thiếu.
  const sessionsQuery = useAllAdminCultivationSessionsDetailed({
    retry: false,
    staleTime: 60_000,
  })

  const orders = useMemo(
    () =>
      mergeOrderSources(
        ordersQuery.data ?? [],
        sessionsQuery.data?.items ?? [],
        [],
        sessionsQuery.data?.complete ?? false,
      ),
    [ordersQuery.data, sessionsQuery.data?.items, sessionsQuery.data?.complete],
  )

  return {
    orders,
    isLoading: ordersQuery.isLoading,
    isFetching: ordersQuery.isFetching,
    isError: ordersQuery.isError,
    error: ordersQuery.error ?? null,
    sourceErrors: sessionsQuery.isError
      ? [{ source: 'danh sách phiên canh tác', error: sessionsQuery.error }]
      : [],
    refetch: () => {
      void ordersQuery.refetch()
      void sessionsQuery.refetch()
    },
  }
}

/**
 * Hook rút gọn cho UI: luôn trả mảng đơn (rỗng khi chưa tải / lỗi).
 */
export function useAdminOrdersList(
  query: AdminOrderQuery = {},
): {
  orders: AdminOrderRow[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  const { orders, isLoading, isError, error, refetch } = useAdminOrders(query)
  return { orders, isLoading, isError, error, refetch }
}
