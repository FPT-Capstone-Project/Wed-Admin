import type { HarvestStatus, TrayRental } from '../../../types/room.types'
import type { CultivationSession } from '../../sessions/types/session.types'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export const DEFAULT_DAILY_OVERDUE_FEE = 25_000

export interface RentalLifecycleMetrics {
  daysElapsed: number
  growthDay: number
  expectedHarvestDay: number
  daysRemainingToHarvest: number
  isHarvestReady: boolean
  overdueDays: number
  overdueFee: number
  totalAmount: number
  packageDurationDays: number
  progressPercent: number
  harvestMarkerPercent: number
  effectiveHarvestStatus: HarvestStatus
}

function parseCalendarDate(input: string | Date) {
  if (input instanceof Date) {
    return new Date(input.getTime())
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day), 12)
  }

  return new Date(input)
}

function getCalendarTimestamp(input: string | Date) {
  const date = parseCalendarDate(input)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Ngày không hợp lệ: ${String(input)}`)
  }

  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
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

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function calculateRentalLifecycle(
  rental: TrayRental,
  currentDate: Date = new Date(),
): RentalLifecycleMetrics {
  const packageDurationDays = Math.max(
    1,
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
    ) + 1,
  )
  const daysRemainingToHarvest = Math.max(
    0,
    differenceInCalendarDays(rental.expectedHarvestDate, currentDate),
  )
  const overdueDays = Math.max(
    0,
    differenceInCalendarDays(currentDate, rental.packageEndDate),
  )
  const isAlreadyHarvested = rental.harvestStatus === 'AUTO_HARVESTED'
  const isHarvestReady =
    !isAlreadyHarvested &&
    differenceInCalendarDays(currentDate, rental.expectedHarvestDate) >= 0
  const overdueFee = overdueDays * rental.dailyOverdueFee

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
    overdueFee,
    totalAmount: rental.basePrice + overdueFee,
    packageDurationDays,
    progressPercent: clampPercentage(
      (growthDay / expectedHarvestDay) * 100,
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
  }).format(parseCalendarDate(value))
}

export function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

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

  const durationDays = Math.max(
    1,
    differenceInCalendarDays(packageEndDate, startDate),
  )
  const weeks = Math.max(1, Math.ceil(durationDays / 7))

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
    weeks,
    startDate,
    expectedHarvestDate: harvestDate,
    packageEndDate,
    basePrice: 0, // BE list endpoint chưa expose giá → 0
    dailyOverdueFee: 0, // Tương tự
    harvestStatus,
    customerContactStatus: 'NOT_CONTACTED',
    careLogs: [],
  }
}
