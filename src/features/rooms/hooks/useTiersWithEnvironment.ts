/**
 * Hook gộp telemetry thật (từ IoT /environment) vào `Tier[]` của rooms feature.
 *
 * Mapping CultivationRoom.room_id → CultivationFloorMapping.floor_number
 * thông qua `/api/iot/floors` (BE trả `{ room_id, floor_number, ... }`).
 *
 * Tier nào KHÔNG có floor mapping → giữ DEFAULT_TELEMETRY (mock), không lỗi.
 * Field nào BE không trả (vd. CO₂) → set `null` để UI hiển thị "—".
 */
import { useQueries } from '@tanstack/react-query'
import { autoMistingApi } from '../../devices/api/iot.api'
import { useFloorList, iotKeys } from '../../devices/hooks/useIoT'
import { useCultivationTiers } from './useCultivation'
import { DEFAULT_TELEMETRY } from './cultivation.defaults'
import type { Tier, TierTelemetry } from '../../../types/room.types'
import type { CultivationFloorMapping } from '../../../types/iot'

export type EnvironmentSource = 'real' | 'mock'

export interface TierWithEnvironment {
  tier: Tier
  source: EnvironmentSource
  /** null khi field không có data */
  liveTemperature: number | null
  liveHumidity: number | null
  /** API không trả CO₂, luôn null hiện tại */
  liveCo2: number | null
}

export function useTiersWithEnvironment() {
  const tiersQuery = useCultivationTiers({ staleTime: 60_000 })

  /** Room ID → floor ID (CultivationFloorMapping.floor_number) */
  const floorsQuery = useFloorList({ staleTime: 60_000 })

  const rooms = tiersQuery.data ?? []
  const mappings: CultivationFloorMapping[] = floorsQuery.data ?? []
  const roomIdToFloorId = new Map<number, number>()
  for (const m of mappings) {
    if (typeof m.room_id === 'number') {
      roomIdToFloorId.set(m.room_id, m.floor_number)
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

  const tiersWithEnv: TierWithEnvironment[] = rooms.map((room, idx) => {
    const envData = envQueries[idx]?.data
    const sensors = envData?.sensors ?? []
    const liveTemperature =
      sensors.length > 0
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
      /** BE chưa expose CO₂ — đợi BA mở rộng `IotSensor` hoặc trả sensor riêng. */
      co2: null,
      updatedAt: new Date().toISOString(),
    }

    return {
      tier: { ...room, telemetry },
      source: envData ? 'real' : 'mock',
      liveTemperature,
      liveHumidity,
      liveCo2: null,
    }
  })

  return {
    tiersWithEnv,
    isLoading: tiersQuery.isLoading || floorsQuery.isLoading,
    isError: tiersQuery.isError || floorsQuery.isError,
    refetch: () => {
      void tiersQuery.refetch()
      void floorsQuery.refetch()
      envQueries.forEach((q) => void q.refetch())
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