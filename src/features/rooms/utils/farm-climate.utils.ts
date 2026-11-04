import { getClimateTone, getClimateDirection, type ClimateTone } from './climate-tone.utils.ts'
import {
  evaluateTemperature, evaluateHumidity,
  type ClimateThresholds,
} from './tray-climate.utils.ts'

export interface FloorClimatePoint {
  floorName: string
  temperature: number | null
  humidity: number | null
  thresholds: ClimateThresholds | null
}

/** Display adapter only: never substitute guessed cultivation thresholds. */
export function climateThresholdsFromConfig(config: {
  temperature_min?: number | null
  temperature_max?: number | null
  humidity_min?: number | null
  humidity_max?: number | null
} | null | undefined): ClimateThresholds | null {
  if (!config) return null
  const finite = (value: number | null | undefined) =>
    value != null && Number.isFinite(value) ? value : null
  return {
    tempMin: finite(config.temperature_min), tempMax: finite(config.temperature_max),
    humidityMin: finite(config.humidity_min), humidityMax: finite(config.humidity_max),
  }
}

export interface FarmClimateSummary {
  value: number | null
  tone: ClimateTone
  label: string
  missingCount: number
  coverageNote: string
  details: string[]
}

export function summarizeFarmClimate(
  points: readonly FloorClimatePoint[],
  metric: 'temperature' | 'humidity',
): FarmClimateSummary {
  const evaluate = metric === 'temperature' ? evaluateTemperature : evaluateHumidity
  const readings = points.map(point => ({
    name: point.floorName, reading: evaluate(point[metric], point.thresholds),
  }))
  const assessed = readings.filter(({ reading }) => reading.level !== 'neutral')
  const missingCount = points.length - assessed.length
  const tone = assessed.some(({ reading }) => getClimateTone(metric, getClimateDirection(reading)) === 'danger')
    ? 'danger' : assessed.length ? 'ok' : 'muted'
  // Average and severity are independent; include every finite measurement.
  const values = readings.flatMap(({ reading }) => reading.value == null ? [] : [reading.value])
  const value = assessed.length && values.length
    ? Math.round(values.reduce((sum, current) => sum + current, 0) / values.length * 10) / 10
    : null
  const unit = metric === 'temperature' ? '°C' : '%RH'
  return {
    value, tone, missingCount,
    label: tone === 'danger' ? 'Có tầng vượt ngưỡng'
        : tone === 'ok' ? metric === 'temperature' ? 'Ổn định' : 'Tối ưu'
          : 'Chưa đủ thông tin',
    coverageNote: missingCount ? `${missingCount}/${points.length} tầng chưa đủ dữ liệu hoặc ngưỡng`
      : points.length ? `Đã đánh giá ${points.length}/${points.length} tầng` : 'Chưa có dữ liệu tầng',
    details: readings.filter(({ reading }) => ['high', 'low'].includes(getClimateDirection(reading)))
      .map(({ name, reading }) => {
        const below = reading.min != null && reading.value! < reading.min
        return `${name}: ${reading.value}${unit} ${below ? '<' : '>'} ${below ? reading.min : reading.max}${unit}; ${below ? 'thấp' : 'cao'} hơn ngưỡng ${reading.deviation}${unit}; mục tiêu ${reading.targetLabel}`
      }),
  }
}
