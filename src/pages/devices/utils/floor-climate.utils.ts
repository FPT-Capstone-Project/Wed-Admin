import { DEFAULT_THRESHOLD_PROFILES } from '../../../stores/setting.store'
import type { FloorClimateThresholdValues } from '../../../types/device.types'
import type { Tray } from '../../../types/room.types'
import type { MushroomThresholdProfile } from '../../../types/setting.types'

const ECOLOGICAL_TEMPERATURE_DEVIATION_CELSIUS = 6

/**
 * Ngưỡng CO₂ dùng cho cấu hình tầng khi hồ sơ **không** đặt ngưỡng CO₂
 * (`co2Max === null`). Cấu hình thiết bị cần một con số cụ thể nên không thể
 * để trống — giống hành vi cũ khi `co2Max` luôn là số.
 */
const FALLBACK_CO2_MAX = 1000

const SYSTEM_FALLBACK_PROFILE: MushroomThresholdProfile = {
  id: 'SYSTEM-FALLBACK',
  mushroomType: 'Profile mặc định hệ thống',
  name: 'Profile mặc định hệ thống',
  cycleWeeks: 4,
  tempMin: 20,
  tempMax: 28,
  humidityMin: 75,
  humidityMax: 95,
  co2Min: null,
  co2Max: FALLBACK_CO2_MAX,
  soilMoistureMin: 60,
  soilMoistureMax: 85,
  isDefault: true,
  updatedAt: '2026-01-01T00:00:00+07:00',
}

export interface FloorTargetThresholds extends FloorClimateThresholdValues {
  activeTrayCount: number
  mushroomTypes: string[]
  source: 'ACTIVE_TRAYS' | 'SYSTEM_DEFAULT'
  defaultProfileName: string
  missingProfileMushroomTypes: string[]
  hasEcologicalVariance: boolean
  temperatureDeviation: number
}

function normalizeMushroomType(value: string) {
  return value.trim().toLocaleLowerCase('vi-VN')
}

function roundToOneDecimal(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

function average(values: number[]) {
  return roundToOneDecimal(
    values.reduce((total, value) => total + value, 0) / values.length,
  )
}

export function getDefaultMushroomThresholdProfile(
  profiles: MushroomThresholdProfile[],
) {
  return (
    profiles.find((profile) => profile.isDefault) ??
    profiles[0] ??
    SYSTEM_FALLBACK_PROFILE
  )
}

export function getActiveClimateSourceTrays(trays: Tray[]) {
  return trays.filter(
    (tray) =>
      tray.rental !== null &&
      (tray.status === 'rented' || tray.status === 'harvesting'),
  )
}

export function findMushroomThresholdProfile(
  mushroomType: string,
  mushroomProfiles: MushroomThresholdProfile[] = DEFAULT_THRESHOLD_PROFILES,
) {
  const normalizedMushroomType = normalizeMushroomType(mushroomType)

  return mushroomProfiles.find(
    (item) =>
      normalizeMushroomType(item.mushroomType) === normalizedMushroomType,
  )
}

export function resolveMushroomThresholdProfile(
  mushroomType: string,
  mushroomProfiles: MushroomThresholdProfile[] = DEFAULT_THRESHOLD_PROFILES,
) {
  const profile = findMushroomThresholdProfile(
    mushroomType,
    mushroomProfiles,
  )

  return {
    profile: profile ?? getDefaultMushroomThresholdProfile(mushroomProfiles),
    usesDefault: !profile,
  }
}

export function calculateMushroomProfileAverages(
  profiles: MushroomThresholdProfile[],
): FloorClimateThresholdValues | null {
  if (profiles.length === 0) {
    return null
  }

  // Hồ sơ không đặt ngưỡng CO₂ (`null`) → bỏ qua, dùng fallback chung.
  const co2Values = profiles
    .map((profile) => profile.co2Max)
    .filter((value): value is number => value != null)

  return {
    tempMin: average(profiles.map((profile) => profile.tempMin)),
    tempMax: average(profiles.map((profile) => profile.tempMax)),
    humidityMin: average(
      profiles.map((profile) => profile.humidityMin),
    ),
    humidityMax: average(
      profiles.map((profile) => profile.humidityMax),
    ),
    co2Max:
      co2Values.length > 0 ? average(co2Values) : FALLBACK_CO2_MAX,
  }
}

export function calculateFloorTargetThresholds(
  activeTraysInFloor: Tray[],
  mushroomProfiles: MushroomThresholdProfile[] = DEFAULT_THRESHOLD_PROFILES,
): FloorTargetThresholds {
  const activeTrays = getActiveClimateSourceTrays(activeTraysInFloor)
  const defaultProfile = getDefaultMushroomThresholdProfile(mushroomProfiles)

  if (activeTrays.length === 0) {
    return {
      tempMin: defaultProfile.tempMin,
      tempMax: defaultProfile.tempMax,
      humidityMin: defaultProfile.humidityMin,
      humidityMax: defaultProfile.humidityMax,
      co2Max: defaultProfile.co2Max ?? FALLBACK_CO2_MAX,
      activeTrayCount: 0,
      mushroomTypes: [defaultProfile.mushroomType],
      source: 'SYSTEM_DEFAULT',
      defaultProfileName: defaultProfile.name,
      missingProfileMushroomTypes: [],
      hasEcologicalVariance: false,
      temperatureDeviation: 0,
    }
  }

  const missingProfileMushroomTypes: string[] = []
  const resolvedMushroomTypes: string[] = []
  const matchedProfiles = activeTrays.map((tray) => {
    const mushroomType = tray.rental?.mushroomType ?? ''
    const { profile, usesDefault } = resolveMushroomThresholdProfile(
      mushroomType,
      mushroomProfiles,
    )

    if (usesDefault && mushroomType) {
      missingProfileMushroomTypes.push(mushroomType)
    }

    resolvedMushroomTypes.push(
      usesDefault && mushroomType ? mushroomType : profile.mushroomType,
    )

    return profile
  })

  const temperatureMinValues = matchedProfiles.map(
    (profile) => profile.tempMin,
  )
  const temperatureMaxValues = matchedProfiles.map(
    (profile) => profile.tempMax,
  )
  const uniqueProfileIds = new Set(
    matchedProfiles.map((profile) => profile.id),
  )
  const temperatureDeviation = roundToOneDecimal(
    Math.max(...temperatureMaxValues) - Math.min(...temperatureMinValues),
  )
  const averages = calculateMushroomProfileAverages(matchedProfiles)

  if (!averages) {
    throw new Error('Không thể tính ngưỡng khi danh sách profile rỗng.')
  }

  return {
    ...averages,
    activeTrayCount: activeTrays.length,
    mushroomTypes: Array.from(new Set(resolvedMushroomTypes)),
    source: 'ACTIVE_TRAYS',
    defaultProfileName: defaultProfile.name,
    missingProfileMushroomTypes: Array.from(
      new Set(missingProfileMushroomTypes),
    ),
    hasEcologicalVariance:
      uniqueProfileIds.size > 1 &&
      temperatureDeviation > ECOLOGICAL_TEMPERATURE_DEVIATION_CELSIUS,
    temperatureDeviation,
  }
}
