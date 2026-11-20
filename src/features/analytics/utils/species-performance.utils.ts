import type { CultivationSession } from '../../sessions/types/session.types'

/** Revenue and session counts are independent; each valid session counts once. */
export function buildSpeciesPerformance(
  revenue: { species: string; revenue: number }[],
  sessions: CultivationSession[],
) {
  const groups = new Map<string, {
    species: string; revenue: number; sessionCount: number; completed: number; cancelled: number
  }>()
  const keyFor = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN')
  const groupFor = (name: string) => {
    const key = keyFor(name)
    let group = groups.get(key)
    if (!group) {
      group = { species: name.trim(), revenue: 0, sessionCount: 0, completed: 0, cancelled: 0 }
      groups.set(key, group)
    }
    return group
  }
  for (const row of revenue) groupFor(row.species).revenue += row.revenue
  const seen = new Set<number>()
  for (const session of sessions) {
    if (!Number.isSafeInteger(session.session_id) || session.session_id <= 0 || seen.has(session.session_id)) continue
    seen.add(session.session_id)
    const group = groupFor(session.mushroom_name?.trim() || 'Khác')
    group.sessionCount += 1
    if (session.status === 'COMPLETED') group.completed += 1
    if (session.status === 'CANCELLED') group.cancelled += 1
  }
  return [...groups.values()].map(group => ({
    species: group.species,
    revenue: group.revenue,
    sessionCount: group.sessionCount,
    successRate: group.completed + group.cancelled > 0
      ? group.completed / (group.completed + group.cancelled) * 100 : null,
  })).sort((a, b) => b.sessionCount - a.sessionCount)
}
