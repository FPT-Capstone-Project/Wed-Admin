import { useQuery } from '@tanstack/react-query'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import { fetchAdminHarvestRequests } from '../api/harvest-request.api'

/** Query key cho `GET /api/harvest-requests/admin`. */
export const harvestRequestKeys = {
  all: ['harvest-requests', 'admin'] as const,
}

/**
 * Danh sách **yêu cầu nhận nấm** (WF-04) — `GET /api/harvest-requests/admin`.
 *
 * ⚠ Endpoint dành cho Admin (role 1) + Farm Operator (role 2).
 *
 * ⚠ BE **không** hỗ trợ lọc / phân trang server-side cho endpoint này
 *   ⇒ hook trả về **toàn bộ** danh sách, UI tự lọc client-side.
 */
export function useAdminHarvestRequests() {
  return useQuery({
    queryKey: harvestRequestKeys.all,
    queryFn: fetchAdminHarvestRequests,
    staleTime: 30_000,
    retry: retryApiErrors,
  })
}
