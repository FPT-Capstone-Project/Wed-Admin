import { useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, Flex, Select, Tabs, Typography } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { issueKeys, useConsultations, useIssue } from '../api/issues.queries'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { StatusBadge } from '../../../shared/ui'
import { ISSUE_STATUS_DICTIONARY } from '../../../shared/i18n/status/issue'
import { presentStatus } from '../../../shared/i18n/status/registry'
import { ConsultationPanel } from './ConsultationPanel'
import { EvidenceGallery, SessionInformation } from './IssueShared'

export function IssueDetailDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const [tab, setTab] = useState('issue')
  const query = useIssue(id, tab !== 'session')
  const lookup = useConsultations(query.data, tab === 'consultations')
  const [selected, setSelected] = useState<number>()
  const [refreshing, setRefreshing] = useState(false)
  const client = useQueryClient()
  const issue = query.data
  const consultations = lookup.data?.items ?? []
  const selectedId = consultations.find(c => c.consultation_id === selected)?.consultation_id ?? consultations[0]?.consultation_id

  async function refresh() {
    setRefreshing(true)
    try {
      // Refresh mounted panels concurrently; hidden history stays lazy and is marked stale.
      await client.invalidateQueries({ queryKey: issueKeys.all, refetchType: 'none' })
      await Promise.all([
        query.refetch(),
        client.refetchQueries({ queryKey: issueKeys.all, type: 'active', predicate: q => q.queryKey[1] !== 'detail' }),
      ])
    } finally { setRefreshing(false) }
  }

  return <Drawer open onClose={onClose} title="Hồ sơ Sự cố & Điều trị" size={860}
    extra={<Button size="small" onClick={() => void refresh()} loading={refreshing}>Tải lại</Button>}>
    <Flex vertical gap={16} style={{ overflowWrap: 'anywhere' }}>
      <QueryFeedback query={query} />
      {!query.isError && issue && <>
        <Typography.Title level={4}>{issue.title}</Typography.Title><StatusBadge {...presentStatus(ISSUE_STATUS_DICTIONARY, issue.status)} />
        <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'issue', label: 'Thông tin sự cố' }, { key: 'session', label: 'Xem thông tin phiên trồng' }, { key: 'consultations', label: 'Tư vấn & Xử lý' }]} />
        {tab === 'issue' && <Card size="small" title="Triệu chứng ban đầu"><Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{issue.description}</Typography.Paragraph><EvidenceGallery media={issue.media} /></Card>}
        {tab === 'session' && <SessionInformation issue={issue} />}
        {tab === 'consultations' && <>
          <QueryFeedback query={lookup} />
          {lookup.data?.truncated && <Alert type="warning" title="Danh sách tư vấn có thể chưa đầy đủ. Vui lòng tải lại sau hoặc liên hệ bộ phận hỗ trợ." />}
          {consultations.length > 1 && <Select aria-label="Chọn yêu cầu tư vấn" style={{ width: '100%' }} value={selectedId} onChange={setSelected} options={consultations.map(c => ({ value: c.consultation_id, label: `Tư vấn #${c.consultation_id}` }))} />}
          {lookup.isSuccess && !consultations.length && !lookup.data.truncated && <Empty description="Chưa có yêu cầu tư vấn chuyên gia cho sự cố này." />}
          {!lookup.isError && selectedId && <><Typography.Title level={5}>Tư vấn #{selectedId}</Typography.Title><ConsultationPanel key={selectedId} id={selectedId} issue={issue} /></>}
        </>}
      </>}
    </Flex>
  </Drawer>
}
