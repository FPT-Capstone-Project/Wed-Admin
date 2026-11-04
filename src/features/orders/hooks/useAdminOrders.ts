import { useMemo } from 'react'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  fetchAllAdminOrders,
  type AdminOrderQuery,
} from '../api/order.api'
import { mergeOrderSources } from '../utils/merge-order-sources'
import { useAdminCultivationSessions } from '../../sessions/hooks/useAdminCultivationSessions'
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
  // ⚠ `pageSize` lớn nhất BE cho phép (100) ⇒ bọt được nhiều phiên nhất
  //   có thể để bổ sung trạng thái cho đơn. Nguồn phụ lỗi KHÔNG làm hỏng
  //   bảng đơn → chỉ hiện cảnh báo nguồn thiếu.
  const sessionsQuery = useAdminCultivationSessions(
    { pageSize: 100 },
    { retry: false, staleTime: 60_000 },
  )

  const orders = useMemo(
    () =>
      mergeOrderSources(
        ordersQuery.data ?? [],
        sessionsQuery.data?.items ?? [],
        [],
      ),
    [ordersQuery.data, sessionsQuery.data?.items],
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
