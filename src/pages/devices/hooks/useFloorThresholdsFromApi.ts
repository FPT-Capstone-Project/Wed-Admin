/**
 * Tính target thresholds cho mỗi tier từ:
 *  - `/api/mushroom-conditions` (real, thay thế localStorage setting.store),
 *  - trays của tier (để xác định mẻ đang trồng → giống nấm → condition).
 *
 * Output: `[{ tierId, thresholds: FloorTargetThresholds }]` chỉ chứa entry
 * có thresholds thật (không bao gồm tiers không có dữ liệu thật).
 */
import { useMemo } from 'react'
import type { Tier } from '../../../types/room.types'
import { useMushroomConditions } from '../../../features/packages/hooks/useMushroomConditions'
import type { MushroomCondition } from '../../../types/mushroom-condition'
import type {
  FloorTargetThresholds,
} from '../utils/floor-climate.utils'

interface FloorThresholdsEntry {
  tierId: Tier['tierId']
  thresholds: FloorTargetThresholds
}

export function useFloorThresholdsFromApi(tiers: Tier[]) {
  const { data: conditions = [] } = useMushroomConditions()

  return useMemo<FloorThresholdsEntry[]>(() => {
    const entries: FloorThresholdsEntry[] = []

    for (const tier of tiers) {
      // Gom các giống nấm đang trồng trên tier (tray có rental.batchId).
      const occupiedTrays = tier.trays.filter(
        (tray) => tray.rental != null && tray.batchId != null,
      )
      if (occupiedTrays.length === 0) continue

      // Tính trung bình thresholds từ MushroomCondition của mỗi mẻ.
      const values = occupiedTrays
        .map((tray) => resolveConditionForTray(conditions, tray))
        .filter(isDefined)

      if (values.length === 0) continue

      const averages = averageThresholds(values)

      entries.push({
        tierId: tier.tierId,
        thresholds: {
          ...averages,
          source: 'ACTIVE_TRAYS',
          activeTrayCount: values.length,
          mushroomTypes: values.map((v) => v.mushroomType),
          defaultProfileName: 'MushroomCondition từ BE',
          missingProfileMushroomTypes: [],
          hasEcologicalVariance: values.length > 1,
          temperatureDeviation: tempSpan(values),
        },
      })
    }

    return entries
  }, [tiers, conditions])
}

interface ResolvedCondition {
  mushroomType: string
  tempMin: number
  tempMax: number
  humidityMin: number
  humidityMax: number
  co2Max: number
}

function resolveConditionForTray(
  conditions: MushroomCondition[],
  tray: Tier['trays'][number],
): ResolvedCondition | null {
  if (!tray.rental) return null

  const mushroomType = tray.rental.mushroomType

  // Map BE MushroomCondition vào rental thông qua `TrayRental.mushroomType`
  // chưa được hydrate bằng mushroom_type_id (chỉ có string tên).
  // Để an toàn, dùng condition đầu tiên có toàn bộ ngưỡng hợp lệ.
  // TODO Phase 8: enrich TrayRental với `mushroomTypeId` để match chính xác.
  const condition = conditions.find((c) =>
    c.temperature_min != null &&
    c.temperature_max != null &&
    c.humidity_min != null &&
    c.humidity_max != null &&
    c.co2_max != null,
  )
  if (!condition) return null

  return {
    mushroomType,
    tempMin: condition.temperature_min as number,
    tempMax: condition.temperature_max as number,
    humidityMin: condition.humidity_min as number,
    humidityMax: condition.humidity_max as number,
    co2Max: condition.co2_max as number,
  }
}

function averageThresholds(
  values: ResolvedCondition[],
): Pick<
  FloorTargetThresholds,
  'tempMin' | 'tempMax' | 'humidityMin' | 'humidityMax' | 'co2Max'
> {
  return {
    tempMin: avg(values.map((v) => v.tempMin)),
    tempMax: avg(values.map((v) => v.tempMax)),
    humidityMin: avg(values.map((v) => v.humidityMin)),
    humidityMax: avg(values.map((v) => v.humidityMax)),
    co2Max: avg(values.map((v) => v.co2Max)),
  }
}

function avg(arr: number[]): number {
  return arr.reduce((sum, v) => sum + v, 0) / arr.length
}

function tempSpan(values: ResolvedCondition[]): number {
  const tempMins = values.map((v) => v.tempMin)
  const tempMaxs = values.map((v) => v.tempMax)
  return Math.max(...tempMaxs) - Math.min(...tempMins)
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
