/**
 * Hook lịch sử IoT theo khay — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không ghi telemetry, không ghi
 *   nhật ký vận hành, không chuyển giai đoạn.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchTrayHistory, type TrayHistoryBundle } from '../api/tray-history.api'

/** Query keys */
export const trayHistoryKeys = {
  all: ['tray-history'] as const,
  tray: (trayId: number) => [...trayHistoryKeys.all, trayId] as const,
}

/**
 * Lịch sử vận hành + telemetry thật của một khay.
 *
 * @param trayId `cultivation_trays.tray_id` — `null` khi chưa chọn khay.
 */
export function useTrayHistory(
  trayId: number | null,
  options?: Partial<UseQueryOptions<TrayHistoryBundle, Error>>,
) {
  return useQuery<TrayHistoryBundle, Error>({
    queryKey: trayHistoryKeys.tray(trayId ?? -1),
    queryFn: () => fetchTrayHistory(trayId as number),
    enabled: trayId !== null && trayId > 0,
    staleTime: 60_000,
    ...options,
  })
}
