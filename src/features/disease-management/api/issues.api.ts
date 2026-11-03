import { cleanQueryParams, unwrapListResponse } from '../../../shared/api/list-response'
import { apiClient } from '../../../shared/api/client'
import { userApi } from '../../users/api/user.api'
export const ISSUE_STATUSES = ['OPEN', 'WAITING_EXPERT', 'IN_PROGRESS', 'MONITORING', 'RESOLVED'] as const
export type IssueStatus = typeof ISSUE_STATUSES[number]
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'
export interface IssueQuery { status?: IssueStatus; severity?: Severity; sessionId?: number; page: number; pageSize: number }
export interface Evidence { media_id: number; media_url: string; media_type: 'IMAGE' | 'VIDEO'; caption: string | null; media_stage?: 'BEFORE' | 'DURING' | 'AFTER' }
export interface Issue { issue_id: number; title: string; description: string; severity: Severity; status: IssueStatus; created_at: string; session_id: number | null; tray_id: number | null; reported_by_name: string | null; media?: Evidence[] }
export interface Consultation { consultation_id: number; issue_id: number; expert_id: number | null; expert_name: string | null; question: string; diagnosis: string | null; solution: string | null; status: string; created_at: string }
export interface Treatment { treatment_log_id: number; performed_by_name: string; performed_at: string; action_description: string; result_description: string | null; media: Evidence[] }
export interface PageResponse<T> { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface AssignExpertRequest { expertId: number }
export const issuesApi = {
  async list(query: Partial<IssueQuery> = {}): Promise<PageResponse<Issue>> {
    const response = await apiClient.get<unknown>('/api/issues', { params: cleanQueryParams(query) })
    return unwrapListResponse<Issue>(response.data, query)
  },
  async detail(id: number) { return (await apiClient.get<{ data: Issue }>(`/api/issues/${id}`)).data.data },
  // Issue detail does not expose consultation_id; fetch all consultation pages and match issue_id.
  async consultations(issueId: number) {
    const result: Consultation[] = []
    let page = 1
    let totalPages: number
    do {
      const { data } = await apiClient.get<PageResponse<Consultation>>('/api/consultations', { params: { page, pageSize: 100 } })
      result.push(...data.data.filter(item => item.issue_id === issueId))
      totalPages = data.pagination.totalPages
      page += 1
    } while (page <= totalPages)
    return result
  },
  async experts() { return (await userApi.list()).filter(user => user.status === 'ACTIVE' && /expert/i.test(user.role_name ?? '')) },
  async treatments(id: number) { return (await apiClient.get<{ data: Treatment[] }>(`/api/consultations/${id}/treatments`)).data.data },
  async assign(id: number, payload: AssignExpertRequest): Promise<void> { await apiClient.patch(`/api/consultations/${id}/assign`, payload) },
  async resolve(id: number): Promise<void> { await apiClient.patch(`/api/issues/${id}/resolve`) },
}
