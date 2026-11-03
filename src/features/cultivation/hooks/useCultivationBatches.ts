import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchCultivationBatches, type BuiltBatches } from '../api/cultivation.api'

/**
 * Hook dữ liệu canh tác — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không chuyển giai đoạn, không ghi
 *   nhận kiểm tra phôi, không upload ảnh.
 */

/** Query keys */
export const cultivationKeys = {
  all: ['cultivation-batches'] as const,
  list: () => [...cultivationKeys.all, 'list'] as const,
}

/**
 * Danh sách mẻ nấm, gộp từ `/api/cultivation-sessions/admin`,
 * `/api/farm/sessions` và `/api/farm/sessions/{id}/spawn-inspections`.
 */
export function useCultivationBatches(
  options?: Partial<UseQueryOptions<BuiltBatches, Error>>,
) {
  return useQuery<BuiltBatches, Error>({
    queryKey: cultivationKeys.list(),
    queryFn: fetchCultivationBatches,
    staleTime: 60_000,
    ...options,
  })
}
