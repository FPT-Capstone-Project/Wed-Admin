import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchReportsAnalytics, type ReportsAnalytics } from '../api/analytics.api'
import { retryApiErrors } from '../../../shared/api/retry-policy'

/**
 * Hook thống kê cho trang Báo cáo & Phân tích — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: mọi số liệu đến từ API GET.
 */

/** Query keys */
export const analyticsKeys = {
  all: ['reports-analytics'] as const,
  overview: () => [...analyticsKeys.all, 'overview'] as const,
}

/**
 * Số liệu tổng hợp cho trang Báo cáo.
 *
 * ## Caching
 *
 * - `staleTime: 60_000` — số liệu báo cáo thay đổi chậm, cache 1 phút.
 * - `retry: retryApiErrors` — chỉ thử lại lỗi tạm thời (timeout/mạng/5xx/429).
 *
 * ⚠ Không còn vòng lặp gọi endpoint theo từng tầng/phiên (N+1) — xem
 *   `fetchReportsAnalytics`.
 */
export function useReportsAnalytics(
  options?: Partial<UseQueryOptions<ReportsAnalytics, Error>>,
) {
  return useQuery<ReportsAnalytics, Error>({
    queryKey: analyticsKeys.overview(),
    queryFn: fetchReportsAnalytics,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: retryApiErrors,
    refetchOnWindowFocus: false,
    ...options,
  })
}
