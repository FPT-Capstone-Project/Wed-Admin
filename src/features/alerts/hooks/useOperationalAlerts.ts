import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useFloorList } from '../../devices/hooks/useIoT'
import {
  buildOperationalAlerts,
  fetchAutoControlLogs,
  type BuiltAlerts,
} from '../api/alert.api'
import {
  useAllNotifications,
} from '../../notifications/hooks/useNotifications'
import { OPERATIONAL_NOTIFICATION_TYPES } from '../../notifications/types/notification.types'
import { filterTechnicalAlerts } from '../utils/filter-technical-alerts'

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
 *
 * ⚠ Cache giữ **toàn bộ** cảnh báo (chưa lọc theo tab) ⇒ các nơi dùng
 *   (Dashboard, tab 1) có thể tự lọc theo nhu cầu mà không phát sinh thêm
 *   request.
 *
 * ⚠ Thông báo lấy từ `useAllNotifications()` — **cùng cache** với tab 2
 *   ("Thông báo hệ thống") ⇒ 2 tab chỉ tạo **1 request** cho toàn bộ
 *   thông báo (TanStack Query dedupe theo query key).
 */
export function useOperationalAlerts(
    options?: Partial<UseQueryOptions<BuiltAlerts, Error>>,
) {
  const queryClient = useQueryClient()
  const floorsQuery = useFloorList({ staleTime: 60_000 })
  const notificationsQuery = useAllNotifications()

  const floors = floorsQuery.data
  const notifications = useMemo(
    () =>
      (notificationsQuery.data?.items ?? []).filter((item) =>
        OPERATIONAL_NOTIFICATION_TYPES.includes(
          (item.notification_type ?? '').toUpperCase(),
        ),
      ),
    [notificationsQuery.data],
  )

  /**
   * ⚠ Cache cảnh báo phải **làm mới** khi cache thông báo đổi.
   *
   *   Cache cảnh báo (`alertKeys.operational()`) được dựng từ cache thông báo
   *   ⇒ khi thông báo được đánh dấu đọc (hoặc có bản ghi mới), cache cảnh
   *   báo sẽ **stale** ⇒ badge của tab 1 và nội dung hiển thị lệch nhau.
   *
   *   ⇒ Invalidate lại cache cảnh báo mỗi khi cache thông báo thay đổi.
   */
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: alertKeys.operational() })
  }, [queryClient, notificationsQuery.dataUpdatedAt])

  return useQuery<BuiltAlerts, Error>({
    queryKey: alertKeys.operational(),
    queryFn: async () => {
      const floorList = floors ?? []
      const floorIds = floorList
        .map((floor) => floor.floor_id)
        .filter((id): id is number => typeof id === 'number' && id > 0)

      const logs =
        floorIds.length > 0
          ? await fetchAutoControlLogs(floorIds)
          : []

      return buildOperationalAlerts({
        logs,
        floors: floorList,
        notifications,
      })
    },
    enabled: !floorsQuery.isLoading && !notificationsQuery.isLoading,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Cảnh báo **thuộc tab 1** — "Cảnh báo vi khí hậu & IoT".
 *
 * ⚠ Dùng chung query key `alertKeys.operational()` ⇒ **không** phát sinh
 *   request mới (TanStack Query dedupe).
 *
 * ⚠ `counts` được tính lại **trên tập đã lọc** ⇒ badge / StatCard khớp
 *   đúng với những gì tab 1 thực sự hiển thị.
 */
export function useTechnicalAlerts(
    options?: Partial<UseQueryOptions<BuiltAlerts, Error>>,
) {
  const query = useOperationalAlerts(options)
  const { data } = query

  const technicalData = useMemo<BuiltAlerts | undefined>(() => {
    if (!data) return undefined

    const alerts = filterTechnicalAlerts(data.alerts)

    return {
      alerts,
      counts: {
        total: alerts.length,
        critical: alerts.filter((alert) => alert.severity === 'CRITICAL').length,
        warning: alerts.filter((alert) => alert.severity === 'WARNING').length,
        info: alerts.filter((alert) => alert.severity === 'INFO').length,
        unread: alerts.filter((alert) => !alert.isRead).length,
        fromIot: alerts.filter(
          (alert) => alert.source === 'IOT_AUTO_CONTROL',
        ).length,
        fromNotifications: alerts.filter(
          (alert) => alert.source === 'NOTIFICATION',
        ).length,
      },
    }
  }, [data])

  return { ...query, data: technicalData }
}
