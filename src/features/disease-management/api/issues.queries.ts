import { useSyncExternalStore } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { issuesApi, type Issue, type IssueQuery } from './issues.api'
export const issueKeys = { all: ['issues'] as const }
const subscribe = (notify: () => void) => { document.addEventListener('visibilitychange', notify); return () => document.removeEventListener('visibilitychange', notify) }
function useVisible() { return useSyncExternalStore(subscribe, () => document.visibilityState === 'visible', () => false) }
export const useIssues = (query: IssueQuery) => useQuery({ queryKey: ['issues', 'list', query], queryFn: () => issuesApi.list(query), placeholderData: keepPreviousData })
export function useIssue(id: number, active = true) {
  const visible = useVisible()
  return useQuery({ queryKey: ['issues', 'detail', id], queryFn: ({ signal }) => issuesApi.detail(id, signal), enabled: active && visible, refetchInterval: q => active && visible && q.state.data?.status !== 'RESOLVED' ? 5000 : false, refetchIntervalInBackground: false })
}
export function useConsultations(issue: Issue | undefined, active: boolean) {
  return useQuery({ queryKey: ['issues', 'consultations', issue?.issue_id, issue?.consultation_ids.join(',')], queryFn: ({ signal }) => issuesApi.consultations(issue!, signal), enabled: !!issue && active })
}
export function useConsultation(id: number, open: boolean) {
  const visible = useVisible()
  return useQuery({ queryKey: ['issues', 'consultation', id], queryFn: ({ signal }) => issuesApi.consultation(id, signal), enabled: visible, refetchInterval: q => visible && open && q.state.data?.status !== 'CLOSED' ? 5000 : false, refetchIntervalInBackground: false })
}
export function useTreatments(id: number, open = true) {
  const visible = useVisible()
  return useQuery({ queryKey: ['issues', 'treatments', id], queryFn: ({ signal }) => issuesApi.treatments(id, signal), enabled: visible, refetchInterval: visible && open ? 5000 : false, refetchIntervalInBackground: false })
}
