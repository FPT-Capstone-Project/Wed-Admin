import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchFarmAnalytics, type FarmAnalytics } from '../api/analytics.api'

/**
 * Hook thống kê trang trại — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: mọi số liệu đến từ API GET.
 */

/** Query keys */
export const analyticsKeys = {
  all: ['farm-analytics'] as const,
  overview: () => [...analyticsKeys.all, 'overview'] as const,
}

/**
 * Tổng hợp số liệu toàn trang trại từ 8 endpoint GET.
 */
export function useFarmAnalytics(
  options?: Partial<UseQueryOptions<FarmAnalytics, Error>>,
) {
  return useQuery<FarmAnalytics, Error>({
    queryKey: analyticsKeys.overview(),
    queryFn: fetchFarmAnalytics,
    staleTime: 60_000,
    ...options,
  })
}
