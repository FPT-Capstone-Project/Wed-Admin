import { farmApi } from '../../farm/api/farm.api'
import { fetchAllAdminCultivationSessionsDetailed } from '../../sessions/api/admin-session.api'
import { toCultivationSession } from '../../sessions/api/admin-session-mapper'
import type { FarmSession, SpawnInspection } from '../../farm/types/farm.types'
import { buildCultivationBatches, type BuiltBatches } from '../utils/cultivation-batches.utils'
export { buildCultivationBatches } from '../utils/cultivation-batches.utils'
export type { BuildBatchesInput, BuiltBatches } from '../utils/cultivation-batches.utils'

/** Load every admin session page, with explicit tray assignments and Farm OP progress. */
export async function fetchCultivationBatches(): Promise<BuiltBatches> {
  // Match Sessions: the farm endpoint excludes unpaid orders and omits trays.
  const result = await fetchAllAdminCultivationSessionsDetailed({ pageSize: 100 })
  if (!result.complete) throw new Error('Danh sách phiên canh tác chưa được tải đủ')
  const sessions = result.items.map(toCultivationSession)
  const farmSessions: FarmSession[] = sessions

  // Chỉ lấy lịch sử kiểm tra phôi của các phiên đang có trong danh sách.
  const inspectionsBySessionId = new Map<number, SpawnInspection[]>()
  await Promise.all(
    sessions.map(async (session) => {
      const history = await farmApi.getSpawnInspections(session.session_id)
      if (history) inspectionsBySessionId.set(session.session_id, history.inspections ?? [])
    }),
  )

  return buildCultivationBatches({
    sessions,
    farmSessions,
    inspectionsBySessionId,
  })
}

