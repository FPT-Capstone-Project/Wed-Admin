import type { HarvestStatus, TrayRental } from '../../../types/room.types'
import type { Rental } from '../../rentals/types/rental.types'

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
 * Chuyển `Rental` (BE flat DTO) → `TrayRental` (UI shape cho drawer / lifecycle).
 *
 * Quy tắc mapping:
 * - `start_date` → `startDate`
 * - `end_date` → `packageEndDate` và `expectedHarvestDate` (khi chưa có API riêng)
 * - `duration_days` → `weeks` (chia 7, làm tròn lên)
 * - Giá: BE chưa expose `basePrice` riêng → tạm để 0 (hiển thị "—")
 * - Status ACTIVE → GROWING; BE chưa có field harvest riêng
 */
export function rentalToTrayRental(rental: Rental): TrayRental {
  const startDate = rental.start_date ?? new Date().toISOString()
  // Nếu chưa có end_date, ước tính từ start + duration
  const packageEndDate =
    rental.end_date ??
    new Date(
      new Date(startDate).getTime() + rental.duration_days * 24 * 60 * 60 * 1000,
    ).toISOString()

  // expectedHarvestDate = packageEndDate (BE chưa tách riêng)
  const expectedHarvestDate = packageEndDate

  const weeks = Math.ceil(rental.duration_days / 7)

  const harvestStatus: HarvestStatus =
    rental.status === 'COMPLETED' ? 'AUTO_HARVESTED' : 'GROWING'

  return {
    tenantName: rental.customer_name,
    tenantPhone: rental.customer_phone ?? '—',
    tenantAddress: rental.customer_email, // BE chưa expose địa chỉ → dùng email tạm
    mushroomType: rental.mushroom_name,
    mushroomVariety: rental.package_name,
    weeks,
    startDate,
    expectedHarvestDate,
    packageEndDate,
    basePrice: 0,        // BE list endpoint chưa expose giá → 0
    dailyOverdueFee: 0,  // Tương tự
    harvestStatus,
    customerContactStatus: 'NOT_CONTACTED',
    careLogs: [],
  }
}
