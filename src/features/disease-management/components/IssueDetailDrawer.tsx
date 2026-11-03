import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Descriptions, Drawer, Empty, Flex, Form, Image, Modal, Popconfirm, Select, Tag, Typography } from 'antd'
import { issuesApi, type Consultation, type Evidence } from '../api/issues.api'
import { useConsultations, useIssue, useIssueActions, useTreatments } from '../api/issues.queries'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate } from '../../../shared/ui/audit-format'
function EvidenceGallery({ media }: { media: Evidence[] }) {
  return <Image.PreviewGroup><Flex gap={8} wrap>{media.map(item => <div key={item.media_id}>{item.media_stage && <Tag>{item.media_stage}</Tag>}{item.media_type === 'VIDEO' ? <video src={item.media_url} controls preload="none" style={{ width: 180 }} /> : <Image width={140} src={item.media_url} alt={item.caption ?? 'Bằng chứng hiện trường'} />}<Typography.Paragraph>{item.caption}</Typography.Paragraph></div>)}</Flex></Image.PreviewGroup>
}
function TreatmentLog({ id }: { id: number }) {
  const query = useTreatments(id)
  return <><QueryFeedback query={query} />{!query.isError && query.data && (query.data.length ? query.data.map(log => <Card size="small" key={log.treatment_log_id} title={`${log.performed_by_name} · ${auditDate(log.performed_at)}`}><Typography.Paragraph>{log.action_description}</Typography.Paragraph><Typography.Paragraph>Kết quả: {log.result_description ?? 'Chưa ghi nhận'}</Typography.Paragraph><EvidenceGallery media={log.media} /></Card>) : <Empty description="Chưa có nhật ký điều trị" />)}</>
}
function AssignExpertModal({ consultation, onClose }: { consultation: Consultation; onClose: () => void }) {
  const [form] = Form.useForm<{ expertId: number }>()
  const query = useQuery({ queryKey: ['users', 'experts'], queryFn: issuesApi.experts })
  const { assign } = useIssueActions()
  return <Modal open title="Phân công Chuyên gia" onCancel={onClose} onOk={() => form.submit()} confirmLoading={assign.isPending} okButtonProps={{ disabled: !query.data?.length || query.isError }} cancelButtonProps={{ disabled: assign.isPending }} closable={!assign.isPending} maskClosable={false}>
    <QueryFeedback query={query} />
    <Form form={form} layout="vertical" onFinish={values => assign.mutate({ id: consultation.consultation_id, ...values }, { onSuccess: onClose })}>
      <Form.Item name="expertId" label="Chuyên gia nấm học" rules={[{ required: true, message: 'Vui lòng chọn chuyên gia' }]}><Select showSearch optionFilterProp="label" loading={query.isLoading} options={query.data?.map(user => ({ value: user.user_id, label: `${user.full_name} (${user.email})` }))} notFoundContent="Không có chuyên gia đang hoạt động" /></Form.Item>
    </Form>
  </Modal>
}
export function IssueDetailDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useIssue(id)
  const consultations = useConsultations(id)
  const [assigning, setAssigning] = useState<Consultation | null>(null)
  const { resolve } = useIssueActions()
  const issue = query.data
  return <Drawer open onClose={onClose} title="Hồ sơ Bệnh học & Điều trị" size={800}>
    <QueryFeedback query={query} />
    {!query.isError && issue && <Flex vertical gap={16}>
      <Descriptions column={1} bordered size="small" items={[{ key: 'id', label: 'Mã ca', children: issue.issue_id }, { key: 'title', label: 'Tên sự cố', children: issue.title }, { key: 'status', label: 'Trạng thái', children: <Tag>{issue.status}</Tag> }, { key: 'session', label: 'Phiên / Khay', children: `${issue.session_id ?? '—'} / ${issue.tray_id ?? '—'}` }]} />
      <Card size="small" title="Triệu chứng ban đầu"><Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{issue.description}</Typography.Paragraph><EvidenceGallery media={issue.media ?? []} /></Card>
      <QueryFeedback query={consultations} />
      {!consultations.isError && consultations.data?.length === 0 && <Empty description="Chưa có yêu cầu tư vấn chuyên gia cho ca bệnh này" />}
      {!consultations.isError && consultations.data?.map(consultation => <Card key={consultation.consultation_id} size="small" title={`Tư vấn #${consultation.consultation_id} · ${consultation.expert_name ?? 'Chưa phân công'}`} extra={['WAITING_EXPERT', 'IN_PROGRESS'].includes(issue.status) && ['PENDING', 'IN_PROGRESS'].includes(consultation.status) ? <Button onClick={() => setAssigning(consultation)}>Phân công Chuyên gia</Button> : null}>
        <Typography.Paragraph>Yêu cầu: {consultation.question}</Typography.Paragraph>
        <Typography.Title level={5}>Chẩn đoán & Hướng dẫn xử lý</Typography.Title>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{consultation.diagnosis ?? 'Chưa có chẩn đoán'}</Typography.Paragraph>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{consultation.solution ?? 'Chưa có hướng dẫn'}</Typography.Paragraph>
        <Typography.Title level={5}>Nhật ký điều trị · Chỉ xem</Typography.Title><TreatmentLog id={consultation.consultation_id} />
      </Card>)}
      {issue.status === 'MONITORING' && <Popconfirm title="Duyệt hoàn tất xử lý?" description="Xác nhận đã kiểm tra kết quả điều trị và tình trạng ổn định." onConfirm={() => resolve.mutateAsync(id).catch(() => undefined)}><Button type="primary" loading={resolve.isPending}>Duyệt hoàn tất xử lý</Button></Popconfirm>}
    </Flex>}
    {assigning && <AssignExpertModal consultation={assigning} onClose={() => setAssigning(null)} />}
  </Drawer>
}
