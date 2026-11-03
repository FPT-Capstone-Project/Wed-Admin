import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchDashboardMetrics } from '../api/dashboard.api'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import type { DashboardAnalyticsData } from '../../../types/dashboard'

/**
 * Hook số liệu tổng quan Dashboard — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: endpoint là GET, dữ liệu đến từ BE.
 */

/** Query keys — dùng chung key để các màn hình invalidate giống nhau. */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  analytics: () => [...dashboardKeys.all, 'analytics'] as const,
}

/**
 * Số liệu KPI trang Tổng quan — từ `GET /api/analytics/dashboard`.
 *
 * ## Caching
 *
 * - `staleTime: 60_000` — số liệu tổng quan là số liệu **tích lũy toàn thời gian**
 *   (doanh thu đã trả, số khay đã dùng, tỷ lệ chất lượng thu hoạch), thay đổi
 *   chậm ⇒ cache 1 phút là đủ, tránh gọi lại mỗi lần chuyển tab.
 * - `gcTime: 5 * 60_000` — giữ cache 5 phút để quay lại trang không phải
 *   chờ skeleton (khớp `gcTime` mặc định của `QueryProvider`).
 * - `retry: retryApiErrors` — chỉ thử lại 1 lần với lỗi tạm thời (timeout,
 *   mạng, 5xx, 429). Lỗi 4xx (401/403/404) không retry vì thử lại cũng
 *   không thành công.
 * - `refetchOnWindowFocus: false` — số liệu tích lũy, không cần làm mới khi
 *   người dùng quay lại tab.
 */
export function useDashboardMetrics(
  options?: Partial<UseQueryOptions<DashboardAnalyticsData, Error>>,
) {
  return useQuery<DashboardAnalyticsData, Error>({
    queryKey: dashboardKeys.analytics(),
    queryFn: fetchDashboardMetrics,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: retryApiErrors,
    refetchOnWindowFocus: false,
    ...options,
  })
}
