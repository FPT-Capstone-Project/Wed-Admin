import { useEffect } from 'react'
import type { NotificationListResult } from '../notifications/types/notification.types'
import { isFinalComplaint } from './complaint-status'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assignComplaintForReview, complaintApi, fetchComplaintSearch, fetchComplaintSummary } from './complaint.api'
import type { AssignPayload, ComplaintQuery, StatusPayload } from './complaint.types'

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
  return useQuery({ queryKey: complaintKeys.detail(id), queryFn: ({ signal }) => complaintApi.detail(id as number, signal), enabled: id != null && id > 0,
    refetchInterval: query => id != null && query.state.data && !isFinalComplaint(query.state.data.status) ? 15000 : false,
    refetchIntervalInBackground: false,
  })
}
type ComplaintAction = { kind: 'assign'; payload: AssignPayload } | { kind: 'status'; payload: StatusPayload }
export function useComplaintAction(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (action: ComplaintAction) => {
      switch (action.kind) {
        case 'assign': return assignComplaintForReview(id, action.payload)
        case 'status': return complaintApi.status(id, action.payload)
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: complaintKeys.all }),
  })
}

/** React to notification data already received by the bell, without extra requests. */
export function useComplaintNotificationSync() {
  const client = useQueryClient()
  useEffect(() => {
    const seen = new Set<number>()
    return client.getQueryCache().subscribe(event => {
      if (event.type !== 'updated' || event.action.type !== 'success' || event.query.queryKey[0] !== 'notifications') return
      const result = event.query.state.data as NotificationListResult | undefined
      const changed = new Set<number>()
      let relevant = false
      for (const item of result?.items ?? []) {
        if (seen.has(item.notification_id)) continue
        seen.add(item.notification_id)
        if (item.reference_type !== 'COMPLAINT' && item.notification_type !== 'COMPLAINT_UPDATE') continue
        relevant = true
        if (item.reference_type === 'COMPLAINT' && item.reference_id != null) changed.add(item.reference_id)
      }
      if (!relevant) return
      void client.invalidateQueries({ queryKey: [...complaintKeys.all, 'list'] })
      void client.invalidateQueries({ queryKey: [...complaintKeys.all, 'summary'] })
      if (changed.size) {
        for (const id of changed) void client.invalidateQueries({ queryKey: complaintKeys.detail(id) })
      } else {
        void client.invalidateQueries({ queryKey: [...complaintKeys.all, 'detail'] })
      }
    })
  }, [client])
}
