import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { autoMistingApi } from '../../devices/api/iot.api'
import { iotKeys } from '../../devices/hooks/useIoT'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import type { ClimateThresholds } from '../../rooms/utils/tray-climate.utils'
import { extractSessionClimateThresholds } from '../utils/session-climate-threshold.utils'

/**
 * Ngưỡng môi trường của các tầng thuộc phiên — **100% FE, không đụng BE**.
 *
 * ## Vì sao cần?
 *
 * Biểu đồ "Lịch sử cảm biến" cần ngưỡng canh tác để báo *"vượt / thấp hơn
 * ngưỡng"* trong tooltip — giống Dashboard.
 *
 * ⚠ **Không** sửa backend: đọc endpoint **read-only**
 *   `GET /api/iot/floors/{floorId}/auto-control` (chỉ cần đăng nhập) mà BE
 *   đã trả sẵn `floorSuggestion.common` — khoảng ngưỡng chung BE tính từ các
 *   profile nấm đang trồng trên tầng.
 *
 * ⚠ Lỗi ở đây **không** chặn biểu đồ — chỉ thiếu dòng cảnh báo ngưỡng.
 *
 * ⚠ Query dùng **chung key** `iotKeys.autoControlConfig` với
 *   `useAutoControlConfiguration` — cả hai phải trả về **cùng shape**
 *   (response đầy đủ `{ config, mode, ... }`) để cache không bị lệch shape.
 */
export function useSessionClimateThresholds(
  floorIds: readonly number[],
): Map<number, ClimateThresholds> {
  const queries = useQueries({
    queries: floorIds.map((floorId) => ({
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
      const thresholds = extractSessionClimateThresholds(query.data)
      if (!thresholds) return '-'
      return [
        thresholds.tempMin,
        thresholds.tempMax,
        thresholds.humidityMin,
        thresholds.humidityMax,
      ].join(':')
    })
    .join('|')

  const thresholds = useMemo(() => {
    const map = new Map<number, ClimateThresholds>()
    floorIds.forEach((floorId, index) => {
      const extracted = extractSessionClimateThresholds(queries[index]?.data)
      if (extracted) map.set(floorId, extracted)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorIds, signature])

  return thresholds
}
