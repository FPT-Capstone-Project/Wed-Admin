/**
 * Đánh giá chỉ số môi trường (nhiệt độ / độ ẩm) theo ngưỡng canh tác thật.
 *
 * Vấn đề giải quyết: trước đây mọi giá trị nhiệt độ đều tô đỏ (tone danger)
 * và độ ẩm tô teal — người dùng không phân biệt được "vượt ngưỡng" với
 * "đang bình thường", nên 24.5°C cũng bị coi là sự cố.
 *
 * Quy tắc (3 mức):
 *   - Trong ngưỡng [min, max]              → `ok`
 *   - Lệch nhẹ  (≤ dung sai)              → `warning`
 *   - Vượt ngưỡng                          → `danger`
 *   - Không có dữ liệu / không có mục tiêu → `neutral` (KHÔNG coi là ok)
 *
 * Mọi màu hiển thị lấy từ `tokens.ts` ( SemanticTone ), không hardcode hex.
 */
import type { SemanticTone } from '../../../app/theme/tokens'

/** Dung sai nhiệt độ — lệch trong ±2°C vẫn chấp nhận được. */
export const TEMPERATURE_TOLERANCE_C = 2

/** Dung sai độ ẩm — lệch trong ±5%RH vẫn chấp nhận được. */
export const HUMIDITY_TOLERANCE_PERCENT = 5

/** Mức đánh giá môi trường — ánh xạ thẳng sang tone của design system. */
export type ClimateLevel = 'ok' | 'warning' | 'danger' | 'neutral'

/** Ngưỡng mục tiêu của một tầng. Field null = chưa có mục tiêu. */
export interface ClimateThresholds {
  tempMin: number | null
  tempMax: number | null
  humidityMin: number | null
  humidityMax: number | null
}

/** Kết quả đánh giá một chỉ số. */
export interface ClimateReading {
  /** Giá trị đo được (null = chưa có dữ liệu). */
  value: number | null
  min: number | null
  max: number | null
  level: ClimateLevel
  /** Độ lệch tuyệt đối so với ngưỡng (0 = trong ngưỡng). */
  deviation: number | null
  /** Nhãn mục tiêu — vd "20–32°C". */
  targetLabel: string | null
  /** Nhãn trạng thái ngắn — vd "Cao hơn ngưỡng 2.3°C". */
  statusLabel: string
}

/** Tone màu tương ứng với mức đánh giá. */
export const CLIMATE_TONE: Record<ClimateLevel, SemanticTone> = {
  ok: 'ok',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral',
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** "20–32°C" hoặc "80–87%RH". */
export function formatClimateTarget(
  min: number | null,
  max: number | null,
  unit: string,
): string | null {
  if (min == null && max == null) return null
  if (min == null) return `≤ ${formatNumber(max as number)}${unit}`
  if (max == null) return `≥ ${formatNumber(min)}${unit}`
  return `${formatNumber(min)}–${formatNumber(max)}${unit}`
}

/**
 * Đánh giá một giá trị so với ngưỡng.
 *
 * @param tolerance dung sai chấp nhận được — lệch trong khoảng này là
 *                  `warning` (cần chú ý) thay vì `danger` (sự cố).
 */
export function evaluateClimateValue(
  value: number | null,
  min: number | null,
  max: number | null,
  tolerance: number,
  unit: string,
): ClimateReading {
  const targetLabel = formatClimateTarget(min, max, unit)

  if (value == null || !Number.isFinite(value)) {
    return {
      value: null,
      min,
      max,
      level: 'neutral',
      deviation: null,
      targetLabel,
      statusLabel: 'Chưa có dữ liệu',
    }
  }

  if (min == null && max == null) {
    return {
      value,
      min,
      max,
      level: 'neutral',
      deviation: null,
      targetLabel,
      statusLabel: 'Chưa có mục tiêu',
    }
  }

  const deviation =
    min != null && value < min
      ? min - value
      : max != null && value > max
        ? value - max
        : 0

  if (deviation === 0) {
    return {
      value,
      min,
      max,
      level: 'ok',
      deviation: 0,
      targetLabel,
      statusLabel: 'Trong ngưỡng',
    }
  }

  const isBelow = min != null && value < min
  const level: ClimateLevel = deviation <= tolerance ? 'warning' : 'danger'

  return {
    value,
    min,
    max,
    level,
    deviation,
    targetLabel,
    statusLabel: `${isBelow ? 'Thấp hơn' : 'Cao hơn'} ngưỡng ${formatNumber(deviation)}${unit}`,
  }
}

/** Đánh giá nhiệt độ của tầng. */
export function evaluateTemperature(
  value: number | null,
  thresholds: ClimateThresholds | null,
): ClimateReading {
  return evaluateClimateValue(
    value,
    thresholds?.tempMin ?? null,
    thresholds?.tempMax ?? null,
    TEMPERATURE_TOLERANCE_C,
    '°C',
  )
}

/** Đánh giá độ ẩm của tầng. */
export function evaluateHumidity(
  value: number | null,
  thresholds: ClimateThresholds | null,
): ClimateReading {
  return evaluateClimateValue(
    value,
    thresholds?.humidityMin ?? null,
    thresholds?.humidityMax ?? null,
    HUMIDITY_TOLERANCE_PERCENT,
    '%RH',
  )
}

/** Ngưỡng tối thiểu — dùng cho fallback khi BE chưa trả `thresholds`. */
export interface ClimateThresholdBounds {
  temperature_min?: number | null
  temperature_max?: number | null
  humidity_min?: number | null
  humidity_max?: number | null
}

/** Gợi ý ngưỡng từ BE (`GET /api/iot/floors/{id}/auto-control/suggestions`). */
export interface ClimateThresholdSuggestion {
  /** Khoảng giao của MỌI profile nấm đang trồng trên tầng. */
  common?: Record<string, number | null> | null
  /** Các profile nguồn BE dùng để suy ra `common`. */
  sourceProfiles?: readonly ClimateThresholdBounds[]
}

/**
 * Chọn ngưỡng fallback khi tầng chưa có cấu hình auto-control.
 *
 * Thứ tự ưu tiên:
 *   1. `common` — khoảng giao của MỌI profile nấm đang trồng trên tầng.
 *   2. Đúng MỘT profile nguồn → dùng luôn ngưỡng của profile đó.
 *   3. Nhiều profile xung đột nhau → `null` — KHÔNG đoán, để UI hiển thị
 *      trung tính ("chưa có mục tiêu") thay vì tô màu sai.
 */
export function resolveFallbackThresholds(
  suggestions: ClimateThresholdSuggestion | null | undefined,
): ClimateThresholds | null {
  if (!suggestions) return null

  const fromBounds = (
    bounds: ClimateThresholdBounds | null | undefined,
  ): ClimateThresholds | null => {
    if (!bounds) return null

    const tempMin = bounds.temperature_min ?? null
    const tempMax = bounds.temperature_max ?? null
    const humidityMin = bounds.humidity_min ?? null
    const humidityMax = bounds.humidity_max ?? null

    if (
      tempMin == null &&
      tempMax == null &&
      humidityMin == null &&
      humidityMax == null
    ) {
      return null
    }

    return { tempMin, tempMax, humidityMin, humidityMax }
  }

  const common = fromBounds(suggestions.common)
  if (common) return common

  const profiles = suggestions.sourceProfiles ?? []
  if (profiles.length === 1) return fromBounds(profiles[0])

  return null
}
