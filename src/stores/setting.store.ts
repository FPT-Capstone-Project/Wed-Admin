import { create } from 'zustand'
import type {
  MushroomThresholdProfile,
  ThresholdProfileInput,
} from '../types/setting.types'

const SETTINGS_STORAGE_KEY = 'mcms-threshold-profiles'

/** Chu kỳ gói (tuần) cho từng giống nấm — đồng bộ với Pricing Model. */
const CYCLE_WEEKS_BY_TYPE: Record<string, number> = {
  'Nấm Sư Trưng': 1,
  'Nấm Bào Ngư Xám': 1,
  'Nấm Bào Ngư': 1,
  'Nấm Đầu Khỉ': 1,
  'Nấm Bào Ngư Trắng': 1,
  'Nấm Hoàng Kim': 1,
  'Nấm Linh Chi': 3,
  'Nấm Mối Đen': 2,
  'Đông Trùng Hạ Thảo': 4,
}

/**
 * Hồ sơ vi khí hậu mặc định theo giống nấm.
 *
 * Nguồn: dữ liệu thông số canh tác thực tế đang dùng ở tab "Thông số canh tác"
 * (mục Gói cước thuê). Mỗi hồ sơ là một dải:
 *   - Nhiệt độ (°C), Độ ẩm (%), CO₂ (ppm), Ẩm giá thể (%).
 *
 * ⚠ `co2Min` / `co2Max` / `soilMoisture*` = `null` khi giống nấm đó **không**
 *   đặt ngưỡng cho chỉ số đó (không phải thiếu dữ liệu).
 */
export const DEFAULT_THRESHOLD_PROFILES: MushroomThresholdProfile[] = [
  {
    id: 'THRESHOLD-001',
    mushroomType: 'Nấm Sư Trưng',
    name: 'Sư Trưng tiêu chuẩn',
    cycleWeeks: 1,
    tempMin: 20,
    tempMax: 32,
    humidityMin: 80,
    humidityMax: 87,
    co2Min: null,
    co2Max: null,
    soilMoistureMin: null,
    soilMoistureMax: null,
    isDefault: true,
    updatedAt: '2026-08-20T08:00:00+07:00',
  },
  {
    id: 'THRESHOLD-002',
    mushroomType: 'Nấm Bào Ngư Xám',
    name: 'Bào Ngư Xám tiêu chuẩn',
    cycleWeeks: 1,
    tempMin: 25,
    tempMax: 32,
    humidityMin: 82,
    humidityMax: 90,
    co2Min: null,
    co2Max: null,
    soilMoistureMin: null,
    soilMoistureMax: null,
    isDefault: false,
    updatedAt: '2026-08-20T08:00:00+07:00',
  },
  {
    id: 'THRESHOLD-003',
    mushroomType: 'Nấm Bào Ngư',
    name: 'Bào Ngư vụ mùa khô',
    cycleWeeks: 1,
    tempMin: 18,
    tempMax: 24,
    humidityMin: 80,
    humidityMax: 90,
    co2Min: 350,
    co2Max: 500,
    soilMoistureMin: null,
    soilMoistureMax: null,
    isDefault: false,
    updatedAt: '2026-08-21T08:00:00+07:00',
  },
  {
    id: 'THRESHOLD-004',
    mushroomType: 'Nấm Bào Ngư',
    name: 'Bào Ngư vụ mùa mưa',
    cycleWeeks: 1,
    tempMin: 18,
    tempMax: 24,
    humidityMin: 80,
    humidityMax: 95,
    co2Min: 400,
    co2Max: 1200,
    soilMoistureMin: null,
    soilMoistureMax: null,
    isDefault: false,
    updatedAt: '2026-08-21T08:00:00+07:00',
  },
  {
    id: 'THRESHOLD-005',
    mushroomType: 'Nấm Đầu Khỉ',
    name: 'Đầu Khỉ sinh trưởng',
    cycleWeeks: 1,
    tempMin: 16,
    tempMax: 22,
    humidityMin: 85,
    humidityMax: 95,
    co2Min: 400,
    co2Max: 1000,
    soilMoistureMin: null,
    soilMoistureMax: null,
    isDefault: false,
    updatedAt: '2026-08-22T08:00:00+07:00',
  },
]

/** Trả về chu kỳ gói (tuần) cho loại nấm, mặc định 1 tuần. */
export function getCycleWeeksFor(mushroomType: string): number {
  return CYCLE_WEEKS_BY_TYPE[mushroomType] ?? 1
}

interface PersistedSettings {
  thresholdProfiles: MushroomThresholdProfile[]
}

