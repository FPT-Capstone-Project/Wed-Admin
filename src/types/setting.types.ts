/**
 * Hồ sơ vi khí hậu / thông số canh tác theo từng giống nấm.
 *
 * ⚠ **Nguồn duy nhất: Database.**
 *   - Tên giống nấm  → `mushroom_types.name` (nguyên bản, KHÔNG dịch).
 *   - Dải ngưỡng     → `mushroom_conditions` (chỉ **nhiệt độ + độ ẩm**).
 *   - Chu kỳ         → suy ra từ `mushroom_types.growing_days`.
 *
 *   Bảng `mushroom_conditions` được JOIN với `mushroom_types` theo
 *   `mushroom_type_id` — xem `features/settings/hooks/useThresholdProfiles.ts`.
 *
 * ⚠ **Giai đoạn 0 — đã gỡ CO₂ và độ ẩm giá thể.**
 *   - CO₂ (`co2_min` / `co2_max`) không còn trong BE / DB.
 *   - Độ ẩm giá thể (`substrate_moisture_*`) đã bị gỡ khỏi DB
 *     (migration `010_drop_condition_substrate_moisture.sql`).
 *   → Hồ sơ chỉ còn 2 dải: nhiệt độ & độ ẩm.
 */

/** Một hồ sơ vi khí hậu của một giống nấm. */
export interface MushroomThresholdProfile {
  /** `mushroom_types.mushroom_type_id` — khoá join với `mushroom_conditions`. */
  mushroomTypeId: number
  /** Tên loại nấm — **nguyên bản** từ `mushroom_types.name`. */
  mushroomType: string
  /** Mô tả từ `mushroom_types.description` (có thể `null`). */
  description: string | null
  /** Chu kỳ sinh trưởng (tuần) — suy ra từ `mushroom_types.growing_days`. */
  cycleWeeks: number
  /** Dải nhiệt độ (°C) — `null` = chưa đặt ngưỡng. */
  tempMin: number | null
  tempMax: number | null
  /** Dải độ ẩm không khí (%RH) — `null` = chưa đặt ngưỡng. */
  humidityMin: number | null
  humidityMax: number | null
  /** Thời điểm cập nhật gần nhất (`mushroom_conditions.updated_at`). */
  updatedAt: string
}
