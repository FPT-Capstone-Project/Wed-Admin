import type { AutoControlConfigurationResponse } from '../../../types/iot'
import type { ClimateThresholds } from '../../rooms/utils/tray-climate.utils'
import { extractTemperatureBounds } from '../../dashboard/utils/temperature-threshold.utils'

/**
 * Ngưỡng môi trường (nhiệt độ + độ ẩm) của các tầng thuộc một phiên.
 *
 * ## Vì sao cần?
 *
 * Biểu đồ "Lịch sử cảm biến" của phiên cần biết **ngưỡng canh tác** để báo
 * "vượt / thấp hơn ngưỡng" trong tooltip — giống hệt Dashboard.
 *
 * ⚠ **Không** sửa backend. Nguồn là endpoint **read-only**
 *   `GET /api/iot/floors/{floorId}/auto-control` (chỉ cần đăng nhập) mà BE
 *   đã trả sẵn `floorSuggestion.common` — khoảng ngưỡng chung BE tính từ
 *   các profile nấm đang trồng trên tầng.
 *
 * ⚠ Ngưỡng **nhiệt độ** suy ra y như Dashboard (`extractTemperatureBounds`):
 *   `temperature_min`/`temperature_max` trong DB NULL trừ khi bật làm mát.
 *
 * ⚠ Ngưỡng **độ ẩm** đọc thẳng từ `floorSuggestion.common` /
 *   `floorSuggestion.config` — 2 field này luôn có trong cấu hình tưới phun.
 */

/** Đọc số hợp lệ (chấp nhận chuỗi số) — fallback `null`. */
function toFinite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Chỉ nhận cặp ngưỡng dùng được: min < max. */
function toPair(
  min: unknown,
  max: unknown,
): { min: number; max: number } | null {
  const lo = toFinite(min)
  const hi = toFinite(max)
  if (lo == null || hi == null) return null
  if (lo >= hi) return null
  return { min: lo, max: hi }
}

/** Lấy ngưỡng độ ẩm từ 1 record (dạng `Record<string, unknown>`). */
function readHumidity(
  record: Record<string, unknown> | null | undefined,
): { min: number; max: number } | null {
  if (!record) return null
  return toPair(
    record.humidity_min ?? record.humidityMin,
    record.humidity_max ?? record.humidityMax,
  )
}

/**
 * Suy ra ngưỡng môi trường từ response `GET /api/iot/floors/{floorId}/auto-control`.
 *
 * @returns ngưỡng, hoặc `null` khi không xác định được đủ (thiếu cả nhiệt độ
 *   lẫn độ ẩm).
 */
export function extractSessionClimateThresholds(
  response: AutoControlConfigurationResponse | null | undefined,
): ClimateThresholds | null {
  if (!response || typeof response !== 'object') return null

  const floorSuggestion = response.floorSuggestion ?? null

  // 1. Khoảng chung do BE tính sẵn — nguồn chính xác nhất cho cả 2 chỉ số.
  const common = floorSuggestion?.common
  const humidityFromCommon = readHumidity(
    common as Record<string, unknown> | null | undefined,
  )

  // 2. Ngưỡng nhiệt độ fallback (nhiều nguồn) — dùng chung logic Dashboard.
  const temperature = extractTemperatureBounds(response)

  if (!temperature && !humidityFromCommon) return null

  // 3. Ngưỡng độ ẩm fallback từ cấu hình đề xuất.
  const humidity =
    humidityFromCommon ??
    readHumidity(
      floorSuggestion?.config as unknown as Record<string, unknown> | null,
    )

  return {
    tempMin: temperature?.tempMin ?? null,
    tempMax: temperature?.tempMax ?? null,
    humidityMin: humidity?.min ?? null,
    humidityMax: humidity?.max ?? null,
  }
}
