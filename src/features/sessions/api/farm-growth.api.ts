import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { farmApi } from '../../farm/api/farm.api'
import { fetchSessionDailyInspections } from './session-inspection.api'
import { resolveFarmGrowth, type FarmGrowthRecord } from '../utils/farm-growth.utils'

export async function fetchFarmGrowth(sessionId: number) {
  const [spawn, daily, response] = await Promise.all([
    farmApi.getSpawnInspections(sessionId),
    fetchSessionDailyInspections(sessionId),
    apiClient.get<unknown>(`/api/cultivation-sessions/admin/${sessionId}/progress`),
  ])
  if (daily.pagination.total > daily.inspections.length) {
    throw new Error('Incomplete Farm OP inspection history')
  }
  const progress = ensureObject<Record<string, unknown>>(response.data)
  return resolveFarmGrowth({
    progressHistory: ensureArray<FarmGrowthRecord>(progress?.progress_history),
    observations: [...(spawn?.inspections ?? []), ...daily.inspections],
    sessionStatus: typeof progress?.status === 'string' ? progress.status : null,
  })
}

/** Bound concurrent history requests; a failed history must not appear as no updates. */
export async function withFarmGrowth<T extends { session_id: number }>(sessions: T[]) {
  const result = []
  for (let offset = 0; offset < sessions.length; offset += 4) {
    result.push(...await Promise.all(sessions.slice(offset, offset + 4).map(async session => {
      const growth = await fetchFarmGrowth(session.session_id)
      return { ...session, current_stage: growth.stage, growth_status: growth.stage,
        progress_percent: growth.progress, farm_growth: growth }
    })))
  }
  return result
}
