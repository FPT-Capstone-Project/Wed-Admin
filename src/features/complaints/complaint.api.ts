import { apiClient } from '../../shared/api/client'
import { ensureObject } from '../../shared/api/response-normalizer'
import type { AssignPayload, ComplaintDetail, ComplaintList, ComplaintQuery, ReplyPayload, StatusPayload } from './complaint.types'
import { STATUS_OPTIONS } from './complaint-status'

export const complaintApi = {
  async list(query: ComplaintQuery = {}, signal?: AbortSignal): Promise<ComplaintList> {
    const response = await apiClient.get<ComplaintList>('/api/complaints', { params: query, signal, skipGlobalErrorToast: true })
    const body = response.data
    if (!Array.isArray(body.data) || !Number.isSafeInteger(body.total) || !Number.isSafeInteger(body.page) || !Number.isSafeInteger(body.pageSize)) throw new Error('Dữ liệu danh sách khiếu nại không đúng định dạng.')
    return body
  },
  async detail(id: number, signal?: AbortSignal): Promise<ComplaintDetail> {
    const response = await apiClient.get<unknown>(`/api/complaints/${id}`, { signal, skipGlobalErrorToast: true })
    const data = ensureObject<ComplaintDetail>(response.data)
    if (!data || data.complaint_id !== id || !Array.isArray(data.replies)) throw new Error('Dữ liệu chi tiết khiếu nại không đúng định dạng.')
    return data
  },
  async reply(id: number, payload: ReplyPayload) {
    await apiClient.post(`/api/complaints/${id}/replies`, payload, { skipGlobalErrorToast: true })
  },
  async assign(id: number, payload: AssignPayload) {
    await apiClient.patch(`/api/complaints/${id}/assign`, payload, { skipGlobalErrorToast: true })
  },
  async status(id: number, payload: StatusPayload) {
    await apiClient.patch(`/api/complaints/${id}/status`, payload, { skipGlobalErrorToast: true })
  },
}

/** Metadata totals avoid fabricating KPIs from the current page. */
export async function fetchComplaintSummary(signal?: AbortSignal) {
  const counts = await Promise.all(STATUS_OPTIONS.map(async ({ value }) => [value, (await complaintApi.list({ page: 1, pageSize: 1, status: value }, signal)).total] as const))
  const count = Object.fromEntries(counts)
  return { total: counts.reduce((sum, [, value]) => sum + value, 0), open: count.OPEN, processing: count.IN_PROGRESS + count.WAITING_CUSTOMER, closed: count.RESOLVED + count.REJECTED }
}

/** Server has no search parameter; bound client search to 20 pages of 100. */
export async function fetchComplaintSearch(status: ComplaintQuery['status'], signal?: AbortSignal) {
  const first = await complaintApi.list({ page: 1, pageSize: 100, status }, signal)
  const data = [...first.data]
  const pages = Math.min(20, Math.ceil(first.total / first.pageSize))
  for (let page = 2; page <= pages; page++) {
    const result = await complaintApi.list({ page, pageSize: 100, status }, signal)
    data.push(...result.data)
    if (result.data.length < result.pageSize) break
  }
  return { data, incomplete: data.length < first.total }
}
