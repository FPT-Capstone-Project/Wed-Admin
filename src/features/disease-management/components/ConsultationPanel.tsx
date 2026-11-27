import { useMemo, useState } from 'react'
import { Alert, Card, Empty, Flex, Tabs, Typography } from 'antd'
import { ConversationThread, type ConversationEntry } from '../../../shared/ui/ConversationThread'
import { conversationSide } from '../../../shared/ui/conversation-sender'
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

function Conversation({ consultation, issue, expertName, names }: { consultation: Consultation; issue: Issue; expertName: string; names: ReadonlyMap<number, string> }) {
  const messages: ConversationEntry[] = consultation.messages.map((m, index) => {
    const side = conversationSide({ senderId: m.sender_id, roleId: m.sender_role_id, role: m.sender_role, senderName: m.sender_name, externalId: consultation.expert_id, externalName: expertName })
    const senderName = m.sender_name ?? (m.sender_id ? names.get(m.sender_id) : null) ?? (side === 'left' ? expertName : issue.reported_by_name ?? 'Nhân viên')
    return {
      id: `${m.id}-${index}`, senderKey: `${side}:${m.sender_id ?? senderName}`, senderName,
      roleLabel: side === 'left' ? 'Chuyên gia' : 'Nhân viên', side, createdAt: m.created_at,
      content: <>
        {(m.diagnosis || m.solution || ['EXPERT_RESPONSE', 'RESPONSE', 'DIAGNOSIS'].includes(m.type ?? '')) && <div><strong>Phản hồi chuyên môn</strong></div>}
        {m.message && <div>{m.message}</div>}
        {m.diagnosis && <div>Chẩn đoán: {m.diagnosis}</div>}
        {m.solution && <div>Hướng xử lý: {m.solution}</div>}
      </>, images: m.media_url ? [m.media_url] : [],
    }
  })
  if (consultation.question.trim() && hasInitialQuestion(consultation)) {
    const senderName = issue.reported_by_name ?? 'Nhân viên'
    messages.unshift({ id: 'initial-question', senderKey: `right:${senderName}`, senderName, roleLabel: 'Nhân viên', side: 'right', createdAt: consultation.created_at, content: consultation.question })
  }
  return <Flex vertical gap={12}>
    <ConversationThread messages={messages} />
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
  const expertIds = useMemo(() => consultation ? [...new Set([
    ...(!consultation.expert_name ? [consultation.expert_id] : []),
    ...consultation.messages.filter(m => !m.sender_name).map(m => m.sender_id),
  ])] : [], [consultation])
  const names = useStaffNames(expertIds)
  const expertName = consultation?.expert_name ?? (consultation?.expert_id ? names.get(consultation.expert_id) ?? 'Đang tải tên chuyên gia…' : 'Chưa phân công chuyên gia')

  return <Flex vertical gap={12}><QueryFeedback query={query} />
    {!query.isError && consultation && consultation.issue_id !== issue.issue_id && <Alert type="warning" title="Tư vấn này không thuộc sự cố đang xem." />}
    {!query.isError && consultation && consultation.issue_id === issue.issue_id && <>
      <Flex gap={12} wrap align="center"><StatusBadge {...presentStatus(CONSULTATION_STATUS_DICTIONARY, consultation.status, missing)} /><Typography.Text>Chuyên gia: {expertName}</Typography.Text></Flex>
      <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'conversation', label: 'Trao đổi trong yêu cầu' }, { key: 'treatments', label: 'Lịch sử xử lý' }]} />
      {tab === 'conversation' && <Conversation consultation={consultation} issue={issue} expertName={expertName} names={names} />}
      {tab === 'treatments' && <TreatmentHistory consultation={consultation} issue={issue} />}
    </>}
  </Flex>
}
