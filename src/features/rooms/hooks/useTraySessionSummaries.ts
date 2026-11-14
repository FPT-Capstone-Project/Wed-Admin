/** Tray summaries use the same complete admin session list and Farm OP mapper as Sessions. */
import { useMemo } from 'react'
import { useAllAdminCultivationSessions } from '../../sessions/hooks/useAdminCultivationSessions'
import { toCultivationSession } from '../../sessions/api/admin-session-mapper'
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
  /** Recorded Farm OP percentage; null means unavailable. */
  progressPercent: number | null
  /** Rental start date, independent of biological progress. */
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

  const { data } = useAllAdminCultivationSessions(
    undefined,
    { enabled: canViewSessions, staleTime: 60_000 },
  )

  return useMemo(() => {
    const map: TraySessionSummaryMap = new Map()
    const items: CultivationSession[] = (data ?? []).map(toCultivationSession).sort((a, b) => b.session_id - a.session_id)

    for (const session of items) {
      if (!ACTIVE_SESSION_STATUSES.has(session.status)) continue

      for (const tray of session.trays) {
        if (tray.tray_id == null || tray.status === 'RELEASED') continue
        // Một khay chỉ có 1 phiên đang chạy — giữ phiên đầu tiên.
        if (map.has(tray.tray_id)) continue

        const remaining = daysUntil(
          session.expected_harvest_date ?? session.end_date ?? null,
        )

        map.set(tray.tray_id, {
          sessionId: session.session_id,
          progressPercent: session.progress_percent ?? null,
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
  }, [data])
}
