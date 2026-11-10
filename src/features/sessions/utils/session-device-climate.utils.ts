import type { SessionDeviceEvent } from '../types/session-device-activity.types'

/**
 * Trích nhiệt độ / độ ẩm của một dòng nhật ký thiết bị.
 *
 * ## Vì sao cần fallback?
 *
 * ⚠ Cột `average_temperature` của `iot_auto_control_logs` **chỉ được thêm ở
 *   migration 012** ⇒ các dòng log cũ có `average_temperature = NULL`.
 *
 * ⚠ Ngoài ra BE chỉ ghi `sensor_values_json` cho **một số** loại sự kiện
 *   (`DECISION`, `PULSE_RESERVED`, `FAULT`) ⇒ không phải dòng nào cũng có.
 *
 *   → Thứ tự ưu tiên:
 *     1. `average_temperature` / `average_humidity` (đã gộp sẵn của BE).
 *     2. Trung bình `sensor_values_json` (mảng `{ sensorId, humidity,
 *        temperature, valid, ... }` của cảm biến **hợp lệ**).
 *     3. `null` ⇒ hiển thị "—".
 *
 * ## Vì sao chỉ tính cảm biến `valid`?
 *
 * ⚠ BE loại cảm biến **không hợp lệ** (quá cũ / retained) khỏi quyết định
 *   ⇒ tính cả cảm biến hỏng sẽ ra số sai. Cảm biến không có cờ `valid`
 *   thì vẫn được tính (snapshot cũ có thể không có cột này).
 */

/** Kết quả trích xuất. */
export interface SessionDeviceClimate {
  /** Nhiệt độ trung bình (°C) — `null` nếu không có dữ liệu. */
  temperature: number | null
  /** Độ ẩm trung bình (%RH) — `null` nếu không có dữ liệu. */
  humidity: number | null
  /**
   * Nguồn của giá trị — dùng để hiển thị tooltip giải thích.
   *
   * - `aggregate`: từ cột `average_*` của BE.
   * - `snapshot`: tính lại từ `sensor_values_json`.
   * - `none`: không có dữ liệu.
   */
  source: 'aggregate' | 'snapshot' | 'none'
}

/** Một phần tử cảm biến trong `sensor_values_json`. */
interface SensorSnapshot {
  humidity?: unknown
  temperature?: unknown
  valid?: unknown
}

/** Đọc 1 số hợp lệ từ value không rõ kiểu. */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Parse `sensor_values_json` thành mảng cảm biến.
 *
 * ⚠ BE lưu dạng **JSON string** trong DB (JSONB) ⇒ có thể trả về string hoặc
 *   đã parse sẵn tuỳ phiên bản ⇒ xử lý cả 2.
 */
function parseSensorSnapshot(raw: unknown): SensorSnapshot[] {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as SensorSnapshot[]) : []
    } catch {
      return []
    }
  }
  if (Array.isArray(raw)) return raw as SensorSnapshot[]
  return []
}

/**
 * Trích nhiệt độ / độ ẩm từ 1 dòng nhật ký thiết bị.
 */
export function extractDeviceClimate(
  event: SessionDeviceEvent | null | undefined,
): SessionDeviceClimate {
  if (!event) return { temperature: null, humidity: null, source: 'none' }

  // 1) Ưu tiên cột đã gộp sẵn của BE.
  const aggregateTemperature = event.average_temperature
  const aggregateHumidity = event.average_humidity
  if (aggregateTemperature != null || aggregateHumidity != null) {
    return {
      temperature: aggregateTemperature,
      humidity: aggregateHumidity,
      source: 'aggregate',
    }
  }

  // 2) Fallback: tính lại từ snapshot cảm biến.
  const sensors = parseSensorSnapshot(event.sensor_values_json)
  if (sensors.length === 0) {
    return { temperature: null, humidity: null, source: 'none' }
  }

  let temperatureSum = 0
  let temperatureCount = 0
  let humiditySum = 0
  let humidityCount = 0

  for (const sensor of sensors) {
    if (!sensor || typeof sensor !== 'object') continue
    // ⚠ Bỏ qua cảm biến **không hợp lệ** (BE đã loại khỏi quyết định).
    if (sensor.valid === false) continue

    const temperature = toFiniteNumber(sensor.temperature)
    if (temperature != null) {
      temperatureSum += temperature
      temperatureCount += 1
    }

    const humidity = toFiniteNumber(sensor.humidity)
    if (humidity != null) {
      humiditySum += humidity
      humidityCount += 1
    }
  }

  if (temperatureCount === 0 && humidityCount === 0) {
    return { temperature: null, humidity: null, source: 'none' }
  }

  return {
    temperature:
      temperatureCount > 0
        ? round1(temperatureSum / temperatureCount)
        : null,
    humidity: humidityCount > 0 ? round1(humiditySum / humidityCount) : null,
    source: 'snapshot',
  }
}

/** Làm tròn 1 chữ số thập phân. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}
