import type { EnvironmentHistoryData } from '../../../types/environment-history'

export const ENVIRONMENT_HISTORY_KEY = ['dashboard', 'environment-history'] as const
export const ENVIRONMENT_REFRESH_MS = 5 * 60 * 1000
export const ENVIRONMENT_SNAPSHOT_KEY = 'mcms:env-history:latest:v1'
const MAX_AGE_MS = 6 * 60 * 60 * 1000
let sessionRevision = 0
export const environmentSessionRevision = () => sessionRevision

interface Snapshot { savedAt: number; data: EnvironmentHistoryData }
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const nullableNumber = (value: unknown) => value === null || finite(value)
export function isEnvironmentHistory(value: unknown): value is EnvironmentHistoryData {
  if (!record(value) || !finite(value.from) || !finite(value.to) || value.to <= value.from || !finite(value.bucketMs) || value.bucketMs <= 0 || !finite(value.refreshAfterMs) || !Array.isArray(value.floors)) return false
  return value.floors.every(floor => {
    if (!record(floor)) return false
    const thresholds = floor.thresholds
    return finite(floor.floorId) && typeof floor.floorName === 'string' && Array.isArray(floor.points)
      && (thresholds === null || record(thresholds) && ['temperature_min', 'temperature_max', 'humidity_min', 'humidity_max'].every(key => nullableNumber(thresholds[key])))
      && floor.points.every(point => record(point) && finite(point.timestamp) && nullableNumber(point.temperature) && nullableNumber(point.humidity))
  })
}
export function readEnvironmentSnapshot(now = Date.now()): Snapshot | undefined {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(ENVIRONMENT_SNAPSHOT_KEY) ?? 'null')
    if (record(raw) && finite(raw.savedAt) && raw.savedAt > 0 && raw.savedAt <= now && now - raw.savedAt < MAX_AGE_MS && isEnvironmentHistory(raw.data)) return { savedAt: raw.savedAt, data: raw.data }
  } catch { /* Storage is optional, including private browsing and invalid JSON. */ }
  return undefined
}
export function saveEnvironmentSnapshot(data: EnvironmentHistoryData, revision: number, savedAt = Date.now()): void {
  if (revision !== sessionRevision || !isEnvironmentHistory(data)) return
  try { localStorage.setItem(ENVIRONMENT_SNAPSHOT_KEY, JSON.stringify({ savedAt, data })) } catch { /* Quota/security failures must not affect live data. */ }
}
export function clearEnvironmentSnapshot(): void {
  sessionRevision += 1 // Prevent an old in-flight response from recreating a signed-out snapshot.
  try { localStorage.removeItem(ENVIRONMENT_SNAPSHOT_KEY) } catch { /* Storage can be unavailable. */ }
}
