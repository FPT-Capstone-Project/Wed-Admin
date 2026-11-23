import { useRef, useState } from 'react'
import { App, Alert, Button, Card, Descriptions, Drawer, Empty, Flex, Form, Image, Input, Popconfirm, Segmented, Select, Skeleton, Space, Tabs, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { UserWithRole } from '../../../types/user.types'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { showApiError } from '../../../shared/api/error-mapper'
import { useComplaintAction, useComplaintDetail } from '../useComplaints'
import { complaintDate, isFinalComplaint, COMPLAINT_STATUSES } from '../complaint-status'
import type { ComplaintDetail, StatusPayload } from '../complaint.types'
import { ComplaintStatusBadge } from './ComplaintStatusBadge'

interface Props {
  id: number | null
  onClose: () => void
  users: UserWithRole[]
  canListUsers: boolean
  usersFailed: boolean
}
export function ComplaintDetailDrawer({ id, onClose, users, canListUsers, usersFailed }: Props) {
  const query = useComplaintDetail(id)
  return <Drawer title={id ? `Khiếu nại #${id}` : 'Chi tiết khiếu nại'} open={id != null} onClose={onClose} size={860} destroyOnHidden extra={<Button size="small" icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Tải lại</Button>}>
    {query.isPending ? <Skeleton active paragraph={{ rows: 10 }} /> : query.isError ? <LoadErrorAlert error={query.error} resource="chi tiết khiếu nại" onRetry={query.refetch} />
      : query.data && <ComplaintDetailContent key={`${query.data.complaint_id}-${query.data.status}-${query.data.assigned_to}`} complaint={query.data} users={users} canListUsers={canListUsers} usersFailed={usersFailed} />}
  </Drawer>
}

function ComplaintDetailContent({ complaint, users, canListUsers, usersFailed }: { complaint: ComplaintDetail } & Pick<Props, 'users' | 'canListUsers' | 'usersFailed'>) {
  const action = useComplaintAction(complaint.complaint_id)
  const { message } = App.useApp()
  const submitting = useRef(false)
  const customer = users.find(user => user.user_id === complaint.customer_id)
  async function submit(value: Parameters<typeof action.mutateAsync>[0]) {
    if (submitting.current || !canListUsers) return
    submitting.current = true
    try {
      await action.mutateAsync(value)
      void message.success(value.kind === 'assign' ? 'Đã cập nhật phân công.' : 'Đã cập nhật trạng thái.')
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const friendlyMessage = status === 409 ? 'Khiếu nại đã thay đổi hoặc đã đóng. Vui lòng tải lại trước khi tiếp tục.'
        : status === 400 ? 'Thông tin xử lý chưa hợp lệ. Kiểm tra trạng thái, nội dung giải quyết và người phụ trách đang hoạt động.' : undefined
      showApiError(friendlyMessage ? { cause: error, friendlyMessage } : error, 'xử lý khiếu nại', text => { void message.error(text) })
    } finally {
      submitting.current = false
    }
  }
  const overview = <Flex vertical gap={16}>
    <Descriptions size="small" column={1} bordered items={[
      { key: 'customer', label: 'Khách hàng', children: customer ? `${customer.full_name} · ${customer.email}${customer.phone ? ` · ${customer.phone}` : ''}` : `Khách hàng #${complaint.customer_id}` },
      { key: 'type', label: 'Lý do khiếu nại', children: complaint.complaint_type },
      { key: 'created', label: 'Thời gian tạo', children: complaintDate(complaint.created_at) },
      { key: 'updated', label: 'Cập nhật', children: complaintDate(complaint.updated_at) },
      { key: 'staff', label: 'Người phụ trách', children: complaint.assigned_staff?.full_name || (complaint.assigned_to ? `Nhân viên #${complaint.assigned_to}` : 'Chưa phân công') },
    ]} />
    <Card size="small" title="Nội dung chi tiết"><Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginBottom: 0 }}>{complaint.description}</Typography.Paragraph></Card>
    {complaint.image_urls?.length > 0 && <Card size="small" title="Hình ảnh đính kèm"><Image.PreviewGroup><Flex gap={10} wrap>{complaint.image_urls.map((url, index) => <div key={`${url}-${index}`} style={{ padding: 6, border: '1px solid var(--mcms-border)', borderRadius: 6, background: 'var(--mcms-surface-muted)' }}><Image src={url} alt={`Bằng chứng khiếu nại ${index + 1}`} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }} /></div>)}</Flex></Image.PreviewGroup></Card>}
    {complaint.resolution && <Alert type="info" title="Kết quả giải quyết" description={<span style={{ whiteSpace: 'pre-wrap' }}>{complaint.resolution}</span>} />}
    {canListUsers && <ComplaintHandling complaint={complaint} users={users} usersFailed={usersFailed} pending={action.isPending} onAssign={assignedTo => submit({ kind: 'assign', payload: { assignedTo } })} onDecision={payload => submit({ kind: 'status', payload })} />}

  </Flex>
  const conversation = <Card size="small" title={`Lịch sử trao đổi${complaint.replies.length > 0 ? ` (${complaint.replies.length})` : ''}`}>
      <Typography.Paragraph type="secondary">Quản trị viên chỉ theo dõi lịch sử trao đổi giữa khách hàng và nhân viên vận hành.</Typography.Paragraph>
      {complaint.replies.length ? <Flex vertical gap={12}>{[...complaint.replies].sort((a, b) => (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0) || a.reply_id - b.reply_id).map(reply => <div key={reply.reply_id} style={{ padding: 12, border: '1px solid var(--mcms-border)', borderRadius: 6, background: reply.sender_role_id === 3 ? 'var(--mcms-surface)' : 'var(--mcms-surface-muted)' }}>
        <Space wrap><Typography.Text strong>{reply.sender_name}</Typography.Text><Typography.Text type="secondary">{reply.sender_role_id === 3 ? 'Khách hàng' : reply.sender_role_id === 1 ? 'Quản trị viên' : reply.sender_role_id === 2 ? 'Nhân viên vận hành' : 'Người dùng'}</Typography.Text></Space>
        <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{complaintDate(reply.created_at)}</Typography.Text></div>
        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{reply.message}</Typography.Paragraph>
      </div>)}</Flex> : <Empty description="Chưa có trao đổi" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Card>
  return <Flex vertical gap={16}>
    <Space wrap><Typography.Text strong>Đơn hàng #{complaint.order_id}</Typography.Text><ComplaintStatusBadge status={complaint.status} /></Space>
    <Tabs items={[{ key: 'overview', label: 'Thông tin & Xử lý', children: overview }, { key: 'conversation', label: `Trao đổi${complaint.replies.length > 0 ? ` (${complaint.replies.length})` : ''}`, children: conversation }]} />
  </Flex>
}

