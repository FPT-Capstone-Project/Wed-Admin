import type { AutoControlConfigurationResponse } from '../../../types/iot'

/**
 * Ngưỡng nhiệt độ **fallback** cho biểu đồ Dashboard — suy ra 100% ở FE.
 *
 * ## Vì sao cần?
 *
 * `GET /api/analytics/dashboard/environment-history` trả `thresholds` từ
 * bảng `iot_auto_control_configs`. Trong DB, `temperature_min` /
 * `temperature_max` **NULL** trừ khi cấu hình có `cooling_enabled = true`
 * (xem `Backend/src/services/autoMisting.algorithm.js` → `validateConfig`).
 *
 * ⇒ Tầng chỉ bật tưới phun (không bật làm mát) thì **không có** ngưỡng
 * nhiệt độ ⇒ `evaluateTemperature` trả `level: 'neutral'` ⇒ tooltip không
 * hiện dòng "Nhiệt độ vượt/thấp hơn ngưỡng".
 *
 * ## Nguồn thay thế (read-only, không đụng backend)
 *
 * `GET /api/iot/floors/{floorId}/auto-control` trả `floorSuggestion` — BE đã
 * tính sẵn **khoảng ngưỡng chung** của các profile nấm đang trồng trên tầng
 * (`common.temperature_min` / `common.temperature_max`). Đây là ngưỡng canh
 * tác thật, không phải giá trị đoán.
 *
 * ⚠ Endpoint này **read-only** (chỉ cần đăng nhập) ⇒ Admin web đọc được.
 */

/** Cặp ngưỡng nhiệt độ — `null` = không xác định được. */
export interface TemperatureBounds {
  tempMin: number | null
  tempMax: number | null
}

/** Đọc số hợp lệ (chấp nhận chuỗi số) — fallback `null`. */
function toFinite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/**
 * Chỉ nhận cặp ngưỡng **dùng được**: min < max.
 *
 * ⚠ Cặp không nhất quán (min ≥ max) là dữ liệu bẩn ⇒ bỏ qua thay vì hiển thị
 *   mục tiêu sai cho người dùng.
 */
function toBounds(
  min: unknown,
  max: unknown,
): TemperatureBounds | null {
  const tempMin = toFinite(min)
  const tempMax = toFinite(max)
  if (tempMin == null || tempMax == null) return null
  if (tempMin >= tempMax) return null
  return { tempMin, tempMax }
}

/**
 * Suy ra ngưỡng nhiệt độ từ response `GET /api/iot/floors/{floorId}/auto-control`.
 *
 * Thứ tự ưu tiên (mỗi nguồn đều là ngưỡng thật của tầng):
 *   1. `floorSuggestion.common` — khoảng chung BE đã giao (chính xác nhất).
 *   2. `floorSuggestion.config` — cấu hình đề xuất sẵn sàng lưu.
 *   3. `floorSuggestion.sourceProfiles` — giao của các profile nguồn.
 *   4. `cultivation.profiles` — profile nấm đang trồng trên tầng.
 *   5. `suggestions` — dòng `mushroom_conditions` của tầng (LEGACY).
 *
 * @returns ngưỡng nhiệt độ, hoặc `null` khi không xác định được.
 */
export function extractTemperatureBounds(
  response: AutoControlConfigurationResponse | null | undefined,
): TemperatureBounds | null {
  if (!response || typeof response !== 'object') return null

  const floorSuggestion = response.floorSuggestion ?? null

  // 1. Khoảng chung do BE tính sẵn.
  const common = floorSuggestion?.common
  if (common) {
    const bounds = toBounds(
      (common as Record<string, unknown>).temperature_min,
      (common as Record<string, unknown>).temperature_max,
    )
    if (bounds) return bounds
  }

  // 2. Cấu hình đề xuất (đã bao gồm ngưỡng làm mát).
  const suggestedConfig = floorSuggestion?.config
  if (suggestedConfig) {
    const bounds = toBounds(
      suggestedConfig.temperature_min,
      suggestedConfig.temperature_max,
    )
    if (bounds) return bounds
  }

  // 3. Giao của các profile nguồn.
  const sourceBounds = intersectProfileBounds(
    floorSuggestion?.sourceProfiles ?? [],
  )
  if (sourceBounds) return sourceBounds

  // 4. Profile nấm đang trồng trên tầng.
  const cultivationProfiles = Array.isArray(response.cultivation?.profiles)
    ? response.cultivation.profiles
    : []
  const cultivationBounds = intersectProfileBounds(cultivationProfiles)
  if (cultivationBounds) return cultivationBounds

  // 5. Ngưỡng của loại nấm (cấu hình LEGACY).
  const legacy = response.suggestions
  if (legacy && typeof legacy === 'object') {
    const record = legacy as Record<string, unknown>
    const bounds = toBounds(record.temperature_min, record.temperature_max)
    if (bounds) return bounds
  }

  return null
}

/**
 * Giao các khoảng ngưỡng của nhiều profile nấm.
 *
 * - `min` = **max** của các `min` (cả tất cả profile đều phải chứa được).
 * - `max` = **min** của các `max`.
 * - Profile thiếu ngưỡng nhiệt độ bị bỏ qua (không phải lý do loại cả tầng).
 */
function intersectProfileBounds(
  profiles: readonly unknown[],
): TemperatureBounds | null {
  const mins: number[] = []
  const maxes: number[] = []

  for (const profile of profiles) {
    if (!profile || typeof profile !== 'object') continue
    const record = profile as Record<string, unknown>
    const min = toFinite(record.temperature_min)
    const max = toFinite(record.temperature_max)
    if (min == null || max == null) continue
    if (min >= max) continue
    mins.push(min)
    maxes.push(max)
  }

  if (!mins.length || !maxes.length) return null
  return toBounds(Math.max(...mins), Math.min(...maxes))
}
