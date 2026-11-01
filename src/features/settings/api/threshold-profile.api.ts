import { apiClient } from '../../../shared/api/client'
import { ensureArray } from '../../../shared/api/response-normalizer'
import type { MushroomThresholdProfile } from '../../../types/setting.types'

/**
 * Hồ sơ vi khí hậu — **đọc trực tiếp từ Database**.
 *
 * ⚠ Vì sao không có endpoint riêng?
 *   Backend **không** có bảng `threshold_profiles` và cũng không expose
 *   `/api/settings/threshold-profiles` (đã kiểm tra `Backend/src/routes`).
 *   Dữ liệu thật nằm ở 2 bảng:
 *     - `mushroom_types`     → tên + `growing_days` (chu kỳ) + mô tả
 *     - `mushroom_conditions` → dải nhiệt độ / độ ẩm / CO₂
 *
 *   → FE ghép 2 nguồn này lại (join theo `mushroom_type_id`) để dựng
 *   hồ sơ hoàn chỉnh. Cả 2 endpoint đều yêu cầu `authenticate` → mọi
 *   vai trò đều đọc được.
 *
 * ⚠ `mushroom_conditions` có thể thiếu dòng cho một số giống nấm (chưa
 *   thiết lập ngưỡng) → hồ sơ đó vẫn hiển thị với toàn bộ ngưỡng `null`
 *   (không phải "thiếu dữ liệu", mà là "chưa đặt ngưỡng").
 */
export const thresholdProfileApi = {
  /**
   * Danh sách hồ sơ vi khí hậu — ghép `mushroom_types` × `mushroom_conditions`.
   *
   * Gom theo `mushroom_type_id`: nếu DB có nhiều dòng condition cho cùng
   * một giống nấm (dữ liệu bẩn — đã ghi nhận trong
   * `docs/backend-mock-gap-report.md`), chỉ giữ dòng mới nhất.
   */
  async list(): Promise<MushroomThresholdProfile[]> {
    const [typesResponse, conditionsResponse] = await Promise.all([
      apiClient.get<unknown>('/api/mushroom-types'),
      apiClient.get<unknown>('/api/mushroom-conditions'),
    ])

    const types = ensureArray<{
      mushroom_type_id: number
      name: string
      description?: string | null
      growing_days?: number | null
      created_at?: string | null
    }>(typesResponse.data)

    const conditions = ensureArray<{
      condition_id: number
      mushroom_type_id: number
      temperature_min?: number | null
      temperature_max?: number | null
      humidity_min?: number | null
      humidity_max?: number | null
      co2_min?: number | null
      co2_max?: number | null
      updated_at?: string | null
    }>(conditionsResponse.data)

    // Index condition theo mushroom_type_id — giữ dòng có `updated_at` mới nhất.
    const conditionByType = new Map<
      number,
      (typeof conditions)[number]
    >()
    for (const condition of conditions) {
      const current = conditionByType.get(condition.mushroom_type_id)
      if (!current) {
        conditionByType.set(condition.mushroom_type_id, condition)
        continue
      }
      const currentTime = toTime(current.updated_at)
      const nextTime = toTime(condition.updated_at)
      if (nextTime > currentTime) {
        conditionByType.set(condition.mushroom_type_id, condition)
      }
    }

    return types.map((type) => {
      const condition = conditionByType.get(type.mushroom_type_id)

      return {
        mushroomTypeId: type.mushroom_type_id,
        // ⚠ Nguyên bản từ DB — KHÔNG dịch, KHÔNG map.
        mushroomType: type.name,
        description: type.description ?? null,
        cycleWeeks: toCycleWeeks(type.growing_days),
        tempMin: toNumber(condition?.temperature_min),
        tempMax: toNumber(condition?.temperature_max),
        humidityMin: toNumber(condition?.humidity_min),
        humidityMax: toNumber(condition?.humidity_max),
        co2Min: toNumber(condition?.co2_min),
        co2Max: toNumber(condition?.co2_max),
        updatedAt:
          condition?.updated_at ?? type.created_at ?? new Date().toISOString(),
      }
    })
  },
}

/** BE có thể trả số dưới dạng string (NUMERIC → "18.00"). */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Chu kỳ sinh trưởng (tuần) từ `growing_days`.
 *
 * BE không có trường `cycle_weeks` — chu kỳ suy ra từ số ngày sinh trưởng,
 * làm tròn lên (một tuần = 7 ngày). `growing_days = 0` → 1 tuần (mặc định).
 */
function toCycleWeeks(growingDays: number | null | undefined): number {
  const days = toNumber(growingDays)
  if (days === null || days <= 0) return 1
  return Math.max(1, Math.ceil(days / 7))
}

/** Timestamp → epoch ms để so sánh "mới nhất" (null → -Infinity). */
function toTime(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}