interface HandlingProps {
  complaint: ComplaintDetail
  users: UserWithRole[]
  usersFailed: boolean
  pending: boolean
  onAssign: (assignedTo: number) => Promise<void>
  onDecision: (payload: StatusPayload) => Promise<void>
}

function ComplaintHandling({ complaint, users, usersFailed, pending, onAssign, onDecision }: HandlingProps) {
  const [mode, setMode] = useState<'assign' | 'decide'>('assign')
  const assignment = <AssignmentForm key={mode} complaint={complaint} users={users} usersFailed={usersFailed} pending={pending} onAssign={onAssign} />
  if (complaint.status === 'PENDING') {
    return <Card size="small" title="Hướng xử lý khiếu nại">
      <Segmented block aria-label="Hướng xử lý khiếu nại" value={mode} disabled={pending} options={[
        { label: 'Phân công nhân viên xử lý', value: 'assign' },
        { label: 'Tự quyết định ngay', value: 'decide' },
      ]} onChange={value => setMode(value as 'assign' | 'decide')} style={{ marginBottom: 16 }} />
      {mode === 'assign' ? assignment : <AdminDecisionForm key={mode} embedded complaint={complaint} pending={pending} onSubmit={onDecision} />}
    </Card>
  }
  if (isFinalComplaint(complaint.status)) return <AdminDecisionForm complaint={complaint} pending={pending} onSubmit={onDecision} />
  const staffName = complaint.assigned_staff?.full_name || users.find(user => user.user_id === complaint.assigned_to)?.full_name
  return <Flex vertical gap={16}>
    <Alert type="info" showIcon title={staffName
      ? `Đang được ${staffName} tiếp nhận và xử lý. Quản trị viên theo dõi tiến độ và lịch sử trao đổi tại đây.`
      : 'Khiếu nại đang trong quá trình xử lý. Quản trị viên theo dõi tiến độ và lịch sử trao đổi tại đây.'} />
    <Card size="small" title="Phân công xử lý">{assignment}</Card>
  </Flex>
}

