import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { complaintApi, fetchComplaintSearch, fetchComplaintSummary } from './complaint.api'
import type { AssignPayload, ComplaintQuery, ReplyPayload, StatusPayload } from './complaint.types'

export const complaintKeys = {
  all: ['complaints'] as const,
  list: (query: ComplaintQuery) => ['complaints', 'list', query] as const,
  detail: (id: number | null) => ['complaints', 'detail', id] as const,
}
export function useComplaints(query: ComplaintQuery, searching: boolean) {
  return useQuery({ queryKey: complaintKeys.list(query), queryFn: ({ signal }) => complaintApi.list(query, signal), enabled: !searching, placeholderData: keepPreviousData })
}
export function useComplaintSearch(status: ComplaintQuery['status'], enabled: boolean) {
  return useQuery({ queryKey: ['complaints', 'search', status], queryFn: ({ signal }) => fetchComplaintSearch(status, signal), enabled, staleTime: 30_000 })
}
export function useComplaintSummary() {
  return useQuery({ queryKey: ['complaints', 'summary'], queryFn: ({ signal }) => fetchComplaintSummary(signal), staleTime: 30_000 })
}
export function useComplaintDetail(id: number | null) {
  return useQuery({ queryKey: complaintKeys.detail(id), queryFn: ({ signal }) => complaintApi.detail(id as number, signal), enabled: id != null && id > 0 })
}
type ComplaintAction = { kind: 'reply'; payload: ReplyPayload } | { kind: 'assign'; payload: AssignPayload } | { kind: 'status'; payload: StatusPayload }
export function useComplaintAction(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (action: ComplaintAction) => {
      switch (action.kind) {
        case 'reply': return complaintApi.reply(id, action.payload)
        case 'assign': return complaintApi.assign(id, action.payload)
        case 'status': return complaintApi.status(id, action.payload)
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: complaintKeys.all }),
  })
}
