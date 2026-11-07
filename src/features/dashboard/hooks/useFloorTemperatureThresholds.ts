import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { autoMistingApi } from '../../devices/api/iot.api'
import { iotKeys } from '../../devices/hooks/useIoT'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import {
  extractTemperatureBounds,
  type TemperatureBounds,
} from '../utils/temperature-threshold.utils'

/**
 * Ngưỡng nhiệt độ fallback cho các tầng của Dashboard — **100% FE**.
 *
 * ## Vì sao cần hook này?
 *
 * `GET /api/analytics/dashboard/environment-history` trả `thresholds` từ
 * `iot_auto_control_configs`, nhưng `temperature_min`/`temperature_max` **NULL**
 * trừ khi cấu hình bật làm mát (`cooling_enabled = true`). ⇒ Tầng chỉ bật
 * tưới phun sẽ không có ngưỡng nhiệt độ ⇒ tooltip không báo vượt/thấp ngưỡng
 * nhiệt độ.
 *
 * → Hook này đọc `GET /api/iot/floors/{floorId}/auto-control` (read-only) và
 *   suy ra ngưỡng nhiệt độ từ `floorSuggestion` (khoảng chung BE đã giao).
 *
 * ⚠ **Không** sửa backend. Endpoint này chỉ cần đăng nhập ⇒ Admin web đọc
 *   được. Lỗi ở đây **không** chặn biểu đồ — chỉ thiếu dòng cảnh báo nhiệt
 *   độ, các phần còn lại vẫn hiển thị bình thường.
 */
export function useFloorTemperatureThresholds(
  floorIds: readonly number[],
): Map<number, TemperatureBounds> {
  const queries = useQueries({
    queries: floorIds.map(floorId => ({
      queryKey: iotKeys.autoControlConfig(floorId),
      queryFn: async () => {
        const result = await autoMistingApi.getAutoControlConfiguration(floorId)
        return result ?? {}
      },
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: retryApiErrors,
    })),
  })

  /**
   * Chữ ký nội dung của map — dùng làm dependency thay vì mảng `queries`
   * (mảng đó được tạo mới mỗi lần render ⇒ `useMemo` không bao giờ giữ
   * được giá trị).
   */
  const signature = queries
    .map((query) => {
      const bounds = extractTemperatureBounds(query.data)
      return bounds ? `${bounds.tempMin}:${bounds.tempMax}` : '-'
    })
    .join('|')

  const bounds = useMemo(() => {
    const map = new Map<number, TemperatureBounds>()
    floorIds.forEach((floorId, index) => {
      const extracted = extractTemperatureBounds(queries[index]?.data)
      if (extracted) map.set(floorId, extracted)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorIds, signature])

  return bounds
}
