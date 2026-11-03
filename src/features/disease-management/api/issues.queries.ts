import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { getApiErrorMessage } from '../../../shared/api/error'
import { issuesApi, type IssueQuery } from './issues.api'
export const issueKeys = { all: ['issues'] as const }
export const useIssues = (query: IssueQuery) => useQuery({ queryKey: ['issues', 'list', query], queryFn: () => issuesApi.list(query) })
export const useIssue = (id: number) => useQuery({ queryKey: ['issues', 'detail', id], queryFn: () => issuesApi.detail(id) })
export const useConsultations = (id: number) => useQuery({ queryKey: ['issues', 'consultations', id], queryFn: () => issuesApi.consultations(id) })
export const useTreatments = (id: number) => useQuery({ queryKey: ['issues', 'treatments', id], queryFn: () => issuesApi.treatments(id) })
export function useIssueActions() {
  const client = useQueryClient()
  const { message } = App.useApp()
  const options = {
    onSuccess: async () => { await client.invalidateQueries({ queryKey: issueKeys.all }); void message.success('Đã cập nhật hồ sơ bệnh học') },
    onError: (error: Error) => { void message.error(getApiErrorMessage(error)) },
  }
  return {
    assign: useMutation({ mutationFn: ({ id, expertId }: { id: number; expertId: number }) => issuesApi.assign(id, { expertId }), ...options }),
    resolve: useMutation({ mutationFn: issuesApi.resolve, ...options }),
  }
}
