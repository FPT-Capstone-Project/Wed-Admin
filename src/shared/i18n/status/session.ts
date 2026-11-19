/** Shared presentation of lifecycle and biological stages; API codes remain unchanged. */
import type { StatusDictionary, StatusPresentation } from './types'

export type SessionStatusKey = 'PENDING' | 'RECEIVED' | 'INCUBATING' | 'SPAWN_RESTING' | 'MYCELIAL_DEVELOPMENT' | 'READY_FOR_CULTIVATION' | 'CULTIVATING' | 'HARVEST_READY' | 'HARVESTING' | 'COMPLETED' | 'CANCELLED'
export type SessionStatusGroupKey = 'CULTIVATING' | 'PENDING' | 'FINISHED'
export type SessionGrowthStageKey = 'PREPARATION' | 'FRUITING_INITIATION' | 'PINNING' | 'YOUNG_FRUITING' | 'MATURATION'
export type MushroomGrowthPhaseKey = SessionStatusKey | SessionGrowthStageKey | 'SPAWNING' | 'RUNNING' | 'FRUITING' | 'RECEIVED' | 'INCUBATING'

/** Canonical labels shared by all feature dictionaries. */
export const SESSION_WORKFLOW_LABELS = {
  PENDING: 'Chưa ủ tơ', RECEIVED: 'Phôi đã được tiếp nhận',
  SPAWN_RESTING: 'Đang ủ tơ', RESTING: 'Đang ủ tơ',
  MYCELIAL_DEVELOPMENT: 'Phát triển tơ', DEVELOPING: 'Phát triển tơ',
  INCUBATING: 'Ủ tơ', READY_FOR_CULTIVATION: 'Chờ gán khay',
  CULTIVATING: 'Đang trồng', HARVEST_READY: 'Sẵn sàng thu hoạch',
  HARVESTING: 'Đang thu hoạch', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
} as const
export const GROWTH_STAGE_LABELS = {
  FRUITING_INITIATION: 'Kích thích ra quả thể', PINNING: 'Hình thành mầm nấm',
  YOUNG_FRUITING: 'Quả thể non', MATURATION: 'Trưởng thành',
} as const
export const MUSHROOM_GROWTH_PHASE_DICTIONARY: Record<MushroomGrowthPhaseKey, StatusPresentation> = {
  RECEIVED: { tone: 'info', label: SESSION_WORKFLOW_LABELS.RECEIVED },
  INCUBATING: { tone: 'info', label: SESSION_WORKFLOW_LABELS.INCUBATING },
  PENDING: { tone: 'warning', label: SESSION_WORKFLOW_LABELS.PENDING },
  SPAWN_RESTING: { tone: 'info', label: SESSION_WORKFLOW_LABELS.SPAWN_RESTING },
  MYCELIAL_DEVELOPMENT: { tone: 'info', label: SESSION_WORKFLOW_LABELS.MYCELIAL_DEVELOPMENT },
  READY_FOR_CULTIVATION: { tone: 'info', label: SESSION_WORKFLOW_LABELS.READY_FOR_CULTIVATION },
  CULTIVATING: { tone: 'ok', label: SESSION_WORKFLOW_LABELS.CULTIVATING },
  HARVEST_READY: { tone: 'warning', label: SESSION_WORKFLOW_LABELS.HARVEST_READY },
  HARVESTING: { tone: 'warning', label: SESSION_WORKFLOW_LABELS.HARVESTING },
  COMPLETED: { tone: 'success', label: SESSION_WORKFLOW_LABELS.COMPLETED },
  CANCELLED: { tone: 'danger', label: SESSION_WORKFLOW_LABELS.CANCELLED },
  PREPARATION: { tone: 'info', label: SESSION_WORKFLOW_LABELS.PENDING },
  SPAWNING: { tone: 'info', label: SESSION_WORKFLOW_LABELS.SPAWN_RESTING },
  RUNNING: { tone: 'info', label: SESSION_WORKFLOW_LABELS.MYCELIAL_DEVELOPMENT },
  FRUITING: { tone: 'ok', label: SESSION_WORKFLOW_LABELS.CULTIVATING },
  FRUITING_INITIATION: { tone: 'info', label: GROWTH_STAGE_LABELS.FRUITING_INITIATION },
  PINNING: { tone: 'info', label: GROWTH_STAGE_LABELS.PINNING },
  YOUNG_FRUITING: { tone: 'ok', label: GROWTH_STAGE_LABELS.YOUNG_FRUITING },
  MATURATION: { tone: 'ok', label: GROWTH_STAGE_LABELS.MATURATION },
}
const normalize = (value: string | null | undefined) => value?.trim().toUpperCase() ?? ''
export function resolveGrowthPhaseFromStatus(status: string | null | undefined): MushroomGrowthPhaseKey | null {
  const key = normalize(status)
  const aliases: Record<string, MushroomGrowthPhaseKey> = { RESTING: 'SPAWN_RESTING', DEVELOPING: 'MYCELIAL_DEVELOPMENT' }
  if (aliases[key]) return aliases[key]
  return key in SESSION_WORKFLOW_LABELS && key in MUSHROOM_GROWTH_PHASE_DICTIONARY ? key as MushroomGrowthPhaseKey : null
}
export function resolveGrowthPhaseFromStage(stage: string | null | undefined): MushroomGrowthPhaseKey | null {
  const key = normalize(stage)
  if (key in MUSHROOM_GROWTH_PHASE_DICTIONARY) return key as MushroomGrowthPhaseKey
  return resolveGrowthPhaseFromStatus(key)
}
export function resolveGrowthPhase(stage: string | null | undefined, status: string | null | undefined, harvestReady = false): MushroomGrowthPhaseKey | null {
  const key = normalize(status)
  if (key === 'COMPLETED' || key === 'CANCELLED') return key
  if (key === 'HARVESTING') return 'HARVESTING'
  if (key === 'HARVEST_READY' || harvestReady) return 'HARVEST_READY'
  if (['PENDING', 'RECEIVED', 'INCUBATING', 'SPAWN_RESTING', 'MYCELIAL_DEVELOPMENT', 'READY_FOR_CULTIVATION'].includes(key)) return key as SessionStatusKey
  return resolveGrowthPhaseFromStage(stage) ?? resolveGrowthPhaseFromStatus(status)
}

