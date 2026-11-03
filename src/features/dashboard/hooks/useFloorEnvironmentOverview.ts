import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { autoMistingApi } from '../../devices/api/iot.api'
import { useFloorList, iotKeys } from '../../devices/hooks/useIoT'
import { retryApiErrors } from '../../../shared/api/retry-policy'

/**
 * Môi trường (nhiệt độ / độ ẩm) theo tầng cho trang Tổng quan.
 *
 * ## Vì sao không dùng `Promise.all` như trước?
 *
 * Luồng cũ (`fetchFarmAnalytics`) gọi `/api/iot/floors/{id}/environment` cho
 * **từng tầng** trong một `Promise.all` rồi mới dựng trang. Hệ quả:
 *   - Một tầng lỗi ⇒ `Promise.all` reject ⇒ **toàn bộ trang Tổng quan** mất
 *     dữ liệu (cascade failure), kể cả các phần đã tải thành công.
 *   - Không hề có retry riêng cho từng tầng.
 *
 * → Hook này dùng `useQueries`: mỗi tầng là một query độc lập, lỗi của một
 *   tầng **không** ảnh hưởng tầng khác (chỉ tầng đó bị bỏ trống trên biểu đồ).
 *
 * ## Vì sao vẫn là N request?
 *
 * ⚠ BE **không** có endpoint gộp môi trường nhiều tầng. Telemetry là dữ liệu
 *   real-time theo tầng nên buộc phải gọi `/environment` cho từng tầng.
 *   → Đây là giới hạn của hợp đồng API, **không phải** mô hình N+1 do FE tự
 *   tạo ra (và khác với luồng KPI, đã gộp còn 1 request).
 *
 *   Tối ưu đã áp dụng:
 *   - Dùng **chung query key** với `useFloorEnvironment` (`iotKeys.floor`) ⇒
 *     cache được tái sử dụng giữa trang Tổng quan / Quản lý khay / Thiết bị,
 *     không tải lại cùng một tầng.
 *   - `staleTime: 60_000` ⇒ không polling liên tục (telemetry tổng quan không
 *     cần realtime 3s như bảng cảm biến).
 *   - `retry: retryApiErrors` ⇒ chỉ thử lại lỗi tạm thời, không retry 4xx.
 */

/** Một điểm môi trường của một tầng. */
export interface FloorEnvironmentPoint {
  floorId: number
  /** Tên tầng hiển thị trên trục X. */
  floorName: string
  temperature: number | null
  humidity: number | null
  /** `null` khi BE không trả trạng thái sức khoẻ. */
  healthy: boolean | null
}

export function useFloorEnvironmentOverview() {
  const floorsQuery = useFloorList({ staleTime: 60_000 })
  const floors = useMemo(() => floorsQuery.data ?? [], [floorsQuery.data])

  const queries = useQueries({
    queries: floors.map((floor) => ({
      // ⚠ CHUNG key với `useFloorEnvironment` ⇒ dùng lại cache sẵn có.
      queryKey: [...iotKeys.floor(floor.floor_id), 'environment'],
      queryFn: async () => {
        const result = await autoMistingApi.getEnvironment(floor.floor_id)
        return result
      },
      staleTime: 60_000,
      retry: retryApiErrors,
    })),
  })

  const points = useMemo<FloorEnvironmentPoint[]>(
    () =>
      floors
        .map((floor, index) => {
          const env = queries[index]?.data
          return {
            floorId: floor.floor_id,
            floorName:
              floor.floor_name || `Tầng ${floor.floor_number ?? floor.floor_id}`,
            temperature: env?.avgTemperature ?? null,
            humidity: env?.avgHumidity ?? null,
            healthy: env?.healthy ?? null,
          }
        })
        // Chỉ giữ tầng có **cả hai** số đo để biểu đồ không có điểm rỗng.
        .filter(
          (point) =>
            typeof point.temperature === 'number' &&
            typeof point.humidity === 'number',
        ),
    [floors, queries],
  )

  return {
    points,
    /** Số tầng có dữ liệu cảm biến hợp lệ. */
    floorsWithData: points.length,
    isLoading: floorsQuery.isLoading || queries.some((q) => q.isLoading),
    isError: floorsQuery.isError,
    error: floorsQuery.error ?? null,
    refetch: () => {
      void floorsQuery.refetch()
      queries.forEach((query) => void query.refetch())
    },
  }
}