function AssignmentForm({ complaint, users, usersFailed, pending, onAssign }: Omit<HandlingProps, 'onDecision'>) {
  const [form] = Form.useForm<{ assignedTo?: number }>()
  const assignedTo = Form.useWatch('assignedTo', form)
  const hasDraft = assignedTo != null && assignedTo !== complaint.assigned_to
  const staff = users.filter(user => user.status === 'ACTIVE' && user.role_id === 2)
  if (usersFailed) return <Alert type="warning" title="Không tải được danh sách tài khoản. Vui lòng tải lại trang trước khi phân công." />
  return <Form form={form} layout="vertical" initialValues={{ assignedTo: complaint.assigned_to ?? undefined }} disabled={pending} onFinish={values => {
    if (values.assignedTo != null && values.assignedTo !== complaint.assigned_to) void onAssign(values.assignedTo)
  }}>
    <Flex gap={10} align="end" wrap>
      <Form.Item name="assignedTo" label="Người phụ trách" rules={[{ required: true, message: 'Vui lòng chọn nhân viên vận hành.' }]} style={{ flex: '1 1 240px', marginBottom: 0 }}>
        <Select allowClear={complaint.assigned_to == null} placeholder="Chọn nhân viên vận hành" showSearch optionFilterProp="label" options={staff.map(user => ({ value: user.user_id, label: user.full_name }))} />
      </Form.Item>
      <Button type={complaint.status === 'PENDING' ? 'primary' : 'default'} htmlType="submit" disabled={!hasDraft || pending} loading={pending}>{complaint.assigned_to != null ? 'Đổi người phụ trách' : 'Phân công'}</Button>
      {hasDraft && <Button type="default" disabled={pending} onClick={() => form.resetFields()}>Hủy</Button>}
    </Flex>
  </Form>
}

function AdminDecisionForm({ complaint, pending, onSubmit, embedded = false }: {
  embedded?: boolean
  complaint: ComplaintDetail
  pending: boolean
  onSubmit: (payload: StatusPayload) => Promise<void>
}) {
  const [form] = Form.useForm<StatusPayload>()
  const decisions: NonNullable<StatusPayload['status']>[] = complaint.status === 'PENDING'
    ? ['RESOLVED', 'REJECTED']
    : complaint.status === 'RESOLVED' ? ['CLOSED']
      : []
  const reopenStatus = complaint.assigned_to != null ? 'UNDER_REVIEW' : 'PENDING'
  const content = <>
    {decisions.length > 0 && <Form form={form} layout="vertical" disabled={pending} onFinish={values => {
      if (!values.status || !decisions.includes(values.status)) return
      void onSubmit({ status: values.status, resolution: values.resolution?.trim() })
    }}>
      <Form.Item name="status" label="Quyết định xử lý" rules={[{ required: true, message: 'Vui lòng chọn quyết định xử lý.' }]}>
        <Select allowClear placeholder="Chọn quyết định xử lý" options={decisions.map(value => ({ value, label: COMPLAINT_STATUSES[value].label }))} />
      </Form.Item>
      <Form.Item name="resolution" label="Nội dung giải quyết / Lý do" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập nội dung giải quyết / lý do.' }, { max: 10000, message: 'Tối đa 10.000 ký tự.' }]}>
        <Input.TextArea rows={3} maxLength={10000} showCount />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={pending} disabled={pending}>{complaint.status === 'RESOLVED' ? 'Đóng khiếu nại' : 'Cập nhật trạng thái'}</Button>
    </Form>}
    {isFinalComplaint(complaint.status) && <Popconfirm title="Mở lại khiếu nại?" description={`Khiếu nại sẽ chuyển về trạng thái ${COMPLAINT_STATUSES[reopenStatus].label.toLocaleLowerCase('vi-VN')}.`} okText="Mở lại" cancelText="Hủy" disabled={pending} onConfirm={() => onSubmit({ status: reopenStatus })}>
      <Button style={{ marginTop: decisions.length ? 16 : 0 }} disabled={pending} loading={pending}>Mở lại khiếu nại</Button>
    </Popconfirm>}
  </>
  return embedded ? content : <Card size="small" title="Trạng thái & kết quả xử lý">{content}</Card>
}
