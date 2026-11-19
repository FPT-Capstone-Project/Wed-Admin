import type { CultivationSessionStatus } from '../types/session.types'
import type { SessionGrowthStage } from '../types/admin-session.types'
import { resolveGrowthPhase } from '../../../shared/i18n/status/session'

const STAGES: Record<string, SessionGrowthStage> = {
  SPAWNING: 'SPAWNING', SPAWN_RESTING: 'SPAWNING', PREPARATION: 'SPAWNING',
  RUNNING: 'RUNNING', MYCELIAL_DEVELOPMENT: 'RUNNING',
  READY_FOR_CULTIVATION: 'RUNNING', CULTIVATING: 'RUNNING',
  FRUITING: 'FRUITING', FRUITING_INITIATION: 'FRUITING_INITIATION',
  PINNING: 'PINNING', YOUNG_FRUITING: 'YOUNG_FRUITING',
  MATURATION: 'MATURATION', HARVEST_READY: 'MATURATION', HARVESTING: 'MATURATION',
}
const keyOf = (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase() : ''

export function normalizeSessionStatus(value: unknown): CultivationSessionStatus {
  const key = keyOf(value)
  if (key === 'RECEIVED' || key === 'INCUBATING') return key
  if (['PENDING', 'SPAWN_RESTING', 'MYCELIAL_DEVELOPMENT', 'READY_FOR_CULTIVATION', 'CULTIVATING', 'HARVEST_READY', 'HARVESTING', 'COMPLETED', 'CANCELLED'].includes(key)) return key as CultivationSessionStatus
  if (key === 'RESTING') return 'SPAWN_RESTING'
  if (key === 'DEVELOPING') return 'MYCELIAL_DEVELOPMENT'
  if (key === 'COMPLETED' || key === 'CANCELLED' || key === 'PENDING') return key
  if (key === 'ACTIVE' || key === 'IN_PROGRESS' || STAGES[key]) return 'CULTIVATING'
  return 'PENDING'
}

/** Prefer the latest dated session/tray stage; retain session priority on ties. */
export function normalizeSessionStage(raw: Record<string, unknown>): SessionGrowthStage | null {
  const trays = raw.trays ?? raw.session_trays
  const sources = [raw, ...(Array.isArray(trays) ? trays : [])]
  const candidates = sources.flatMap((source: unknown, index) => {
    if (!source || typeof source !== 'object') return []
    const obj = source as Record<string, unknown>
    const stage = [obj.current_stage, obj.currentStage, obj.stage, obj.growth_stage,
      obj.growthStage, obj.growth_status, obj.growthStatus].map(keyOf).map(key => STAGES[key]).find(Boolean)
    if (!stage) return []
    const timestamp = [obj.progress_updated_at, obj.progressUpdatedAt, obj.stage_updated_at,
      obj.stageUpdatedAt, obj.updated_at, obj.updatedAt].map(value =>
      typeof value === 'string' ? Date.parse(value) : NaN).find(Number.isFinite) ?? 0
    return [{ stage, timestamp, index }]
  })
  candidates.sort((a, b) => b.timestamp - a.timestamp || a.index - b.index)
  return candidates[0]?.stage ?? null
}

export function summarizeSessions(items: readonly { status: CultivationSessionStatus }[]) {
  return items.reduce((summary, { status }) => {
    const key = normalizeSessionStatus(status)
    if (key === 'PENDING') summary.waiting++
    else if (key === 'CANCELLED') summary.cancelled++
    else if (key === 'COMPLETED') summary.completed++
    else summary.active++
    summary.total++
    return summary
  }, { total: 0, active: 0, waiting: 0, cancelled: 0, completed: 0 })
}

export function resolveSessionPhase(stage: string | null | undefined, status?: string, harvestReady = false) {
  return resolveGrowthPhase(stage, status, harvestReady)
}
