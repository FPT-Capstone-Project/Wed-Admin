import { App, Alert, Button, Card, Descriptions, Drawer, Empty, Flex, Form, Image, Input, Select, Skeleton, Space, Tabs, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { UserWithRole } from '../../../types/user.types'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { showApiError } from '../../../shared/api/error-mapper'
import { useComplaintAction, useComplaintDetail } from '../useComplaints'
import { complaintDate, isFinalComplaint, STATUS_OPTIONS } from '../complaint-status'
import type { ComplaintDetail, ComplaintStatus } from '../complaint.types'
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
      : query.data && <ComplaintDetailContent key={query.data.complaint_id} complaint={query.data} users={users} canListUsers={canListUsers} usersFailed={usersFailed} />}
  </Drawer>
}

function ComplaintDetailContent({ complaint, users, canListUsers, usersFailed }: { complaint: ComplaintDetail } & Pick<Props, 'users' | 'canListUsers' | 'usersFailed'>) {
  const action = useComplaintAction(complaint.complaint_id)
  const { message } = App.useApp()
  const [assignForm] = Form.useForm<{ assignedTo: number | null }>()
  const [statusForm] = Form.useForm<{ status: ComplaintStatus; resolution?: string }>()
  const [replyForm] = Form.useForm<{ message: string }>()
  const targetStatus = Form.useWatch('status', statusForm)
  const assignedTo = Form.useWatch('assignedTo', assignForm)
  const closed = isFinalComplaint(complaint.status)
  const customer = users.find(user => user.user_id === complaint.customer_id)
  const staff = users.filter(user => user.status === 'ACTIVE' && [1, 2].includes(user.role_id))
  async function submit(value: Parameters<typeof action.mutateAsync>[0], done?: () => void) {
    try {
      await action.mutateAsync(value)
      done?.()
      void message.success(value.kind === 'reply' ? 'Đã gửi phản hồi.' : value.kind === 'assign' ? 'Đã cập nhật phân công.' : 'Đã cập nhật trạng thái.')
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      const friendlyMessage = status === 409 ? 'Khiếu nại đã thay đổi hoặc đã đóng. Vui lòng tải lại trước khi tiếp tục.'
        : status === 400 ? 'Thông tin xử lý chưa hợp lệ. Kiểm tra trạng thái, nội dung giải quyết và người phụ trách đang hoạt động.' : undefined
      showApiError(friendlyMessage ? { cause: error, friendlyMessage } : error, 'xử lý khiếu nại', text => { void message.error(text) })
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
    <Card size="small" title="Phân công xử lý">
      {!canListUsers ? <Typography.Text type="secondary">Chỉ quản trị viên có quyền tra cứu danh sách tài khoản để phân công. Người phụ trách hiện tại hiển thị ở trên.</Typography.Text>
        : usersFailed ? <Alert type="warning" title="Không tải được danh sách tài khoản. Vui lòng tải lại trang trước khi phân công." />
          : <Form form={assignForm} layout="vertical" initialValues={{ assignedTo: complaint.assigned_to }} disabled={action.isPending} onFinish={values => void submit({ kind: 'assign', payload: { assignedTo: values.assignedTo ?? null } })}>
            <Flex gap={10} align="end">
              <Form.Item name="assignedTo" label="Người phụ trách" style={{ flex: 1, marginBottom: 0 }}><Select allowClear disabled={action.isPending} placeholder="Chưa phân công" showSearch optionFilterProp="label" options={staff.map(user => ({ value: user.user_id, label: `${user.full_name} · ${user.role_id === 1 ? 'Quản trị viên' : 'Vận hành trang trại'}` }))} /></Form.Item>
              <Button type="default" htmlType="submit" disabled={(assignedTo ?? null) === (complaint.assigned_to ?? null)} loading={action.isPending}>Phân công</Button>
            </Flex>
          </Form>}
    </Card>
    <Card size="small" title="Trạng thái & kết quả xử lý">
      <Form form={statusForm} layout="vertical" initialValues={{ status: complaint.status, resolution: complaint.resolution ?? '' }} disabled={action.isPending} onFinish={values => void submit({ kind: 'status', payload: { status: values.status, ...(values.resolution?.trim() ? { resolution: values.resolution.trim() } : {}) } })}>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true, message: 'Vui lòng chọn trạng thái.' }]}><Select options={STATUS_OPTIONS} /></Form.Item>
        <Form.Item name="resolution" label="Nội dung giải quyết / Lý do" rules={[{ required: targetStatus != null && isFinalComplaint(targetStatus), whitespace: true, message: 'Nhập nội dung giải quyết khi kết thúc khiếu nại.' }, { max: 10000, message: 'Tối đa 10.000 ký tự.' }]}><Input.TextArea rows={3} maxLength={10000} showCount /></Form.Item>
        <Button type="primary" htmlType="submit" loading={action.isPending}>Cập nhật trạng thái</Button>
      </Form>
    </Card>
  </Flex>
  const conversation = <Card size="small" title={`Lịch sử trao đổi${complaint.replies.length > 0 ? ` (${complaint.replies.length})` : ''}`}>
      {complaint.replies.length ? <Flex vertical gap={12}>{complaint.replies.map(reply => <div key={reply.reply_id} style={{ padding: 12, border: '1px solid var(--mcms-border)', borderRadius: 6, background: reply.sender_role_id === 3 ? 'var(--mcms-surface)' : 'var(--mcms-surface-muted)' }}>
        <Space wrap><Typography.Text strong>{reply.sender_name}</Typography.Text><Typography.Text type="secondary">{reply.sender_role_id === 3 ? 'Khách hàng' : reply.sender_role_id === 1 ? 'Quản trị viên' : 'Vận hành trang trại'}</Typography.Text></Space>
        <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{complaintDate(reply.created_at)}</Typography.Text></div>
        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{reply.message}</Typography.Paragraph>
      </div>)}</Flex> : <Empty description="Chưa có trao đổi" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {closed ? <Alert style={{ marginTop: 16 }} type="info" title="Khiếu nại đã đóng, không thể gửi thêm phản hồi." /> : <Form form={replyForm} layout="vertical" style={{ marginTop: 16 }} disabled={action.isPending} onFinish={values => void submit({ kind: 'reply', payload: { message: values.message.trim() } }, () => replyForm.resetFields())}>
        <Form.Item name="message" label="Nội dung phản hồi" rules={[{ required: true, whitespace: true, message: 'Nhập nội dung phản hồi.' }, { max: 10000, message: 'Tối đa 10.000 ký tự.' }]}><Input.TextArea rows={3} maxLength={10000} showCount /></Form.Item>
        <Button type="primary" htmlType="submit" loading={action.isPending}>Gửi phản hồi</Button>
      </Form>}
    </Card>
  return <Flex vertical gap={16}>
    <Space wrap><Typography.Text strong>Đơn hàng #{complaint.order_id}</Typography.Text><ComplaintStatusBadge status={complaint.status} /></Space>
    <Tabs items={[{ key: 'overview', label: 'Thông tin & Xử lý', children: overview }, { key: 'conversation', label: `Trao đổi${complaint.replies.length > 0 ? ` (${complaint.replies.length})` : ''}`, children: conversation }]} />
  </Flex>
}
