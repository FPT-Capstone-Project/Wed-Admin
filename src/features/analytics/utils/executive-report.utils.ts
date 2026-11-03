import type {
  FarmAnalytics,
  MonthlyRevenue,
  SpeciesBreakdown,
} from '../../../features/analytics/api/analytics.api'

/**
 * Utilities cho Executive Dashboard — **dữ liệu thật**.
 *
 * ⚠ Đã bỏ hoàn toàn `MOCK_REVENUE_SUMMARIES` / `MOCK_YIELD_SUMMARIES` /
 *   `MOCK_ENVIRONMENT_HISTORY`. Mọi hàm dưới đây nhận `FarmAnalytics` tổng hợp
 *   từ 8 endpoint GET.
 *
 * Quy ước: mọi hàm số đều có fallback an toàn — KHÔNG BAO GIỜ trả NaN /
 * undefined / Infinity ra UI.
 */

// ─── Helpers — number-safe ───────────────────────────────────────────────

const ZERO = 0

export function toSafeNumber(value: unknown, fallback = ZERO): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0
  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Format tiền tệ VND — luôn trả về chuỗi hợp lệ, fallback `0 đ` khi đầu vào lỗi.
 */
export function formatCurrency(value: unknown, fallback = '0 đ'): string {
  const safeValue = toSafeNumber(value)
  if (safeValue === 0) return fallback
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(safeValue)
}

// ─── Types ───────────────────────────────────────────────────────────────

/** Điểm biểu đồ doanh thu theo tháng (kỳ này vs kỳ trước). */
export interface MonthlyRevenuePoint {
  month: string
  current: number
  previous: number
}

/** Hiệu suất theo giống nấm — dựng từ cơ cấu giống nấm thật. */
export interface VarietyPerformance {
  varietyId: string
  varietyName: string
  /** Số phiên canh tác của giống nấm. */
  traysRented: number
  /** Tỷ lệ phôi đạt chuẩn (0–100) — suy ra từ kiểm tra phôi. */
  successRate: number
  currentRevenue: number
  previousRevenue: number
  growthPercent: number
}

/** KPI executive tính từ dữ liệu thật. */
export interface ExecutiveKpis {
  /** Doanh thu ước tính (giá gói thuê × số phiên). */
  totalRevenue: number
  /** Kỳ trước — cùng kỳ năm trước (nếu có dữ liệu). */
  previousTotalRevenue: number
  occupancyRate: number
  previousOccupancyRate: number
  /** Tổng số phôi đạt chuẩn. */
  harvestedGradeAKg: number
  previousHarvestedGradeAKg: number
  /** Tỷ lệ phôi bất thường (%). */
  spoilageRate: number
  previousSpoilageRate: number
  totalTrays: number
  rentedTrays: number
}

// ─── Doanh thu theo tháng ────────────────────────────────────────────────

/**
 * Chuẩn hoá danh sách doanh thu theo tháng thật thành điểm biểu đồ.
 *
 * @param monthlyRevenue doanh thu ước tính theo tháng (từ `start_date` phiên)
 * @param months số tháng hiển thị (mặc định 12)
 */
export function buildMonthlyComparison(
  monthlyRevenue: MonthlyRevenue[],
  months = 12,
): MonthlyRevenuePoint[] {
  const safe = monthlyRevenue.slice(-months)

  return safe.map((entry) => ({
    month: entry.label,
    current: Math.round(toSafeNumber(entry.estimatedRevenue)),
    // Kỳ trước chưa có dữ liệu thật → hiển thị 0 thay vì bịa số.
    previous: 0,
  }))
}

/**
 * Gom doanh thu theo tháng thật thành từng quý, giữ nhãn `Q1..Q4`.
 */
export function buildQuarterlyRevenue(
  monthlyRevenue: MonthlyRevenue[],
): MonthlyRevenuePoint[] {
  const byQuarter = new Map<string, number>()

  for (const entry of monthlyRevenue) {
    const [year, month] = entry.month.split('-')
    const monthIndex = Number(month)
    if (!Number.isFinite(monthIndex)) continue
    const quarter = Math.floor((monthIndex - 1) / 3) + 1
    const key = `${year}-Q${quarter}`
    byQuarter.set(key, (byQuarter.get(key) ?? 0) + toSafeNumber(entry.estimatedRevenue))
  }

  return [...byQuarter.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, revenue]) => ({
      month: key.split('-')[1],
      current: Math.round(revenue),
      previous: 0,
    }))
}

// ─── Hiệu suất theo giống nấm ───────────────────────────────────────────

/**
 * Dựng bảng hiệu suất theo giống nấm từ cơ cấu giống nấm thật.
 *
 * ⚠ BE chưa trả "tỷ lệ thành công" theo giống ⇒ dùng `spawnQuality.successRate`
 *   chung cho toàn trang trại (từ lịch sử kiểm tra phôi).
 */
export function buildVarietyPerformance(
  speciesBreakdown: SpeciesBreakdown[],
  overallSuccessRate: number,
): VarietyPerformance[] {
  return speciesBreakdown.map((entry) => {
    const currentRevenue = Math.round(toSafeNumber(entry.estimatedRevenue))

    return {
      varietyId: entry.species,
      varietyName: entry.species,
      traysRented: toSafeNumber(entry.sessionCount),
      successRate: toSafeNumber(overallSuccessRate),
      currentRevenue,
      previousRevenue: 0,
      growthPercent: 0,
    }
  })
}

// ─── KPI executive ───────────────────────────────────────────────────────

/**
 * Tính KPI executive từ dữ liệu thật.
 *
 * @param analytics tổng hợp từ `useFarmAnalytics`
 */
export function computeExecutiveKpis(analytics: FarmAnalytics): ExecutiveKpis {
  const trays = analytics.trays

  // Kỳ trước chưa có dữ liệu thật (BE không lưu lịch sử doanh thu) → 0.
  const previousTotalRevenue = 0
  const previousOccupancyRate = 0
  const previousHarvestedGradeAKg = 0
  const previousSpoilageRate = 0

  return {
    totalRevenue: Math.round(toSafeNumber(analytics.estimatedRevenue)),
    previousTotalRevenue,
    occupancyRate: toSafeNumber(trays.occupancyRate),
    previousOccupancyRate,
    harvestedGradeAKg: toSafeNumber(analytics.spawnQuality.normalQuantity),
    previousHarvestedGradeAKg,
    spoilageRate: toSafeNumber(analytics.spawnQuality.spoilageRate),
    previousSpoilageRate,
    totalTrays: toSafeNumber(trays.total),
    rentedTrays: toSafeNumber(trays.occupied),
  }
}

/**
 * Phân bổ phiên canh tác theo giai đoạn — dùng vẽ biểu đồ cột.
 */
export function buildStageDistribution(analytics: FarmAnalytics) {
  return Object.entries(analytics.sessionsByStage)
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => ({
      stage: STAGE_LABELS[stage] ?? stage,
      count,
    }))
}

const STAGE_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  SPAWN_RESTING: 'Ủ tơ / Nuôi sợi',
  MYCELIAL_DEVELOPMENT: 'Phát triển tơ',
  READY_FOR_CULTIVATION: 'Sẵn sàng canh tác',
  CULTIVATING: 'Đang canh tác',
  HARVESTING: 'Thu hoạch',
  COMPLETED: 'Đã thu hoạch',
  CANCELLED: 'Đã huỷ',
}
