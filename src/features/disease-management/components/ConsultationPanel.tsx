import { useMemo, useState } from 'react'
import { Alert, Card, Empty, Flex, Image, Tabs, Typography } from 'antd'
import type { Consultation, Issue } from '../api/issues.api'
import { useConsultation, useTreatments } from '../api/issues.queries'
import { useStaffNames } from '../../users/hooks/useStaffNames'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { StatusBadge } from '../../../shared/ui'
import { CONSULTATION_STATUS_DICTIONARY, TREATMENT_REVIEW_DICTIONARY } from '../../../shared/i18n/status/issue'
import { presentStatus } from '../../../shared/i18n/status/registry'
import { hasInitialQuestion, timestamp } from '../api/issues.normalizers'
import { EvidenceGallery } from './IssueShared'
import { dateText, missing, show } from './issue-display'

function Conversation({ consultation }: { consultation: Consultation }) {
  return <Flex vertical gap={12}>
    {hasInitialQuestion(consultation) && <Card size="small" title="Câu hỏi ban đầu"><Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{show(consultation.question)}</Typography.Paragraph></Card>}
    {consultation.messages.map((m, index) => <Card size="small" key={`${m.id}-${index}`} title={show(m.sender_name)} extra={dateText(m.created_at)}>
      {(m.diagnosis || m.solution || ['EXPERT_RESPONSE', 'RESPONSE', 'DIAGNOSIS'].includes(m.type ?? '')) && <Typography.Text strong>Phản hồi chuyên môn</Typography.Text>}
      {m.message && <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.message}</Typography.Paragraph>}
      {m.diagnosis && <Typography.Paragraph>Chẩn đoán: {m.diagnosis}</Typography.Paragraph>}
      {m.solution && <Typography.Paragraph>Hướng xử lý: {m.solution}</Typography.Paragraph>}
      {m.media_url && <Image width={180} src={m.media_url} alt="Ảnh trao đổi" />}
    </Card>)}
    {(consultation.diagnosis || consultation.solution) && <Card size="small" title="Chẩn đoán và hướng xử lý hiện tại">
      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>Chẩn đoán: {show(consultation.diagnosis)}</Typography.Paragraph>
      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>Hướng xử lý: {show(consultation.solution)}</Typography.Paragraph>
    </Card>}
  </Flex>
}

function TreatmentHistory({ consultation, issue }: { consultation: Consultation; issue: Issue }) {
  const query = useTreatments(consultation.consultation_id, issue.status !== 'RESOLVED' && consultation.status !== 'CLOSED')
  const rows = [...(query.data ?? [])].sort((a, b) => timestamp(a.performed_at) - timestamp(b.performed_at) || a.treatment_log_id - b.treatment_log_id)
  return <Flex vertical gap={12}><QueryFeedback query={query} />
    {!query.isError && !query.isLoading && !rows.length && <Empty description="Chưa có nhật ký xử lý cho tư vấn này." />}
    {rows.map(log => <Card key={log.treatment_log_id} size="small" title={`${show(log.performed_by_name)} · ${dateText(log.performed_at)}`}>
      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{show(log.action_description)}</Typography.Paragraph>
      <Typography.Paragraph>Kết quả: {show(log.result_description)}</Typography.Paragraph><EvidenceGallery media={log.media} />
      {log.reviews.map((r, index) => <Card size="small" key={index} title="Kết quả duyệt"><StatusBadge {...presentStatus(TREATMENT_REVIEW_DICTIONARY, r.review_result, missing)} />
        <Typography.Paragraph>{show(r.review_comment)}</Typography.Paragraph><Typography.Text>{show(r.reviewed_by_name)} · {dateText(r.reviewed_at)}</Typography.Text>
      </Card>)}
    </Card>)}
  </Flex>
}

export function ConsultationPanel({ id, issue }: { id: number; issue: Issue }) {
  const [tab, setTab] = useState('conversation')
  const query = useConsultation(id, issue.status !== 'RESOLVED' && tab === 'conversation')
  const consultation = query.data
  const expertIds = useMemo(() => consultation && !consultation.expert_name ? [consultation.expert_id] : [], [consultation])
  const names = useStaffNames(expertIds)
  const expertName = consultation?.expert_name ?? (consultation?.expert_id ? names.get(consultation.expert_id) ?? 'Đang tải tên chuyên gia…' : 'Chưa phân công chuyên gia')

  return <Flex vertical gap={12}><QueryFeedback query={query} />
    {!query.isError && consultation && consultation.issue_id !== issue.issue_id && <Alert type="warning" title="Tư vấn này không thuộc sự cố đang xem." />}
    {!query.isError && consultation && consultation.issue_id === issue.issue_id && <>
      <Flex gap={12} wrap align="center"><StatusBadge {...presentStatus(CONSULTATION_STATUS_DICTIONARY, consultation.status, missing)} /><Typography.Text>Chuyên gia: {expertName}</Typography.Text></Flex>
      <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'conversation', label: 'Trao đổi trong yêu cầu' }, { key: 'treatments', label: 'Lịch sử xử lý' }]} />
      {tab === 'conversation' && <Conversation consultation={consultation} />}
      {tab === 'treatments' && <TreatmentHistory consultation={consultation} issue={issue} />}
    </>}
  </Flex>
}
