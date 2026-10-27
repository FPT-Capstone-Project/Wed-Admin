/**
 * Hook gộp telemetry thật (từ IoT /environment) vào `Tier[]` của rooms feature.
 *
 * Mapping CultivationRoom.room_id → CultivationFloorMapping.floor_number
 * thông qua `/api/iot/floors` (BE trả `{ room_id, floor_number, ... }`).
 *
 * Tier nào KHÔNG có floor mapping → giữ DEFAULT_TELEMETRY (mock), không lỗi.
 * Field nào BE không trả → set `null` để UI hiển thị "—".
 */
import { useQueries } from '@tanstack/react-query'
import { autoMistingApi } from '../../devices/api/iot.api'
import { useFloorList, iotKeys } from '../../devices/hooks/useIoT'
import { useCultivationTiers } from './useCultivation'
import { DEFAULT_TELEMETRY } from './cultivation.defaults'
import type { Tier, TierTelemetry } from '../../../types/room.types'
import type { CultivationFloorMapping } from '../../../types/iot'
import type { ClimateThresholds } from '../utils/tray-climate.utils'
import { resolveFallbackThresholds } from '../utils/tray-climate.utils'

export type EnvironmentSource = 'real' | 'mock'

export interface TierWithEnvironment {
  tier: Tier
  source: EnvironmentSource
  /** null khi field không có data */
  liveTemperature: number | null
  liveHumidity: number | null
  /**
   * Ngưỡng canh tác đang áp dụng cho tầng — lấy từ `thresholds` mà BE
   * trả kèm trong `GET /api/iot/floors/{id}/environment`.
   *
   * `null` khi tầng chưa có cấu hình auto-control → UI không tô màu cảnh
   * báo (trung tính) thay vì đoán sai ngưỡng.
   */
  thresholds: ClimateThresholds | null
}

/** Chuyển cấu hình auto-control của BE → ngưỡng hiển thị. */
function toClimateThresholds(
  thresholds: {
    temperature_min?: number | null
    temperature_max?: number | null
    humidity_min?: number | null
    humidity_max?: number | null
  } | null
  | undefined,
): ClimateThresholds | null {
  if (!thresholds) return null

  const tempMin = thresholds.temperature_min ?? null
  const tempMax = thresholds.temperature_max ?? null
  const humidityMin = thresholds.humidity_min ?? null
  const humidityMax = thresholds.humidity_max ?? null

  if (
    tempMin == null &&
    tempMax == null &&
    humidityMin == null &&
    humidityMax == null
  ) {
    return null
  }

  return { tempMin, tempMax, humidityMin, humidityMax }
}

export function useTiersWithEnvironment() {
  const tiersQuery = useCultivationTiers({ staleTime: 60_000 })

  /** Room ID → floor ID (`cultivation_floors.floor_id` của BE). */
  const floorsQuery = useFloorList({ staleTime: 60_000 })

  const rooms = tiersQuery.data ?? []
  const mappings: CultivationFloorMapping[] = floorsQuery.data ?? []
  const roomIdToFloorId = new Map<number, number>()
  for (const m of mappings) {
    // ⚠ Key theo `floor_id` của BE — `floor_number` chỉ là thứ tự tầng
    // trong phòng (1..4) và KHÔNG phải định danh tầng ở API.
    if (typeof m.floor_id === 'number') {
      // Nhiều tầng có thể cùng `room_id` → giữ tầng đầu tiên để tránh
      // map trùng (BE định danh tầng bằng `floor_id`).
      if (!roomIdToFloorId.has(m.room_id)) {
        roomIdToFloorId.set(m.room_id, m.floor_id)
      }
    }
  }

  /** Per-floor env queries — chỉ chạy khi mapping tồn tại. */
  const envQueries = useQueries({
    queries: rooms.map((room) => {
      const floorId = roomIdToFloorId.get(room.tierId)
      return {
        queryKey: [...iotKeys.floor(floorId ?? -1), 'environment'],
        queryFn: async () => {
          if (floorId == null) return null
          const result = await autoMistingApi.getEnvironment(floorId)
          return result
        },
        enabled: floorId != null && floorId > 0,
        staleTime: 15_000,
      }
    }),
  })

  /**
   * Ngưỡng đề xuất theo tầng — fallback khi tầng chưa có cấu hình
   * auto-control (`/environment` không trả `thresholds`).
   *
   * BE là nguồn duy nhất: `common` = khoảng giao của mọi profile nấm đang
   * trồng trên tầng. Nhiều profile xung đột → BE trả `config: null` và ta
   * KHÔNG đoán ngưỡng (UI hiển thị trung tính).
   */
  const suggestionQueries = useQueries({
    queries: rooms.map((room) => {
      const floorId = roomIdToFloorId.get(room.tierId)
      return {
        queryKey: [...iotKeys.autoControlSuggestions(floorId ?? -1)],
        queryFn: async () => {
          if (floorId == null) return null
          const result = await autoMistingApi.getSuggestions(floorId)
          return result
        },
        enabled: floorId != null && floorId > 0,
        staleTime: 60_000,
        retry: false,
      }
    }),
  })

  const tiersWithEnv: TierWithEnvironment[] = rooms.map((room, idx) => {
    const envData = envQueries[idx]?.data
    const sensors = envData?.sensors ?? []
    const liveTemperature =
      envData?.avgTemperature != null
        ? envData.avgTemperature
        : sensors.length > 0
          ? avg(sensors.map((s) => s.temperature).filter(isNum))
          : null
    const liveHumidity =
      envData?.avgHumidity != null
        ? envData.avgHumidity
        : sensors.length > 0
          ? avg(sensors.map((s) => s.humidity).filter(isNum))
          : null

    const telemetry: TierTelemetry = {
      temperature: liveTemperature ?? DEFAULT_TELEMETRY.temperature,
      humidity: liveHumidity ?? DEFAULT_TELEMETRY.humidity,
      updatedAt: new Date().toISOString(),
    }

    // Ngưỡng: ưu tiên cấu hình auto-control đang chạy, sau đó mới tới
    // ngưỡng đề xuất của BE. Không có nguồn nào → `null` (UI trung tính).
    const thresholds =
      toClimateThresholds(envData?.thresholds) ??
      resolveFallbackThresholds(suggestionQueries[idx]?.data)

    return {
      tier: { ...room, telemetry },
      source: envData ? 'real' : 'mock',
      liveTemperature,
      liveHumidity,
      thresholds,
    }
  })

  return {
    tiersWithEnv,
    isLoading: tiersQuery.isLoading || floorsQuery.isLoading,
    isError: tiersQuery.isError || floorsQuery.isError,
    /** Lỗi gốc từ query để UI hiển thị thông điệp thân thiện. */
    error: tiersQuery.error ?? floorsQuery.error ?? null,
    refetch: () => {
      void tiersQuery.refetch()
      void floorsQuery.refetch()
      envQueries.forEach((q) => void q.refetch())
      suggestionQueries.forEach((q) => void q.refetch())
    },
  }
}

function isNum(v: unknown): v is number {
  return typeof v === 'number'
}
function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}