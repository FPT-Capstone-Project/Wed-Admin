import { formatVND } from '../../../shared/utils/currency'
import type {
  ReportsAnalytics,
  MonthlyRevenue,
  SpeciesBreakdown,
} from '../../../features/analytics/api/analytics.api'
import { SESSION_STATUS_DICTIONARY } from '../../../shared/i18n/status/session'
import { statusLabel } from '../../../shared/i18n/status/registry'

/**
 * Utilities cho Executive Dashboard — **dữ liệu thật**.
 *
 * ⚠ Đã bỏ hoàn toàn `MOCK_REVENUE_SUMMARIES` / `MOCK_YIELD_SUMMARIES` /
 *   `MOCK_ENVIRONMENT_HISTORY`. Mọi hàm dưới đây nhận `ReportsAnalytics` tổng hợp
 *   từ các endpoint GET (không còn vòng lặp N+1 theo tầng/phiên).
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

/** Compatibility adapter; all currency formatting lives in the shared utility. */
export function formatCurrency(value: unknown, fallback = '—'): string {
  return formatVND(
    typeof value === 'number' || typeof value === 'string' ? value : null,
    { fallback },
  )
}

// ─── Types ───────────────────────────────────────────────────────────────

/** Điểm biểu đồ doanh thu theo tháng (kỳ này vs kỳ trước). */
export interface MonthlyRevenuePoint {
  month: string
  current: number
  previous: number | null
}

/** Hiệu suất theo giống nấm — dựng từ cơ cấu giống nấm thật. */
export interface VarietyPerformance {
  varietyId: string
  varietyName: string
  /** Số phiên canh tác của giống nấm. */
  traysRented: number | null
  /** Tỷ lệ phiên hoàn thành trong số phiên đã kết thúc (0–100). */
  successRate: number | null
  currentRevenue: number
  previousRevenue: number
  growthPercent: number
}

/** KPI executive tính từ dữ liệu thật. */
export interface ExecutiveKpis {
  /** Doanh thu thật từ danh sách đơn PAID dùng chung cho báo cáo. */
  totalRevenue: number
  /** Kỳ trước — chưa có dữ liệu lịch sử ⇒ 0. */
  previousTotalRevenue: number
  occupancyRate: number
  previousOccupancyRate: number
  /** Khối lượng thu hoạch đạt chuẩn (kg). */
  harvestedGradeAKg: number
  previousHarvestedGradeAKg: number
  /** Tỷ lệ thu hoạch hao hụt (%). */
  spoilageRate: number
  previousSpoilageRate: number
  totalTrays: number
  rentedTrays: number
}

// ─── Doanh thu theo tháng ────────────────────────────────────────────────

/**
 * Chuẩn hoá danh sách doanh thu theo tháng thật thành điểm biểu đồ.
 *
 * @param monthlyRevenue doanh thu thực tế theo tháng (created_at của đơn PAID)
 * @param months số tháng hiển thị (mặc định 12)
 */
export function buildMonthlyComparison(
  monthlyRevenue: MonthlyRevenue[],
  months = 12,
): MonthlyRevenuePoint[] {
  const safe = monthlyRevenue.slice(-months)

  return safe.map((entry) => ({
    month: entry.label,
    current: Math.round(toSafeNumber(entry.revenue)),
    // null phân biệt thiếu lịch sử với doanh thu kỳ trước thực sự bằng 0.
    previous: null,
  }))
}

/**
 * Adapter cũ từ dữ liệu tháng; biểu đồ báo cáo dùng buildOrderRevenue để gom tuần.
 * Key tuần: `YYYY-WNN` (vd "2026-W44").
 *
 * ⚠ BE không trả dữ liệu theo tuần — hàm này là alias cho `buildMonthlyComparison`
 *   để tránh NaN / undefined khi granularity === 'WEEKLY'.
 */
