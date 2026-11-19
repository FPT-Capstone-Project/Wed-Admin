import type { HarvestStatus, TrayRental } from '../../../types/room.types'
import type { CultivationSession } from '../../sessions/types/session.types'
import { resolveSessionProgress } from '../../sessions/utils/session-progress.utils'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export const OVERDUE_HARVEST_GUIDANCE = 'Đã quá hạn thu hoạch dự kiến. Nếu không liên hệ được khách hàng, Farm OP chủ động thu hoạch theo quy định và giải phóng khay.'

export interface RentalLifecycleMetrics {
  daysElapsed: number
  growthDay: number
  expectedHarvestDay: number
  daysRemainingToHarvest: number
  isHarvestReady: boolean
  overdueDays: number
  packageOverdueDays: number
  packageDurationDays: number
  progressPercent: number | null
  harvestMarkerPercent: number
  effectiveHarvestStatus: HarvestStatus
}

function parseCalendarDate(input: string | Date) {
  if (input instanceof Date) {
    return new Date(input.getTime())
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (dateOnlyMatch) {
    return new Date(`${input}T00:00:00+07:00`)
  }

  return new Date(input)
}

function getCalendarTimestamp(input: string | Date) {
  const date = parseCalendarDate(input)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Ngày không hợp lệ: ${String(input)}`)
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date)
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value)
  return Date.UTC(part('year'), part('month') - 1, part('day'))
}

export function differenceInCalendarDays(
  laterDate: string | Date,
  earlierDate: string | Date,
) {
  return Math.round(
    (getCalendarTimestamp(laterDate) - getCalendarTimestamp(earlierDate)) /
      MILLISECONDS_PER_DAY,
  )
}

export function calculateRentalLifecycle(
  rental: TrayRental,
  currentDate: Date = new Date(),
): RentalLifecycleMetrics {
  /**
   * Tổng ngày của chu kỳ thuê.
   *
   * Ưu tiên `durationDays` (15 / 20 ngày — đúng gói người dùng đã mua),
   * fallback hiệu số ngày giữa ngày kết thúc và ngày bắt đầu.
   */
  const packageDurationDays = Math.max(
    1,
    rental.durationDays ||
      differenceInCalendarDays(rental.packageEndDate, rental.startDate),
  )
  const daysElapsed = Math.max(
    0,
    differenceInCalendarDays(currentDate, rental.startDate),
  )
  const growthDay = daysElapsed + 1
  const expectedHarvestDay = Math.max(
    1,
    differenceInCalendarDays(
      rental.expectedHarvestDate,
      rental.startDate,
    ),
  )
  const daysRemainingToHarvest = Math.max(
    0,
    differenceInCalendarDays(rental.expectedHarvestDate, currentDate),
  )
  const packageOverdueDays = Math.max(
    0,
    differenceInCalendarDays(currentDate, rental.packageEndDate),
  )
  const overdueDays = Math.max(0, differenceInCalendarDays(currentDate, rental.expectedHarvestDate))
  const isAlreadyHarvested = rental.harvestStatus === 'AUTO_HARVESTED'
  const isHarvestReady =
    !isAlreadyHarvested &&
    differenceInCalendarDays(currentDate, rental.expectedHarvestDate) >= 0

  let effectiveHarvestStatus: HarvestStatus = 'GROWING'
  if (isAlreadyHarvested) {
    effectiveHarvestStatus = 'AUTO_HARVESTED'
  } else if (overdueDays > 0) {
    effectiveHarvestStatus = 'OVERDUE'
  } else if (isHarvestReady) {
    effectiveHarvestStatus = 'READY_TO_HARVEST'
  }

  return {
    daysElapsed,
    growthDay,
    expectedHarvestDay,
    daysRemainingToHarvest,
    isHarvestReady,
    overdueDays,
    packageOverdueDays,
    packageDurationDays,
    /**
     * ⚠ Tiến độ lấy **trực tiếp** từ Phiên canh tác (`progress_percent`) —
     *   cùng nguồn với bảng "Phiên canh tác" và Drawer "Chi tiết phiên" ⇒
     *   cùng 1 phiên, cùng 1 con số.
     *
     *   KHÔNG tính nhẩm theo `startDate` / `expectedHarvestDate`.
     */
    progressPercent: resolveSessionProgress(
      rental.progressPercent,
      isAlreadyHarvested ? 'COMPLETED' : rental.harvestStatus,
    ),
    harvestMarkerPercent: 100,
    effectiveHarvestStatus,
  }
}

export function formatRentalDate(value: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parseCalendarDate(value))
}

export function rentalDayLabel(lifecycle: RentalLifecycleMetrics): string {
  return lifecycle.packageOverdueDays > 0
    ? `Đã quá hạn ${lifecycle.packageOverdueDays} ngày`
    : `Ngày ${Math.min(lifecycle.growthDay, lifecycle.packageDurationDays)}/${lifecycle.packageDurationDays}`
}

export { formatVND as formatVnd } from '../../../shared/utils/currency'

/**
 * Chuyển `CultivationSession` (BE flat DTO từ
 * `GET /api/farm/sessions`) → `TrayRental` (UI shape cho
 * drawer / lifecycle).
 *
 * Quy tắc mapping:
 * - `start_date` → `startDate`
 * - `expected_harvest_date` (fallback `end_date`) → `expectedHarvestDate` và
 *   `packageEndDate`
 * - `package_name` → `mushroomVariety` (tên gói), `mushroom_name` →
 *   `mushroomType`
 * - Số tuần ước tính từ khoảng ngày bắt đầu → thu hoạch (BE chưa trả
 *   `duration_days` cho phiên)
 * - Giá: BE chưa expose `basePrice` → để 0 (hiển thị "—")
 *
 * ⚠ Giai đoạn 1: thay thế `rentalToTrayRental()` đọc từ
 *   `/api/rentals/admin` (module `features/rentals` đã bị gỡ).
 */
export function sessionToTrayRental(session: CultivationSession): TrayRental {
  const startDate = session.start_date ?? new Date().toISOString()
  const harvestDate =
    session.expected_harvest_date ?? session.end_date ?? startDate
  const packageEndDate = harvestDate

  /**
   * Thời lượng gói thuê (theo ngày).
   *
   * Thứ tự ưu tiên:
   *   1. `duration_days` từ gói thuê của phiên (15 hoặc 20 ngày) — chính
   *      xác nhất, vì đây là giá trị người dùng đã mua.
   *   2. Hiệu số ngày giữa `packageEndDate` và `startDate` (18/11 − 3/11 = 15).
   *
   * ⚠ KHÔNG dùng `Math.ceil(days / 7)` để quy ra số tuần — làm tròn vậy khiến
   *   gói 15 ngày bị hiển thị thành "3 Tuần (21 ngày)".
   */
  const durationDays = Math.max(
    1,
    session.duration_days ??
      differenceInCalendarDays(packageEndDate, startDate),
  )

  const harvestStatus: HarvestStatus =
    session.status === 'COMPLETED'
      ? 'AUTO_HARVESTED'
      : session.status === 'HARVESTING'
        ? 'READY_TO_HARVEST'
        : 'GROWING'

  return {
    tenantName: session.customer_name ?? '—',
    tenantPhone: session.customer_phone ?? '—',
    tenantAddress: session.customer_email ?? '—',
    mushroomType: session.mushroom_name ?? '—',
    mushroomVariety: session.package_name ?? '—',
    durationDays,
    packageName: session.package_name ?? '—',
    startDate,
    expectedHarvestDate: harvestDate,
    packageEndDate,
    basePrice: 0, // BE list endpoint chưa expose giá → 0
    harvestStatus,
    customerContactStatus: 'NOT_CONTACTED',
    careLogs: [],
    /**
     * Tiến độ do Farm OP cập nhật trên Phiên canh tác — nguồn duy nhất.
     */
    progressPercent: session.progress_percent ?? null,
  }
}
