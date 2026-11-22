import { cleanQueryParams, unwrapListResponse } from '../../../shared/api/list-response'
import { apiClient } from '../../../shared/api/client'
import { normalizeConsultation, normalizeIssue, normalizeTreatment, unwrapEntity } from './issues.normalizers'

export const ISSUE_STATUSES = ['OPEN', 'WAITING_EXPERT', 'IN_PROGRESS', 'WAITING_REVIEW', 'MONITORING', 'RESOLVED'] as const
export type IssueStatus = typeof ISSUE_STATUSES[number]
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'
export interface IssueQuery { status?: IssueStatus; severity?: Severity; sessionId?: number; page: number; pageSize: number }
export interface Evidence { media_id: number; media_url: string; media_type: 'IMAGE' | 'VIDEO'; caption: string | null; media_stage?: string }
export interface Issue {
  issue_id: number; title: string; description: string; severity: Severity; status: IssueStatus; created_at: string | null
  session_id: number | null; tray_id: number | null; reported_by_name: string | null; media: Evidence[]
  consultation_ids: number[]; session_status: string | null; session_start_at: string | null; expected_harvest_date: string | null
  growth_stage: string | null; growth_progress: number | null; growth_condition: string | null; growth_updated_at: string | null
  tray_code: string | null; floor_id: number | null; tray_condition: string | null; mushroom_condition: string | null
  inspection_notes: string | null; inspection_at: string | null; spawn_condition: string | null; mushroom_name: string | null
  reported_growth_stage: string | null; environment_snapshot: Record<string, unknown> | null
}
export interface ConversationMessage {
  id: string; sender_name: string | null; created_at: string | null; message: string | null; media_url: string | null
  type: string | null; diagnosis: string | null; solution: string | null
}
export interface Consultation {
  consultation_id: number; issue_id: number; expert_id: number | null; expert_name: string | null; question: string
  diagnosis: string | null; solution: string | null; status: string; created_at: string | null; messages: ConversationMessage[]
}
export interface TreatmentReview { review_result: string | null; review_comment: string | null; reviewed_by_name: string | null; reviewed_at: string | null }
export interface Treatment {
  treatment_log_id: number; performed_by_name: string | null; performed_at: string | null; action_description: string | null
  result_description: string | null; media: Evidence[]; reviews: TreatmentReview[]
}
export interface PageResponse<T> { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface ConsultationLookup { items: Consultation[]; truncated: boolean }
export const issuesApi = {
  async list(query: Partial<IssueQuery> = {}): Promise<PageResponse<Issue>> {
    const response = await apiClient.get<unknown>('/api/issues', { params: cleanQueryParams(query) })
    const result = unwrapListResponse<unknown>(response.data, query)
    return { ...result, data: result.data.map(normalizeIssue) }
  },
  async detail(id: number, signal?: AbortSignal) { return normalizeIssue(unwrapEntity((await apiClient.get<unknown>(`/api/issues/${id}`, { signal })).data)) },
  async consultation(id: number, signal?: AbortSignal) { return normalizeConsultation(unwrapEntity((await apiClient.get<unknown>(`/api/consultations/${id}`, { signal })).data)) },
  async consultations(issue: Issue, signal?: AbortSignal): Promise<ConsultationLookup> {
    if (issue.consultation_ids.length) return { items: issue.consultation_ids.map(id => normalizeConsultation({ consultation_id: id, issue_id: issue.issue_id })), truncated: false }
    // Swagger has no issueId filter. Bound the legacy fallback and disclose incomplete results.
    const items = new Map<number, Consultation>()
    for (let page = 1; page <= 5; page++) {
      const response = await apiClient.get<unknown>('/api/consultations', { params: { page, pageSize: 20 }, signal })
      const result = unwrapListResponse<unknown>(response.data, { page, pageSize: 20 })
      for (const item of result.data.map(normalizeConsultation)) {
        if (item.issue_id === issue.issue_id && item.consultation_id > 0) items.set(item.consultation_id, item)
      }
      if (page >= result.pagination.totalPages || result.data.length < 20) return { items: [...items.values()], truncated: false }
    }
    return { items: [...items.values()], truncated: true }
  },
  async treatments(id: number, signal?: AbortSignal) { return unwrapListResponse<unknown>((await apiClient.get<unknown>(`/api/consultations/${id}/treatments`, { signal })).data).data.map(normalizeTreatment) },
}
