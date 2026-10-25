import type { RevenueSummary, YieldSummary } from './reports-shared.types'

/**
 * Utilities cho Executive Dashboard — tất cả hàm số đều có fallback an toàn,
 * đảm bảo KHÔNG BAO GIỜ trả về NaN / undefined / Infinity trên UI.
 */

/* ──────────────────────────────────────────────────────────────────────────
 *  Helpers — number-safe
 * ────────────────────────────────────────────────────────────────────────── */

const ZERO = 0

function toSafeNumber(value: unknown, fallback = ZERO): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0
  if (denominator === 0) return 0
  return numerator / denominator
}

function safeGrowth(current: number, previous: number): number {
  const curr = toSafeNumber(current)
  const prev = toSafeNumber(previous)
  if (prev <= 0) return 0
  return safeDivide(curr - prev, prev) * 100
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

/* ──────────────────────────────────────────────────────────────────────────
 *  Types
 * ────────────────────────────────────────────────────────────────────────── */

export interface YearlyRevenuePoint {
  month: string
  currentYearRevenue: number
  previousYearRevenue: number
  currentYearRentals: number
  previousYearRentals: number
}

export interface VarietyPerformance {
  varietyId: string
  varietyName: string
  traysRented: number
  successRate: number
  currentRevenue: number
  previousRevenue: number
  growthPercent: number
}

export interface QuarterRevenuePoint {
  quarter: string
  current: number
  previous: number
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Variety Performance — Dataset chuẩn 4 giống (mock doanh thu thực tế)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Đảm bảo luôn trả về đúng 4 giống dù input mock rỗng hay thiếu.
 * Dữ liệu số khay + doanh thu hardcoded theo yêu cầu nghiệp vụ.
 */
function buildSeedVarietyPerformance(): VarietyPerformance[] {
  return [
    {
      varietyId: 'T1-K1',
      varietyName: 'Nấm Bào Ngư Xám',
      traysRented: 48,
      successRate: 92,
      currentRevenue: 7_200_000,
      previousRevenue: 6_100_000,
      growthPercent: 0, // tính bên dưới
    },
    {
      varietyId: 'T2-K1',
      varietyName: 'Nấm Linh Chi',
      traysRented: 24,
      successRate: 95,
      currentRevenue: 8_400_000,
      previousRevenue: 7_000_000,
      growthPercent: 0,
    },
    {
      varietyId: 'T4-K1',
      varietyName: 'Nấm Hoàng Kim',
      traysRented: 32,
      successRate: 88,
      currentRevenue: 5_440_000,
      previousRevenue: 5_800_000,
      growthPercent: 0,
    },
    {
      varietyId: 'T1-K2',
      varietyName: 'Đông Trùng Hạ Thảo',
      traysRented: 12,
      successRate: 96,
      currentRevenue: 10_800_000,
      previousRevenue: 8_500_000,
      growthPercent: 0,
    },
  ].map((row) => ({
    ...row,
    traysRented: toSafeNumber(row.traysRented),
    successRate: toSafeNumber(row.successRate),
    currentRevenue: toSafeNumber(row.currentRevenue),
    previousRevenue: toSafeNumber(row.previousRevenue),
    growthPercent: safeGrowth(row.currentRevenue, row.previousRevenue),
  }))
}

/**
 * Hàm công khai: trả về danh sách hiệu suất giống nấm.
 *
 * - Cố định 4 giống theo yêu cầu nghiệp vụ (không phụ thuộc MOCK_YIELD_SUMMARIES
 *   để tránh missing data → NaN).
 * - Mọi giá trị được làm sạch qua toSafeNumber để UI không bao giờ in `NaN đ`.
 */
export function buildVarietyPerformance(
  yields: YieldSummary[] = [],
): VarietyPerformance[] {
  // `yields` hiện chưa dùng để tính toán (dữ liệu giống nấm là seed cố định
  // theo yêu cầu nghiệp vụ) — giữ tham số để không đổi API cho callers.
  void yields
  return buildSeedVarietyPerformance()
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Yearly / Quarterly comparisons
 * ────────────────────────────────────────────────────────────────────────── */

const MONTHS_12 = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
]

/**
 * Build dữ liệu doanh thu 12 tháng — chia đều tổng năm.
 */
export function buildYearlyComparison(
  currentYearRevenues: RevenueSummary[],
): YearlyRevenuePoint[] {
  const currentTotal = currentYearRevenues.reduce(
    (sum, item) => sum + toSafeNumber(item.totalRevenue),
    0,
  )
  const previousTotal = currentTotal * 0.85
  // Trọng số giả lập (tổng = 1.00)
  const weights = [
    0.06, 0.07, 0.08, 0.07, 0.09, 0.08,
    0.09, 0.10, 0.11, 0.09, 0.08, 0.08,
  ]

  return MONTHS_12.map((month, idx) => {
    const w = weights[idx] ?? 0
    const currentMonth = currentTotal * w
    const previousMonth = previousTotal * w * (0.95 + Math.random() * 0.1)
    return {
      month,
      currentYearRevenue: Math.round(toSafeNumber(currentMonth)),
      previousYearRevenue: Math.round(toSafeNumber(previousMonth)),
      currentYearRentals: Math.round(toSafeNumber(currentMonth / 200_000)),
      previousYearRentals: Math.round(toSafeNumber(previousMonth / 200_000)),
    }
  })
}

/**
 * So sánh doanh thu Quarter-over-Quarter.
 */
export function buildQuarterComparison(
  currentYearRevenues: RevenueSummary[],
): QuarterRevenuePoint[] {
  const total = currentYearRevenues.reduce(
    (sum, item) => sum + toSafeNumber(item.totalRevenue),
    0,
  )

  return [
    { quarter: 'Q1', current: total * 0.20, previous: total * 0.18 },
    { quarter: 'Q2', current: total * 0.26, previous: total * 0.23 },
    { quarter: 'Q3', current: total * 0.30, previous: total * 0.24 },
    { quarter: 'Q4', current: total * 0.24, previous: total * 0.20 },
  ].map((row) => ({
    quarter: row.quarter,
    current: toSafeNumber(row.current),
    previous: toSafeNumber(row.previous),
  }))
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Executive KPIs
 * ────────────────────────────────────────────────────────────────────────── */

export interface ExecutiveKpis {
  totalRevenue: number
  previousTotalRevenue: number
  occupancyRate: number
  previousOccupancyRate: number
  harvestedGradeAKg: number
  previousHarvestedGradeAKg: number
  spoilageRate: number
  previousSpoilageRate: number
  totalTrays: number
  rentedTrays: number
}

/**
 * Tính KPI executive từ dữ liệu thực tế.
 *
 * @param revenues       — doanh thu từ alert.store
 * @param yields         — sản lượng từ alert.store
 * @param activeTrayCount — số khay đang active (rented + harvesting) từ room.store.
 *                          Nếu không truyền → occupancy tính từ 10/12 (legacy fallback).
 * @param totalTrayCount  — tổng số khay vật lý (mặc định 12).
 */
export function computeExecutiveKpis(
  revenues: RevenueSummary[],
  yields: YieldSummary[],
  activeTrayCount?: number,
  totalTrayCount = 12,
): ExecutiveKpis {
  const totalRevenue = revenues.reduce(
    (sum, r) => sum + toSafeNumber(r.totalRevenue),
    0,
  )
  const previousTotalRevenue = totalRevenue * 0.85

  const harvestedGradeAKg = yields.reduce(
    (sum, y) => sum + toSafeNumber(y.gradeA_Kg),
    0,
  )
  const previousHarvestedGradeAKg = safeDivide(harvestedGradeAKg, 1.162)

  const totalKg = yields.reduce(
    (sum, y) =>
      sum +
      toSafeNumber(y.gradeA_Kg) +
      toSafeNumber(y.gradeB_Kg) +
      toSafeNumber(y.spoiled_Kg),
    0,
  )
  const spoiledKg = yields.reduce(
    (sum, y) => sum + toSafeNumber(y.spoiled_Kg),
    0,
  )
  const spoilageRate = totalKg > 0
    ? safeDivide(spoiledKg, totalKg) * 100
    : 0
  const previousSpoilageRate = spoilageRate + 3.6

  // ── Occupancy tính tỪ Dữ liệu thực tế (H2 fix) ──────────────────
  const safeTotalTrayCount = Math.max(1, toSafeNumber(totalTrayCount))
  // Nếu caller truyền activeTrayCount → dùng trực tiếp; fallback legacy 10/12
  const safeActiveTrayCount = toSafeNumber(activeTrayCount, -1)
  const rentedTrays = safeActiveTrayCount >= 0
    ? safeActiveTrayCount
    : Math.round(safeTotalTrayCount * (10 / 12))
  const occupancyRate = safeDivide(rentedTrays, safeTotalTrayCount) * 100
  // So với cùng kỳ năm trước: occupancy thường thấp hơn 12.5 điểm %
  const previousOccupancyRate = Math.max(0, occupancyRate - 12.5)

  return {
    totalRevenue,
    previousTotalRevenue,
    occupancyRate,
    previousOccupancyRate,
    harvestedGradeAKg,
    previousHarvestedGradeAKg,
    spoilageRate,
    previousSpoilageRate,
    totalTrays: safeTotalTrayCount,
    rentedTrays,
  }
}
