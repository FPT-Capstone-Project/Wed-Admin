import { apiClient } from '../../../shared/api/client'
import { unwrapListResponse } from '../../../shared/api/list-response'
import { ensureObject } from '../../../shared/api/response-normalizer'
import { normalizeSession } from './session-normalizer'
import type { CultivationSession, SessionListQuery, SessionPagination } from '../types/session.types'
import type { OrderCultivationResponse } from '../../orders/api/order-audit.api'

export const FARM_SESSIONS_URL = '/api/farm/sessions'
export interface SessionListResult { items: CultivationSession[]; pagination: SessionPagination }

/** Attach only explicitly reported tray assignments, never infer them from tray_quantity. */
async function attachTrays(sessions: CultivationSession[]): Promise<CultivationSession[]> {
  const orderIds = [...new Set(sessions.flatMap(s => s.order_id ? [s.order_id] : []))]
  const assignments = new Map<number, OrderCultivationResponse['sessions'][number]>()
  // Bound concurrency for large farms.
  for (let offset = 0; offset < orderIds.length; offset += 5) {
    const results = await Promise.all(orderIds.slice(offset, offset + 5).map(async id => {
      const response = await apiClient.get<{ data: OrderCultivationResponse }>(`/api/customer/orders/${id}/cultivation-status`)
      if (!Array.isArray(response.data.data?.sessions)) throw new Error('Dữ liệu phân bổ khay không đúng định dạng')
      return response.data.data.sessions
    }))
    for (const rows of results) for (const row of rows) assignments.set(row.session_id, row)
  }
  return sessions.map(session => {
    const assignment = assignments.get(session.session_id)
    if (!assignment) return session
    return { ...session, progress_percent: assignment.progress_percent == null ? session.progress_percent : Number(assignment.progress_percent), trays: assignment.assigned_trays ?? [] }
  })
}

export function selectSessions(sessions: CultivationSession[], query: SessionListQuery = {}): SessionListResult {
  const filtered = sessions.filter(session =>
    (!query.status || session.status === query.status) &&
    (query.userId == null || session.user_id === query.userId) &&
    (query.mushroomTypeId == null || session.mushroom_type_id === query.mushroomTypeId) &&
    (query.trayId == null || session.trays.some(tray => tray.tray_id === query.trayId && tray.status !== 'RELEASED')) &&
    (!query.startDateFrom || Boolean(session.start_date && Date.parse(session.start_date) >= Date.parse(query.startDateFrom))) &&
    (!query.startDateTo || Boolean(session.start_date && Date.parse(session.start_date) <= Date.parse(query.startDateTo)))
  )
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.max(1, query.pageSize ?? (filtered.length || 20))
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), pagination: { page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) } }
}

export const sessionApi = {
  async list(query: SessionListQuery = {}): Promise<SessionListResult> {
    const response = await apiClient.get<unknown>(FARM_SESSIONS_URL, { params: query.status ? { status: query.status } : undefined })
    let sessions = unwrapListResponse<unknown>(response.data).data.map(normalizeSession)
    if (query.userId != null || query.mushroomTypeId != null) {
      const details: CultivationSession[] = []
      for (let offset = 0; offset < sessions.length; offset += 5) {
        details.push(...await Promise.all(sessions.slice(offset, offset + 5).map(async session => ({ ...session, ...await sessionApi.getById(session.session_id) }))))
      }
      sessions = details
    }
    if (query.trayId != null || query.includeTrays) sessions = await attachTrays(sessions)
    return selectSessions(sessions, query)
  },
  async getById(id: number, includeTrays = false): Promise<CultivationSession> {
    const response = await apiClient.get<unknown>(`${FARM_SESSIONS_URL}/${id}`)
    const raw = ensureObject<Record<string, unknown>>(response.data)
    if (!raw) throw new Error('Dữ liệu chi tiết phiên không đúng định dạng')
    const session = normalizeSession(raw)
    return includeTrays ? (await attachTrays([session]))[0] : session
  },
}
