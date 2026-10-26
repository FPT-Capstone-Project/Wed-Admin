/**
 * Tóm tắt vụ thuê theo khay — dùng để hiển thị "khách thuê + ngày thu hoạch
 * dự kiến" ngay trên ô khay (thay cho chữ "Sẵn sàng vào vụ" lặp lại).
 *
 * ⚠ Không thêm endpoint mới: dùng đúng `GET /api/rentals/admin` đã có sẵn
 * (`useRentals`). Endpoint này yêu cầu role Admin (1) hoặc Farm Operator (2)
 * → hook tự tắt khi người dùng không có quyền `rental.manage`, tránh gọi
 * API và luôn nhận 403.
 *
 * Lý do có `harvestDue`: BE chỉ có 3 trạng thái khay thật
 * (`AVAILABLE` / `OCCUPIED` / `MAINTENANCE`) → trạng thái "chờ thu hoạch" không
 * bao giờ được BE trả về. Ta suy ra ở tầng hiển thị: một vụ thuê đang chạy mà
 * đã tới `end_date` (mốc thu hoạch dự kiến) → khay cần người dùng xử lý.
 * Đây là **suy luận hiển thị**, không thay đổi logic/API của BE.
 */
import { useMemo } from 'react'
import { useRentals } from '../../rentals/hooks/useRentals'
import { RENTAL_MANAGE } from '../../auth/permissions'
import { useHasPermission } from '../../auth/hooks/usePermission'
import type { Rental } from '../../rentals/types/rental.types'

/** Thông tin rút gọn của một vụ thuê, gắn theo `tray_id`. */
export interface TrayRentalSummary {
  /** Tên khách thuê. */
  customerName: string
  /** Ngày bắt đầu canh tác (ISO) — mốc để tính tiến độ sinh trưởng. */
  startDate: string | null
  /** Ngày thu hoạch dự kiến (ISO) — BE dùng `end_date` làm mốc kết thúc gói. */
  expectedHarvestDate: string | null
  /** Loại nấm đang trồng. */
  mushroomName: string
  /** Trạng thái vụ thuê. */
  status: Rental['status']
  /** Đã tới mốc thu hoạch dự kiến → khay cần người dùng xử lý. */
  harvestDue: boolean
}

/** Map `tray_id` → tóm tắt vụ thuê đang chạy (ACTIVE / PREPARING). */
export type TrayRentalSummaryMap = Map<number, TrayRentalSummary>

const ACTIVE_STATUSES: ReadonlySet<Rental['status']> = new Set([
  'ACTIVE',
  'PREPARING',
])

/** Số ngày từ hôm nay tới `end_date` (≤ 0 = đã quá hạn / tới hạn). */
function daysUntil(value: string | null): number | null {
  if (!value) return null
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return null

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  const diff =
    startOfDay(target) - startOfDay(new Date())
  return Math.round(diff / 86_400_000)
}

export function useTrayRentalSummaries(): TrayRentalSummaryMap {
  const canViewRentals = useHasPermission(RENTAL_MANAGE)

  const { data } = useRentals(
    { page: 1, pageSize: 100 },
    { enabled: canViewRentals, staleTime: 60_000 },
  )

  return useMemo(() => {
    const map: TrayRentalSummaryMap = new Map()
    const items = data?.items ?? []

    for (const rental of items) {
      if (rental.tray_id == null) continue
      if (!ACTIVE_STATUSES.has(rental.status)) continue
      // Một khay chỉ có 1 vụ thuê đang chạy — giữ vụ mới nhất.
      if (map.has(rental.tray_id)) continue

      const remaining = daysUntil(rental.end_date)

      map.set(rental.tray_id, {
        customerName: rental.customer_name,
        startDate: rental.start_date,
        expectedHarvestDate: rental.end_date,
        mushroomName: rental.mushroom_name,
        status: rental.status,
        harvestDue: remaining != null && remaining <= 0,
      })
    }

    return map
  }, [data?.items])
}
