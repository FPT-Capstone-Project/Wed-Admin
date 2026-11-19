import { useQuery } from '@tanstack/react-query'
import { Empty, Flex, Skeleton, Typography } from 'antd'
import { apiClient } from '../../../shared/api/client'
import { ensureObject } from '../../../shared/api/response-normalizer'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { MetadataBadge } from '../../../shared/ui'
import { SESSION_PROGRESS_STAGE_DICTIONARY } from '../../../shared/i18n/status/session'
import { statusLabel } from '../../../shared/i18n/status/registry'
import { translateProgressNote } from '../../../shared/i18n/progress-notes'
import { formatDate, isValidDateValue } from '../../../shared/utils/date'
import { formatSessionProgress } from '../utils/session-progress.utils'

interface ProgressRecord {
  progress_id: number
  current_stage: string | null
  progress_percent: number | null
  description: string | null
  updated_at: string | null
}
/** Mounted only while the progress tab is active; one schema endpoint. */
export function SessionProgressHistory({ sessionId }: { sessionId: number }) {
  const query = useQuery({
    queryKey: ['admin-cultivation-sessions', 'progress', sessionId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<unknown>(`/api/cultivation-sessions/admin/${sessionId}/progress`, { signal })
      const body = ensureObject<{ progress_history: ProgressRecord[] }>(response.data)
      if (!body || !Array.isArray(body.progress_history)) throw new Error('Dữ liệu lịch sử tiến độ không đúng định dạng.')
      return body.progress_history
    },
    enabled: sessionId > 0,
    staleTime: 60_000,
  })
  if (query.isPending) return <Skeleton active />
  if (query.isError) return <LoadErrorAlert resource="lịch sử tiến độ" error={query.error} onRetry={query.refetch} />
  if (!query.data.length) return <Empty description="Chưa có mốc tiến độ" />
  return <Flex vertical gap={12}>{query.data.map(record => <Flex key={record.progress_id} gap={12} align="start">
    <MetadataBadge label={statusLabel(SESSION_PROGRESS_STAGE_DICTIONARY, record.current_stage, 'Chưa ghi nhận')} />
    <div>
      <Typography.Text>{formatSessionProgress(record.progress_percent)}{translateProgressNote(record.description) ? ` · ${translateProgressNote(record.description)}` : ''}</Typography.Text>
      {isValidDateValue(record.updated_at) && <div><Typography.Text type="secondary">{formatDate(record.updated_at)}</Typography.Text></div>}
    </div>
  </Flex>)}</Flex>
}
