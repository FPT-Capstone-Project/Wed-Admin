import { create } from 'zustand'
import type { MushroomThresholdProfile } from '../types/setting.types'

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
 *   - Nhiệt độ (°C), Độ ẩm (%), Ẩm giá thể (%).
 *
 * ⚠ `soilMoisture*` = `null` khi giống nấm đó **không**
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

/**
 * Store hồ sơ vi khí hậu — **chỉ đọc** trên web admin.
 *
 * ⚠ Thêm / sửa / xoá hồ sơ là thao tác nhạy cảm, dành cho nhân viên (staff)
 * thực hiện trên mobile app. Vì vậy store chỉ còn:
 *   - `thresholdProfiles` — dữ liệu để hiển thị.
 *
 * Store vẫn tự hydrate từ `localStorage` để giữ tương thích với dữ liệu đã
 * lưu từ phiên bản trước (khi admin còn được sửa ngưỡng).
 */
type SettingState = PersistedSettings

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

const initialProfiles = readPersistedProfiles()

export const useSettingStore = create<SettingState>(() => ({
  thresholdProfiles: initialProfiles,
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
