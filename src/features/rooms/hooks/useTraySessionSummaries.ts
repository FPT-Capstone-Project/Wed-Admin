/**
 * Tóm tắt phiên canh tác theo khay — dùng để hiển thị "khách + phiên đang
 * chạy" ngay trên ô khay (thay cho chữ "Sẵn sàng vào vụ" lặp lại).
 *
 * ⚠ Nguồn dữ liệu: `GET /api/farm/sessions` (đã có sẵn, không
 *   thêm endpoint mới). Endpoint này yêu cầu role Admin (1) hoặc Farm
 *   Operator (2) → hook tự tắt khi người dùng không có quyền, tránh gọi
 *   API và luôn nhận 403.
 *
 * ⚠ BE chỉ có 3 trạng thái khay thật (`AVAILABLE` / `OCCUPIED` /
 *   `MAINTENANCE`) → trạng thái "chờ thu hoạch" không bao giờ được BE trả về.
 *   Ta suy ra ở tầng hiển thị: một phiên đang chạy mà đã tới mốc thu hoạch
 *   → khay cần người dùng xử lý. Đây là **suy luận hiển thị**, không thay
 *   đổi logic/API của BE.
 *
 * ⚠ Thay thế `useTrayRentalSummaries` (đã gỡ cùng module `features/rentals`).
 */
import { useMemo } from 'react'
import { useSessions } from '../../sessions/hooks/useSessions'
import { SESSION_MANAGE } from '../../auth/permissions'
import { useHasPermission } from '../../auth/hooks/usePermission'
import {
  ACTIVE_SESSION_STATUSES,
  type CultivationSession,
  type CultivationSessionStatus,
} from '../../sessions/types/session.types'

/** Thông tin rút gọn của một phiên canh tác, gắn theo `tray_id`. */
export interface TraySessionSummary {
  /** Mã phiên canh tác. */
  sessionId: number
  /** Tên khách thuê. */
  customerName: string
  /** Ngày bắt đầu canh tác (ISO) — mốc để tính tiến độ sinh trưởng. */
  startDate: string | null
  /** Ngày thu hoạch dự kiến (ISO). */
  expectedHarvestDate: string | null
  /** Loại nấm đang trồng. */
  mushroomName: string
  /** Trạng thái phiên. */
  status: CultivationSessionStatus
  /** Đã tới mốc thu hoạch dự kiến → khay cần người dùng xử lý. */
  harvestDue: boolean
}

/** Map `tray_id` → tóm tắt phiên canh tác đang chạy. */
export type TraySessionSummaryMap = Map<number, TraySessionSummary>

/** Số ngày từ hôm nay tới `end_date` (≤ 0 = đã quá hạn / tới hạn). */
function daysUntil(value: string | null): number | null {
  if (!value) return null
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return null

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  const diff = startOfDay(target) - startOfDay(new Date())
  return Math.round(diff / 86_400_000)
}

export function useTraySessionSummaries(): TraySessionSummaryMap {
  const canViewSessions = useHasPermission(SESSION_MANAGE)

  const { data } = useSessions(
    { includeTrays: true },
    { enabled: canViewSessions, staleTime: 60_000 },
  )

  return useMemo(() => {
    const map: TraySessionSummaryMap = new Map()
    const items: CultivationSession[] = data?.items ?? []

    for (const session of items) {
      if (!ACTIVE_SESSION_STATUSES.has(session.status)) continue

      for (const tray of session.trays) {
        if (tray.tray_id == null) continue
        // Một khay chỉ có 1 phiên đang chạy — giữ phiên đầu tiên.
        if (map.has(tray.tray_id)) continue

        const remaining = daysUntil(
          session.expected_harvest_date ?? session.end_date ?? null,
        )

        map.set(tray.tray_id, {
          sessionId: session.session_id,
          customerName: session.customer_name ?? '—',
          startDate: session.start_date ?? null,
          expectedHarvestDate:
            session.expected_harvest_date ?? session.end_date ?? null,
          mushroomName: session.mushroom_name ?? '—',
          status: session.status,
          harvestDue: remaining != null && remaining <= 0,
        })
      }
    }

    return map
  }, [data?.items])
}
