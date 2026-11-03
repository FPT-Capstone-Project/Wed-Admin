import { mergeOrderSources } from '../utils/merge-order-sources'
import { useMemo } from 'react'
import { useOrders } from './useOrders'
import { useSessions } from '../../sessions/hooks/useSessions'
import type {
  AdminOrderRow,
} from '../types/admin-order.types'

/** Đơn hàng lấy từ /api/orders và bổ sung danh tính từ một nguồn /api/farm/sessions.
 * Không suy đoán tổng tiền, tên gói, ngày tạo đơn từ số lượng khay/phôi.
 */
export function useAdminOrders(): {
  orders: AdminOrderRow[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  sourceErrors: { source: string; error: Error }[]
  refetch: () => void
} {
  // ── Nguồn chính: `/api/orders` ──────────────────────────────────────
  const ordersQuery = useOrders()

  // ── Nguồn phụ: `/api/farm/sessions` ─────────────────────
  // Không retry 404; UI hiển thị cảnh báo nguồn dữ liệu bổ sung.
  const sessionsQuery = useSessions(
    {},
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

  // ⚠ Chỉ nguồn CHÍNH mới quyết định trạng thái lỗi của trang.
  //   Lỗi của API phụ chỉ làm mất thông tin bổ sung, không chặn bảng đơn nhưng phải hiển thị cảnh báo nguồn thiếu.
  const isLoading = ordersQuery.isLoading
  const isError = ordersQuery.isError
  const error = ordersQuery.error ?? null

  return {
    orders,
    isLoading,
    isError,
    error,
    sourceErrors: [
      ...(sessionsQuery.isError ? [{ source: 'danh sách phiên canh tác', error: sessionsQuery.error }] : []),
    ],
    refetch: () => {
      void ordersQuery.refetch()
      void sessionsQuery.refetch()
    },
  }
}