export interface SessionStatusPresentation extends StatusPresentation { readonly shortLabel: string }
export const SESSION_STATUS_DICTIONARY = Object.fromEntries(
  Object.entries(SESSION_WORKFLOW_LABELS).map(([key, label]) => [key, {
    ...(MUSHROOM_GROWTH_PHASE_DICTIONARY[key as MushroomGrowthPhaseKey] ?? { tone: 'info' as const }), label, shortLabel: label,
  }]),
) as Record<SessionStatusKey | keyof typeof SESSION_WORKFLOW_LABELS, SessionStatusPresentation>
export const SESSION_GROWTH_STAGE_DICTIONARY = Object.fromEntries(
  (['PREPARATION', ...Object.keys(GROWTH_STAGE_LABELS)] as SessionGrowthStageKey[]).map(key => [key, {
    ...MUSHROOM_GROWTH_PHASE_DICTIONARY[key], shortLabel: MUSHROOM_GROWTH_PHASE_DICTIONARY[key].label,
  }]),
) as Record<SessionGrowthStageKey, SessionStatusPresentation>
export const SESSION_GROUP_DICTIONARY: Record<SessionStatusGroupKey, StatusPresentation> = {
  CULTIVATING: { tone: 'ok', label: SESSION_WORKFLOW_LABELS.CULTIVATING },
  PENDING: { tone: 'warning', label: SESSION_WORKFLOW_LABELS.PENDING },
  FINISHED: { tone: 'success', label: SESSION_WORKFLOW_LABELS.COMPLETED },
}
export function resolveSessionGroup(status: SessionStatusKey): SessionStatusGroupKey {
  return status === 'COMPLETED' || status === 'CANCELLED' ? 'FINISHED' : status === 'PENDING' ? 'PENDING' : 'CULTIVATING'
}
export type SessionHarvestStatusKey = 'NOT_READY' | 'HARVEST_READY'
export type SpawnConditionKey = 'NORMAL' | 'WARNING' | 'ABNORMAL'
export type SessionTrayAssignmentStatusKey = 'ACTIVE' | 'RELEASED'
export const SESSION_HARVEST_STATUS_DICTIONARY: Record<SessionHarvestStatusKey, StatusPresentation> = {
  NOT_READY: { tone: 'muted', label: 'Chưa sẵn sàng' },
  HARVEST_READY: { tone: 'warning', label: SESSION_WORKFLOW_LABELS.HARVEST_READY },
}
export const SESSION_HARVESTED_PRESENTATION: StatusPresentation = { tone: 'ok', label: 'Đã thu hoạch' }
export function resolveSessionHarvestStatus(status: string | null | undefined, harvestStatus: string | null | undefined): StatusPresentation | null {
  if (normalize(status) === 'COMPLETED') return SESSION_HARVESTED_PRESENTATION
  return SESSION_HARVEST_STATUS_DICTIONARY[normalize(harvestStatus) as SessionHarvestStatusKey] ?? null
}
export const SPAWN_CONDITION_DICTIONARY: StatusDictionary = {
  NORMAL: { tone: 'ok', label: 'Bình thường' }, WARNING: { tone: 'warning', label: 'Cảnh báo' }, ABNORMAL: { tone: 'danger', label: 'Bất thường' },
}
export const SESSION_TRAY_ASSIGNMENT_DICTIONARY: Record<SessionTrayAssignmentStatusKey, StatusPresentation> = {
  ACTIVE: { tone: 'ok', label: 'Đang sử dụng' }, RELEASED: { tone: 'muted', label: 'Đã thu hồi' },
}
export const SESSION_PROGRESS_STAGE_DICTIONARY: StatusDictionary = {
  ...SESSION_STATUS_DICTIONARY, ...SESSION_GROWTH_STAGE_DICTIONARY,
  SPAWN_PENDING: { tone: 'warning', label: SESSION_WORKFLOW_LABELS.PENDING },
  SPAWNING: MUSHROOM_GROWTH_PHASE_DICTIONARY.SPAWNING,
  RUNNING: MUSHROOM_GROWTH_PHASE_DICTIONARY.RUNNING,
  FRUITING: MUSHROOM_GROWTH_PHASE_DICTIONARY.FRUITING,
  UNKNOWN: { tone: 'muted', label: 'Chưa xác định' },
}
