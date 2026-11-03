import type {
  HistoryGranularity,
  HistoryRangePreset,
  LongTermTelemetryPoint,
} from '../../../types/iot-history'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export interface AggregatedTelemetryPoint {
  key: string
  label: string
  year: number
  period: number
  temperature: number
  humidity: number
}

export interface ComparisonTelemetryPoint {
  label: string
  period: number
  /** Nhiệt độ của năm cũ hơn (`yearA`). */
  temperatureYearA?: number
  /** Nhiệt độ của năm mới hơn (`yearB`). */
  temperatureYearB?: number
  /** Độ ẩm của năm cũ hơn (`yearA`). */
  humidityYearA?: number
  /** Độ ẩm của năm mới hơn (`yearB`). */
  humidityYearB?: number
}

export interface YearComparisonResult {
  data: ComparisonTelemetryPoint[]
  /** Cặp năm được so sánh (cũ → mới). `null` khi dữ liệu chưa đủ 2 năm. */
  years: [number, number] | null
}

function roundToOneDecimal(value: number) {
  return Number(value.toFixed(1))
}

function getWeekOfYear(date: Date) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.floor((date.getTime() - startOfYear) / (7 * DAY_IN_MILLISECONDS)) + 1
}

function filterByRange(
  points: LongTermTelemetryPoint[],
  range: HistoryRangePreset,
) {
  if (range !== 'LAST_12_MONTHS' || points.length === 0) {
    return points
  }

  const latestTimestamp = Math.max(
    ...points.map((point) => new Date(point.timestamp).getTime()),
  )
  const cutoff = new Date(latestTimestamp)
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1)

  return points.filter(
    (point) => new Date(point.timestamp).getTime() >= cutoff.getTime(),
  )
}

export function aggregateLongTermTelemetry(
  points: LongTermTelemetryPoint[],
  range: HistoryRangePreset,
  granularity: HistoryGranularity,
): AggregatedTelemetryPoint[] {
  const groups = new Map<
    string,
    {
      year: number
      period: number
      temperature: number
      humidity: number
      count: number
    }
  >()

  filterByRange(points, range).forEach((point) => {
    const date = new Date(point.timestamp)
    const year = date.getUTCFullYear()
    const period =
      granularity === 'MONTH' ? date.getUTCMonth() + 1 : getWeekOfYear(date)
    const key = `${year}-${granularity}-${String(period).padStart(2, '0')}`
    const current = groups.get(key) ?? {
      year,
      period,
      temperature: 0,
      humidity: 0,
      count: 0,
    }

    current.temperature += point.temperature
    current.humidity += point.humidity
    current.count += 1
    groups.set(key, current)
  })

  return [...groups.entries()]
    .sort(([, left], [, right]) =>
      left.year === right.year
        ? left.period - right.period
        : left.year - right.year,
    )
    .map(([key, group]) => ({
      key,
      year: group.year,
      period: group.period,
      label:
        granularity === 'MONTH'
          ? `T${String(group.period).padStart(2, '0')}/${String(group.year).slice(-2)}`
          : `W${String(group.period).padStart(2, '0')}/${String(group.year).slice(-2)}`,
      temperature: roundToOneDecimal(group.temperature / group.count),
      humidity: roundToOneDecimal(group.humidity / group.count),
    }))
}

/**
 * So sánh 2 năm có dữ liệu gần nhất trong timeline.
 *
 * ⚠ Trước đây hàm này hard-code 2025 vs 2026 → sai khi dữ liệu thật có năm
 * khác. Nay chọn động 2 năm **mới nhất** có dữ liệu.
 */
export function buildYearComparison(
  points: AggregatedTelemetryPoint[],
  granularity: HistoryGranularity,
): YearComparisonResult {
  const years = [...new Set(points.map((point) => point.year))].sort(
    (left, right) => left - right,
  )

  if (years.length < 2) {
    return { data: [], years: null }
  }

  const [yearA, yearB] = [years[years.length - 2], years[years.length - 1]]
  const periods = new Map<number, ComparisonTelemetryPoint>()

  points
    .filter((point) => point.year === yearA || point.year === yearB)
    .forEach((point) => {
      const current = periods.get(point.period) ?? {
        period: point.period,
        label:
          granularity === 'MONTH'
            ? `Tháng ${point.period}`
            : `Tuần ${point.period}`,
      }

      if (point.year === yearA) {
        current.temperatureYearA = point.temperature
        current.humidityYearA = point.humidity
      }

      if (point.year === yearB) {
        current.temperatureYearB = point.temperature
        current.humidityYearB = point.humidity
      }

      periods.set(point.period, current)
    })

  return {
    data: [...periods.values()].sort(
      (left, right) => left.period - right.period,
    ),
    years: [yearA, yearB],
  }
}

/**
 * Tính độ dài gói thuê theo đơn vị ngày.
 *
 * Ngày trong gói = (endDate - startDate) + 1 (bao gồm cả ngày bắt đầu).
 * Ví dụ: 13/09 → 19/09 = 6 khoảng cách = **7 ngày** (gói 1 tuần).
 *
 * Trả về cả `diffDays` (khoảng cách) và `packageDays` (bao gồm ngày bắt đầu).
 */
export function getSessionDurationDays(
  startDate: string,
  endDate: string,
): { diffDays: number; packageDays: number } {
  const diffDays = Math.max(
    0,
    Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        DAY_IN_MILLISECONDS,
    ),
  )

  return {
    diffDays,
    packageDays: diffDays + 1,
  }
}

/**
 * Helper format nhãn "Thời gian thuê" chuẩn gói cước.
 * - Gói 7 ngày → "7 ngày (Gói 1 tuần)"
 * - Gói 30 ngày → "30 ngày (Gói 1 tháng)"
 * - Các gói khác → "N ngày"
 */
export function formatRentalDurationLabel(startDate: string, endDate: string) {
  const { packageDays } = getSessionDurationDays(startDate, endDate)

  if (packageDays === 7) {
    return `${packageDays} ngày (Gói 1 tuần)`
  }

  if (packageDays === 30 || packageDays === 31) {
    return `${packageDays} ngày (Gói 1 tháng)`
  }

  return `${packageDays} ngày`
}

export function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatTelemetryTimestamp(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
