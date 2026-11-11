import { calculateSessionProgress, addDaysToIso } from '../../../shared/utils/date'
import type { CultivationSessionStatus } from '../types/session.types'

/**
 * Công thức **duy nhất** cho tiến độ sinh trưởng (0–100 %) trên toàn bộ
 * Web Admin.
 *
 * ⚠ Vì sao cần 1 nguồn sự thật?
 *   Trước đây mỗi trang tự tính tiến độ theo cách khác nhau:
 *     - Trang "Phiên canh tác" dùng `progress_percent` của BE, fallback
 *       theo bảng `SESSION_DEFAULT_PROGRESS` (CULTIVATING → 65 %).
 *     - Trang "Sinh trưởng & thu hoạch" dùng `GROWTH_STAGE_META.defaultProgress`
 *       (CULTIVATING → **70 %** — hardcode).
 *     - Drawer chi tiết khay dùng `growthDay / expectedHarvestDay`.
 *
 *   ⇒ Cùng 1 phiên (trồng 2 ngày / 16 ngày) hiển thị **0 %** ở một trang và
 *     **70 %** ở trang khác. Người dùng mất niềm tin vào số liệu.
 *
 * ⚠ Nguồn sự thật duy nhất hiện nằm ở
 *   `src/shared/utils/date.ts` → `calculateSessionProgress()` (công thức
 *   theo **thời gian thực**: `(now - start) / (end - start) * 100`).
 *   Module này chỉ là **lớp adapter** gọi hàm đó + bổ sung fallback khi BE
 *   thiếu dữ liệu ngày.
 *
 * Thứ tự ưu tiên:
 *   1. `COMPLETED` / `HARVESTED` → 100 %; `CANCELLED` → 0 %.
 *   2. Công thức theo thời gian (khi biết ngày bắt đầu + ngày kết thúc).
 *   3. `progress_percent` do BE ghi nhận — dùng khi thiếu dữ liệu ngày.
 *   4. Bảng tiến độ mặc định theo trạng thái (fallback cuối cùng).
 */

/** Số ngày tối đa dùng để suy ra tổng ngày khi BE không trả. */
const DEFAULT_TOTAL_DAYS = 16

/** Ngày hiện tại theo lịch (không tính giờ) — tránh lệch do múi giờ. */
function toCalendarTimestamp(value: string | Date): number | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Hiệu số ngày lịch giữa 2 mốc thời gian. */
export function differenceInDays(later: string | Date, earlier: string | Date): number {
  const a = toCalendarTimestamp(later)
  const b = toCalendarTimestamp(earlier)
  if (a === null || b === null) return 0
  return Math.round((a - b) / (24 * 60 * 60 * 1000))
}

/** Kẹp về khoảng 0–100. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Format recorded progress without inventing a value for missing data. */
export function formatSessionProgress(value: number | string | null | undefined): string {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return '—'
  return `${clampPercent(Number(value))}%`
}

/** Thông tin cần thiết để tính tiến độ theo thời gian. */
export interface SessionProgressInput {
  /** Ngày bắt đầu canh tác (ISO). */
  startDate?: string | null
  /** Ngày kết thúc / dự kiến thu hoạch (ISO). */
  endDate?: string | null
  /** Thời lượng gói (ngày) nếu BE đã trả. */
  durationDays?: number | null
}

/**
 * Suy ra ngày kết thúc chu kỳ khi BE không trả `expected_harvest_date`.
 *
 * ⚠ Ưu tiên `duration_days` (15 / 20 ngày — đúng gói khách đã mua).
 */
export function resolveEndDate(input: SessionProgressInput): string | null {
  if (input.endDate) return input.endDate
  if (
    input.startDate &&
    typeof input.durationDays === 'number' &&
    input.durationDays > 0
  ) {
    return addDaysToIso(input.startDate, input.durationDays)
  }
  return null
}

/**
 * Tổng số ngày của chu kỳ (dùng làm mẫu số của công thức tiến độ).
 *
 * ⚠ Quy ước **bao gồm cả ngày đầu & ngày cuối** (inclusive):
 *   gói 15 ngày (03/11 → 18/11) ⇒ hiệu số = 15 ⇒ tổng = **16 ngày**.
 */
export function resolveTotalDays(input: SessionProgressInput): number {
  const endDate = resolveEndDate(input)
  if (input.startDate && endDate) {
    const diff = differenceInDays(endDate, input.startDate)
    if (diff > 0) return diff + 1
  }

  if (typeof input.durationDays === 'number' && input.durationDays > 0) {
    // Cùng quy ước inclusive: gói 15 ngày ⇒ 16 mốc ngày (ngày 1 … ngày 16).
    return Math.round(input.durationDays) + 1
  }

  return DEFAULT_TOTAL_DAYS
}

/**
 * Ngày canh tác hiện tại (1-based).
 *
 * Ngày 1 = ngày bắt đầu. Ngày 2 = sau 1 ngày ⇒ `2/16` ⇒ 13 %.
 */
export function resolveCurrentDay(input: SessionProgressInput): number {
  if (!input.startDate) return 1
  const elapsed = differenceInDays(new Date(), input.startDate)
  return Math.max(1, elapsed + 1)
}

/**
 * Tiến độ theo **thời gian** — công thức chuẩn dùng chung.
 *
 * ⚠ Ủy quyền cho `calculateSessionProgress` (shared/utils/date.ts) để mọi
 *   màn hình luôn cho cùng 1 kết quả.
 */
export function calculateTimeBasedProgress(
  input: SessionProgressInput,
  status?: string,
): number {
  return calculateSessionProgress(
    input.startDate,
    resolveEndDate(input),
    status,
  )
}

/**
 * Tiến độ cuối cùng của 1 phiên — dùng chung cho **mọi** màn hình.
 *
 * @param progressPercent Tiến độ do BE trả (`progress_percent`), nếu có.
 * @param status Trạng thái phiên — dùng cho fallback theo bảng mặc định.
 * @param defaultProgress Bảng tiến độ mặc định theo trạng thái.
 * @param input Thông tin ngày bắt đầu / ngày kết thúc / duration để tính
 *             theo thời gian.
 */
export function resolveSessionProgress(
  progressPercent: number | null | undefined,
  status: CultivationSessionStatus,
  defaultProgress: number,
  input: SessionProgressInput,
): number {
  // 1. Phiên đã đóng.
  if (status === 'COMPLETED') return 100
  if (status === 'CANCELLED') return 0

  // 2. Công thức chuẩn theo thời gian (khi đủ dữ liệu ngày).
  if (input.startDate && resolveEndDate(input)) {
    return calculateTimeBasedProgress(input, status)
  }

  // 3. BE đã ghi nhận tiến độ.
  if (typeof progressPercent === 'number' && Number.isFinite(progressPercent)) {
    return clampPercent(progressPercent)
  }

  // 4. Fallback cuối cùng theo trạng thái.
  return clampPercent(defaultProgress)
}
