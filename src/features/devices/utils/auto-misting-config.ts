/**
 * Chuẩn hoá payload `PUT /api/iot/floors/{floorId}/auto-control`.
 *
 * ⚠ BE **allow-list** field (`validateConfig` trong `autoMisting.algorithm.js`):
 * `if (Object.keys(c).some(k => !allowed.includes(k))) throw 400`.
 *
 * Nhưng `GET /auto-control` trả **nguyên row DB** (`SELECT * FROM
 * iot_auto_control_configs`) → có `id`, `floor_id`, `configured_by`,
 * `configured_at`, `updated_at`, `source_profiles`… Gửi thẳng row này đi sẽ
 * luôn bị 400 `Unknown configuration field; use Start to enter AUTO`.
 *
 * → Luôn đi qua `sanitizeAutoMistingConfig()` trước khi PUT.
 */
import type { AutoMistingConfiguration } from '../../../types/iot'

/**
 * Field BE chấp nhận — khớp `ranges` + `coolingRanges` + cờ đặc biệt trong
 * `autoMisting.algorithm.js`.
 */
const ALLOWED_KEYS = [
  'mushroom_type_id',
  'humidity_min',
  'humidity_max',
  'humidity_start_threshold',
  'humidity_stop_threshold',
  'misting_pulse_ms',
  'cooldown_ms',
  'evaluation_interval_ms',
  'sensor_max_age_ms',
  'required_valid_sensors',
  'max_sensor_spread_percent',
  'max_activations_per_hour',
  'max_cumulative_on_ms_per_hour',
  'cooling_enabled',
  'temperature_min',
  'temperature_max',
  'temperature_start_threshold',
  'temperature_stop_threshold',
  'cooling_humidity_limit',
  'max_temperature_spread_c',
  'config_source',
  'profile_name',
  'profile_approved',
] as const satisfies readonly (keyof AutoMistingConfiguration)[]

/**
 * Lọc config chỉ còn field BE nhận.
 *
 * - Bỏ mọi field lạ của row DB (`id`, `floor_id`, `configured_by`, …).
 * - Bỏ `null`/`undefined` để không ghi đè giá trị DB bằng `null`.
 * - Nhánh `FLOOR`: BE tự suy ra loại nấm từ phiên trồng → **không** gửi
 *   `mushroom_type_id` (BE trả 400 nếu có field này ở nhánh FLOOR).
 */
export function sanitizeAutoMistingConfig(
  config: Partial<AutoMistingConfiguration> | null | undefined,
): Partial<AutoMistingConfiguration> {
  if (!config) return {}

  const result: Record<string, unknown> = {}
  for (const key of ALLOWED_KEYS) {
    const value = config[key]
    if (value === undefined || value === null) continue
    result[key] = value
  }

  if (result.config_source === 'FLOOR') {
    delete result.mushroom_type_id
  }

  return result as Partial<AutoMistingConfiguration>
}
