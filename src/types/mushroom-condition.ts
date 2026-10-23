/**
 * Mushroom Conditions — DTOs khớp với Swagger schemas.
 * Endpoint: /api/mushroom-conditions
 *
 * Lưu ý: mỗi mushroom type chỉ có 1 condition (UNIQUE constraint).
 */

export interface MushroomCondition {
  condition_id: number
  mushroom_type_id: number
  temperature_min: number | null
  temperature_max: number | null
  humidity_min: number | null
  humidity_max: number | null
  co2_min: number | null
  co2_max: number | null
  substrate_moisture_min: number | null
  substrate_moisture_max: number | null
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
  co2Min?: number | null
  co2Max?: number | null
  substrateMoistureMin?: number | null
  substrateMoistureMax?: number | null
}

/** PUT /api/mushroom-conditions/{id} */
export interface UpdateMushroomConditionRequest {
  mushroomTypeId?: number
  temperatureMin?: number | null
  temperatureMax?: number | null
  humidityMin?: number | null
  humidityMax?: number | null
  co2Min?: number | null
  co2Max?: number | null
  substrateMoistureMin?: number | null
  substrateMoistureMax?: number | null
}

/** Query filter */
export interface MushroomConditionListQuery {
  mushroomTypeId?: number
}