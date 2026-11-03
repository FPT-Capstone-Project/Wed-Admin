/**
 * Mushroom Conditions — DTOs khớp với Swagger schemas.
 * Endpoint: /api/mushroom-conditions
 *
 * Lưu ý: mỗi mushroom type chỉ có 1 condition (UNIQUE constraint).
 *
 * ⚠ **Giai đoạn 0 — chỉ còn 2 chỉ số: nhiệt độ & độ ẩm.**
 *   - CO₂ (`co2_min` / `co2_max`) đã bị gỡ khỏi DB và khỏi BE.
 *   - Độ ẩm giá thể (`substrate_moisture_min` / `substrate_moisture_max`)
 *     cũng không còn trong schema của BE.
 *   → FE không khai báo / không gửi / không hiển thị 2 nhóm field này.
 */

/** Chỉ số môi trường duy nhất còn được hỗ trợ: nhiệt độ + độ ẩm. */
export interface MushroomCondition {
  condition_id: number
  mushroom_type_id: number
  temperature_min: number | null
  temperature_max: number | null
  humidity_min: number | null
  humidity_max: number | null
  created_at: string
  updated_at: string
}

/** POST /api/mushroom-conditions */
export interface CreateMushroomConditionRequest {
  mushroomTypeId: number
  temperatureMin?: number | null
  temperatureMax?: number | null
  humidityMin?: number | null
  humidityMax?: number | null
}

/** PUT /api/mushroom-conditions/{id} */
export interface UpdateMushroomConditionRequest {
  mushroomTypeId?: number
  temperatureMin?: number | null
  temperatureMax?: number | null
  humidityMin?: number | null
  humidityMax?: number | null
}

/** Query filter */
export interface MushroomConditionListQuery {
  mushroomTypeId?: number
}
