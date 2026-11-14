import { resolveSessionPhase } from './session-state.utils'
import { resolveSessionProgress } from './session-progress.utils'
import type { SessionGrowthStage } from '../types/admin-session.types'

export interface FarmGrowthRecord {
  stage?: string | null
  current_stage?: string | null
  growth_stage?: string | null
  progress_percent?: number | string | null
  checked_at?: string | null
  inspection_date?: string | null
  updated_at?: string | null
  created_at?: string | null
  description?: string | null
}
export interface FarmGrowthInput {
  /** Only records returned by cultivation_progress; observations cannot supply %. */
  progressHistory: readonly FarmGrowthRecord[]
  observations?: readonly FarmGrowthRecord[]
  sessionStatus?: string | null
}
export interface FarmGrowthSnapshot {
  stage: SessionGrowthStage | null
  /** null means no recorded percentage; zero is a valid recorded value. */
  progress: number | null
  /** Timestamp of the selected stage, independent of the percentage. */
  updatedAt: string | null
}

function stageOf(record: FarmGrowthRecord) {
  const rawStage = record.stage ?? record.growth_stage ?? record.current_stage
  return resolveSessionPhase(rawStage === 'RESTING' ? 'SPAWNING' : rawStage)
}

function newestFirst(records: readonly FarmGrowthRecord[]) {
  return records.map((record, index) => {
    const updatedAt = record.updated_at ?? record.checked_at ?? record.inspection_date ?? record.created_at ?? null
    const timestamp = updatedAt ? Date.parse(updatedAt) : NaN
    return { record, updatedAt, timestamp: Number.isFinite(timestamp) ? timestamp : 0, index }
  }).sort((a, b) => b.timestamp - a.timestamp || b.index - a.index)
}

export function resolveFarmGrowth(input: FarmGrowthInput): FarmGrowthSnapshot {
  const latestStage = newestFirst([
    ...input.progressHistory,
    ...(input.observations ?? []),
  ].filter(record => record.description !== 'Cultivation started after tray assignment' && stageOf(record)))[0]
  const phase = latestStage ? stageOf(latestStage.record)
    : resolveSessionPhase(input.sessionStatus)

  // Select independently: a newer photo/health inspection never resets progress.
  // Include actual zero values, even automatic initialization or pre-assignment stages.
  const latestProgress = newestFirst(input.progressHistory).find(({ record }) =>
    resolveSessionProgress(record.progress_percent) !== null,
  )
  return {
    stage: phase === 'HARVESTING' ? 'MATURATION' : phase,
    progress: latestProgress ? resolveSessionProgress(latestProgress.record.progress_percent) : null,
    updatedAt: latestStage?.updatedAt ?? null,
  }
}
