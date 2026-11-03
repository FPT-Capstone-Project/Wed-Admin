import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useFloorList } from '../../devices/hooks/useIoT'
import {
  buildOperationalAlerts,
  fetchAutoControlLogs,
  fetchOperationalNotifications,
  type BuiltAlerts,
} from '../api/alert.api'

/**
 * Hook cảnh báo vận hành — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không xác nhận / đánh dấu đã đọc
 *   cảnh báo (BE không có endpoint cho Admin, và các endpoint ghi của
 *   notification thuộc app người dùng).
 */

/** Query keys */
export const alertKeys = {
  all: ['alerts'] as const,
  operational: () => [...alertKeys.all, 'operational'] as const,
}

/**
 * Danh sách cảnh báo vận hành, gộp từ:
 *   - `GET /api/iot/floors/{floorId}/auto-control/logs` (mọi tầng)
 *   - `GET /api/notifications` (nhóm vận hành)
 */
export function useOperationalAlerts(
  options?: Partial<UseQueryOptions<BuiltAlerts, Error>>,
) {
  const floorsQuery = useFloorList({ staleTime: 60_000 })

  return useQuery<BuiltAlerts, Error>({
    queryKey: alertKeys.operational(),
    queryFn: async () => {
      const floors = floorsQuery.data ?? []
      const floorIds = floors
        .map((floor) => floor.floor_id)
        .filter((id): id is number => typeof id === 'number' && id > 0)

      const [logs, notifications] = await Promise.all([
        floorIds.length > 0 ? fetchAutoControlLogs(floorIds) : Promise.resolve([]),
        fetchOperationalNotifications().catch(() => []),
      ])

      return buildOperationalAlerts({ logs, floors, notifications })
    },
    enabled: !floorsQuery.isLoading,
    staleTime: 30_000,
    ...options,
  })
}