interface SettingState extends PersistedSettings {
  addThresholdProfile: (values: ThresholdProfileInput) => void
  updateThresholdProfile: (
    id: string,
    values: ThresholdProfileInput,
  ) => void
  setDefaultThresholdProfile: (id: string) => void
  deleteThresholdProfile: (id: string) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Ngưỡng optional: `null` hợp lệ, `undefined` (thiếu) → `null`. */
function isNullableNumber(value: unknown): value is number | null {
  return value === null || value === undefined || isNumber(value)
}

/**
 * Chuẩn hoá ngưỡng optional về `null`.
 *
 * ⚠ AntD `InputNumber` trả `undefined` khi người dùng xoá ô, và
 * `JSON.stringify` sẽ **loại bỏ** key có giá trị `undefined` → profile bị
 * reject khi đọc lại từ localStorage. Vì vậy phải ép `undefined` → `null`
 * *trước* khi lưu.
 */
function toNullableNumber(value: number | null | undefined): number | null {
  return value ?? null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function parseThresholdProfile(value: unknown): MushroomThresholdProfile | null {
  if (!isRecord(value)) {
    return null
  }

  const {
    id,
    mushroomType,
    name,
    tempMin,
    tempMax,
    humidityMin,
    humidityMax,
    co2Min,
    co2Max,
    soilMoistureMin,
    soilMoistureMax,
    isDefault,
    updatedAt,
    cycleWeeks,
  } = value

  if (
    !isString(id) ||
    !isString(mushroomType) ||
    !isString(name) ||
    !isNumber(tempMin) ||
    !isNumber(tempMax) ||
    !isNumber(humidityMin) ||
    !isNumber(humidityMax) ||
    !isNullableNumber(co2Min) ||
    !isNullableNumber(co2Max) ||
    !isNullableNumber(soilMoistureMin) ||
    !isNullableNumber(soilMoistureMax) ||
    !isBoolean(isDefault) ||
    !isString(updatedAt)
  ) {
    return null
  }

  return {
    id,
    mushroomType,
    name,
    cycleWeeks: isNumber(cycleWeeks) ? cycleWeeks : getCycleWeeksFor(mushroomType),
    tempMin,
    tempMax,
    humidityMin,
    humidityMax,
    co2Min: toNullableNumber(co2Min),
    co2Max: toNullableNumber(co2Max),
    soilMoistureMin: toNullableNumber(soilMoistureMin),
    soilMoistureMax: toNullableNumber(soilMoistureMax),
    isDefault,
    updatedAt,
  }
}

function readPersistedProfiles(): MushroomThresholdProfile[] {
  if (typeof window === 'undefined') {
    return DEFAULT_THRESHOLD_PROFILES
  }

  try {
    const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : null

    if (!isRecord(parsedValue) || !Array.isArray(parsedValue.thresholdProfiles)) {
      return DEFAULT_THRESHOLD_PROFILES
    }

    const profiles = parsedValue.thresholdProfiles
      .map(parseThresholdProfile)
      .filter((profile): profile is MushroomThresholdProfile => profile !== null)

    return profiles.length > 0 ? profiles : DEFAULT_THRESHOLD_PROFILES
  } catch {
    return DEFAULT_THRESHOLD_PROFILES
  }
}

function getNextProfileId(profiles: MushroomThresholdProfile[]) {
  const highestId = profiles.reduce((highest, profile) => {
    const match = /^THRESHOLD-(\d+)$/.exec(profile.id)
    const numericId = match ? Number(match[1]) : 0

    return Math.max(highest, numericId)
  }, 0)

  return `THRESHOLD-${String(highestId + 1).padStart(3, '0')}`
}

function getNow() {
  return new Date().toISOString()
}

/**
 * Chuẩn hoá input từ form thành profile đầy đủ.
 *
 * Bổ sung `cycleWeeks` mặc định và ép các ngưỡng optional (`undefined` từ
 * `InputNumber` bị xoá) về `null` để `JSON.stringify` không loại bỏ key.
 */
function toProfileValues(values: ThresholdProfileInput) {
  return {
    ...values,
    cycleWeeks: values.cycleWeeks ?? getCycleWeeksFor(values.mushroomType),
    co2Min: toNullableNumber(values.co2Min),
    co2Max: toNullableNumber(values.co2Max),
    soilMoistureMin: toNullableNumber(values.soilMoistureMin),
    soilMoistureMax: toNullableNumber(values.soilMoistureMax),
  }
}

const initialProfiles = readPersistedProfiles()

export const useSettingStore = create<SettingState>((set) => ({
  thresholdProfiles: initialProfiles,

  addThresholdProfile: (values) =>
    set((state) => ({
      thresholdProfiles: [
        {
          ...toProfileValues(values),
          id: getNextProfileId(state.thresholdProfiles),
          isDefault: false,
          updatedAt: getNow(),
        },
        ...state.thresholdProfiles,
      ],
    })),

  updateThresholdProfile: (id, values) =>
    set((state) => ({
      thresholdProfiles: state.thresholdProfiles.map((profile) =>
        profile.id === id
          ? {
              ...profile,
              ...toProfileValues(values),
              updatedAt: getNow(),
            }
          : profile,
      ),
    })),

  setDefaultThresholdProfile: (id) =>
    set((state) => ({
      thresholdProfiles: state.thresholdProfiles.map((profile) => ({
        ...profile,
        isDefault: profile.id === id,
        updatedAt: profile.id === id ? getNow() : profile.updatedAt,
      })),
    })),

  deleteThresholdProfile: (id) =>
    set((state) => ({
      thresholdProfiles: state.thresholdProfiles.filter(
        (profile) => profile.id !== id || profile.isDefault,
      ),
    })),
}))

useSettingStore.subscribe((state) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ thresholdProfiles: state.thresholdProfiles }),
    )
  } catch {
    // Private mode or quota exhaustion should not break in-memory settings.
  }
})