export function buildWeeklyRevenue(
  monthlyRevenue: MonthlyRevenue[],
): MonthlyRevenuePoint[] {
  // monthlyRevenue không có weekly, nên hàm này fallback về monthly
  // nhưng đổi label hiển thị thành "W{tuần}" — thực tế dữ liệu thô
  // chỉ có granularity tháng từ BE nên trả về monthly với label "T{n}"
  return buildMonthlyComparison(monthlyRevenue)
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
    byQuarter.set(key, (byQuarter.get(key) ?? 0) + toSafeNumber(entry.revenue))
  }

  return [...byQuarter.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, revenue]) => ({
      month: key.split('-')[1],
      current: Math.round(revenue),
      previous: null,
    }))
}

// ─── Hiệu suất theo giống nấm ───────────────────────────────────────────

/**
 * Dựng bảng hiệu suất theo giống nấm từ cơ cấu giống nấm thật.
 *
 * Tỷ lệ thành công lấy từ kết quả phiên theo giống; chưa có phiên kết thúc là null.
 */
export function buildVarietyPerformance(
  speciesBreakdown: SpeciesBreakdown[],

): VarietyPerformance[] {
  return speciesBreakdown.map((entry) => {
    const currentRevenue = Math.round(toSafeNumber(entry.revenue))

    return {
      varietyId: entry.species,
      varietyName: entry.species,
      traysRented: entry.species.trim().toLocaleLowerCase('vi-VN') === 'khác' && entry.sessionCount === 0
        ? null : toSafeNumber(entry.sessionCount),
      successRate: entry.successRate ?? null,
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
 * @param analytics tổng hợp từ `useReportsAnalytics`
 */
export function computeExecutiveKpis(
  analytics: ReportsAnalytics,
): ExecutiveKpis {
  const trays = analytics.trays

  // Kỳ trước chưa có dữ liệu thật (BE không lưu lịch sử doanh thu) → 0.
  const previousTotalRevenue = 0
  const previousOccupancyRate = 0
  const previousHarvestedGradeAKg = 0
  const previousSpoilageRate = 0

  return {
    totalRevenue: Math.round(toSafeNumber(analytics.totalRevenue)),
    previousTotalRevenue,
    occupancyRate: toSafeNumber(trays.occupancyRate),
    previousOccupancyRate,
    harvestedGradeAKg: toSafeNumber(analytics.usableHarvestWeightKg),
    previousHarvestedGradeAKg,
    spoilageRate: toSafeNumber(analytics.wasteRate),
    previousSpoilageRate,
    totalTrays: toSafeNumber(trays.total),
    rentedTrays: toSafeNumber(trays.occupied),
  }
}

/**
 * Phân bổ phiên canh tác theo giai đoạn — dùng vẽ biểu đồ cột.
 */
export function buildStageDistribution(analytics: ReportsAnalytics) {
  return Object.entries(analytics.sessionsByStage)
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => ({
      // ⚠ Dùng từ điển trung tâm ⇒ 1 nguồn sự thật (2.C) + không lộ enum lạ.
      stage: statusLabel(SESSION_STATUS_DICTIONARY, stage),
      count,
    }))
}

/** Bucket paid order amounts using Vietnam calendar dates; Monday starts a week. */
export function buildOrderRevenue(events: ReportsAnalytics['revenueEvents'], granularity: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'): MonthlyRevenuePoint[] {
  const buckets = new Map<string, number>()
  for (const event of events) {
    const instant = new Date(event.date)
    if (!Number.isFinite(instant.getTime()) || instant.getUTCFullYear() <= 1970) {
      buckets.set('UNKNOWN', (buckets.get('UNKNOWN') ?? 0) + event.amount)
      continue
    }
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant)
    const part = (name: string) => Number(parts.find(p => p.type === name)?.value)
    const year = part('year'), month = part('month'), day = part('day')
    let key: string
    if (granularity === 'WEEKLY') {
      const monday = new Date(Date.UTC(year, month - 1, day))
      monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
      key = monday.toISOString().slice(0, 10)
    } else key = granularity === 'MONTHLY' ? `${year}-${String(month).padStart(2, '0')}` : `${year}-Q${Math.ceil(month / 3)}`
    buckets.set(key, (buckets.get(key) ?? 0) + event.amount)
  }
  return [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([month, current]) => ({ month, current, previous: null }))
}
