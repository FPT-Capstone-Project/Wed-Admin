import { Alert, Button, Flex, Input, Segmented, Select, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { PageHeader, StatCard, StatGrid } from '../../shared/ui'
import { DataTable } from '../../shared/ui/DataTable'
import { LoadErrorAlert } from '../../shared/ui/LoadErrorAlert'
import { useAuthStore } from '../auth/store/auth.store'
import { useUsers } from '../users/hooks/useUsers'
import { ComplaintDetailDrawer } from './components/ComplaintDetailDrawer'
import { ComplaintStatusBadge } from './components/ComplaintStatusBadge'
import { complaintDate, isFinalComplaint, STATUS_OPTIONS } from './complaint-status'
import { useComplaints, useComplaintSummary, useComplaintNotificationSync } from './useComplaints'
import type { Complaint, ComplaintQuery, ComplaintStatus } from './complaint.types'

export function ComplaintsPage() {
  useComplaintNotificationSync()
  const [status, setStatus] = useState<ComplaintStatus>()
  const [queue, setQueue] = useState<ComplaintQuery['queue']>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)
  const isAdmin = useAuthStore(state => state.user?.roleId === 1)
  const usersQuery = useUsers({}, { enabled: isAdmin, staleTime: 60_000 })
  const users = usersQuery.data ?? []
  const usersById = useMemo(() => new Map(usersQuery.data?.map(user => [user.user_id, user])), [usersQuery.data])
  const list = useComplaints({ page, pageSize: 20, status, ...(!isAdmin && queue ? { queue } : {}) }, false)
  const summary = useComplaintSummary()
  const filtered = useMemo(() => {
    const term = search.toLocaleLowerCase('vi-VN').replace(/^#/, '')
    return (list.data?.data ?? []).filter(row => {
      if (isAdmin && queue) {
        const ended = isFinalComplaint(row.status) || row.resolved_at != null
        if (queue === 'RESPONDED' ? !ended : ended || (queue === 'UNASSIGNED' ? row.assigned_to != null : row.assigned_to == null)) return false
      }
      const customer = usersById.get(row.customer_id)
      return [row.complaint_id, row.order_id, row.customer_id, row.complaint_type, row.description, customer?.full_name, customer?.email, customer?.phone]
        .some(value => value != null && String(value).toLocaleLowerCase('vi-VN').includes(term))
    })
  }, [list.data, search, usersById, isAdmin, queue])
  const activeQuery = list
  const data = filtered
  const total = list.data?.total ?? 0
  const counts = summary.data
  const reload = () => {
    void activeQuery.refetch()
    void summary.refetch()
    if (isAdmin) void usersQuery.refetch()
  }
  return <div>
    <PageHeader
      title="Quản lý Khiếu nại"
      description="Theo dõi, phân công và xử lý các khiếu nại đơn hàng từ khách hàng."
    />
    <StatGrid columns={4}>
      <StatCard title="Tổng khiếu nại" value={counts?.total.toLocaleString('vi-VN') ?? '—'} description="Tất cả khiếu nại ghi nhận" loading={summary.isPending} />
      <StatCard title="Mới tạo" value={counts?.open.toLocaleString('vi-VN') ?? '—'} tone="danger" description="Chờ tiếp nhận và phân công" loading={summary.isPending} />
      <StatCard title="Đang xử lý" value={counts?.processing.toLocaleString('vi-VN') ?? '—'} tone="info" description="Đang xử lý và chờ khách hàng bổ sung" loading={summary.isPending} />
      <StatCard title="Đã kết thúc" value={counts?.closed.toLocaleString('vi-VN') ?? '—'} tone="ok" description="Đã giải quyết và từ chối" loading={summary.isPending} />
    </StatGrid>
    {summary.isError && <LoadErrorAlert error={summary.error} resource="thống kê khiếu nại" onRetry={summary.refetch} />}
    {usersQuery.isError && <Alert type="warning" showIcon title="Không tải được danh mục tài khoản; thông tin khách và người phụ trách tạm hiển thị bằng mã." style={{ marginBottom: 12 }} />}
    <Flex gap={12} wrap style={{ marginBottom: 16 }}>
      <Input.Search aria-label="Tìm kiếm khiếu nại" placeholder="Mã khiếu nại, đơn hàng, khách hàng, nội dung" allowClear onSearch={value => { setSearch(value.trim()); setPage(1) }} style={{ width: 380, maxWidth: '100%' }} />
      <Select aria-label="Trạng thái khiếu nại" placeholder="Tất cả trạng thái" value={status} allowClear options={STATUS_OPTIONS} onChange={value => { setStatus(value); setPage(1) }} style={{ width: 280, maxWidth: '100%' }} />
      <Button icon={<ReloadOutlined />} loading={activeQuery.isFetching || summary.isFetching} onClick={reload}>Tải lại</Button>
    </Flex>
    <Segmented aria-label="Hàng đợi khiếu nại" value={queue ?? 'ALL'} options={[
      { label: 'Tất cả', value: 'ALL' }, { label: 'Chưa phân công', value: 'UNASSIGNED' },
      { label: 'Đã phân công', value: 'ASSIGNED' }, { label: 'Đã kết thúc', value: 'RESPONDED' },
    ]} onChange={value => { setQueue(value === 'ALL' ? undefined : value as ComplaintQuery['queue']); setPage(1) }} style={{ marginBottom: 12, maxWidth: '100%', overflowX: 'auto' }} />
    {(search || (isAdmin && queue)) && <Typography.Paragraph type="secondary">Bộ lọc hàng đợi của quản trị viên và tìm kiếm chỉ áp dụng trên trang hiện tại. Phân trang hiển thị tổng số bản ghi trước các bộ lọc này.</Typography.Paragraph>}
    {activeQuery.isError ? <LoadErrorAlert error={activeQuery.error} resource="danh sách khiếu nại" onRetry={activeQuery.refetch} /> : <DataTable<Complaint>
      rowKey="complaint_id" dataSource={data} loading={activeQuery.isLoading} isFetching={activeQuery.isFetching} scrollX={null} tableLayout="fixed"
      onRow={row => ({ onClick: () => setSelected(row.complaint_id), style: { cursor: 'pointer' } })}
      emptyTitle="Chưa có khiếu nại phù hợp" pagination={{ current: page, pageSize: 20, total, showSizeChanger: false, onChange: setPage }}
      columns={[
        { title: 'Mã khiếu nại', key: 'id', width: 130, render: (_, row) => <><Typography.Text strong>#{row.complaint_id}</Typography.Text><div>Đơn #{row.order_id}</div></> },
        { title: 'Khách hàng', key: 'customer', width: 235, render: (_, row) => { const customer = usersById.get(row.customer_id); return <Flex vertical gap={2} style={{ minWidth: 0 }}><Typography.Text strong ellipsis={{ tooltip: true }}>{customer?.full_name || `Khách hàng #${row.customer_id}`}</Typography.Text>{customer ? <><Typography.Text type="secondary" ellipsis={{ tooltip: customer.email }} style={{ whiteSpace: 'nowrap' }}>{customer.email}</Typography.Text><Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{customer.phone || 'Chưa ghi nhận SĐT'}</Typography.Text></> : null}</Flex> } },
        { title: 'Nội dung / Lý do', key: 'description', width: 250, ellipsis: true, render: (_, row) => <><Typography.Text strong>{row.complaint_type}</Typography.Text><Typography.Paragraph ellipsis={{ rows: 2, tooltip: row.description }} style={{ margin: 0 }}>{row.description}</Typography.Paragraph></> },
        { title: 'Trạng thái', key: 'status', width: 175, render: (_, row) => <ComplaintStatusBadge status={row.status} /> },
        { title: 'Người phụ trách', key: 'staff', width: 140, render: (_, row) => row.assigned_to ? usersById.get(row.assigned_to)?.full_name || `Nhân viên #${row.assigned_to}` : 'Chưa phân công' },
        { title: 'Thời gian tạo', dataIndex: 'created_at', width: 140, render: complaintDate },
        { title: 'Thao tác', key: 'action', width: 110, render: (_, row) => <Button type="link" size="small" onClick={event => { event.stopPropagation(); setSelected(row.complaint_id) }}>Xem chi tiết</Button> },
      ]}
    />}
    <ComplaintDetailDrawer id={selected} onClose={() => setSelected(null)} users={users} canListUsers={isAdmin} usersFailed={usersQuery.isError} />
  </div>
}
