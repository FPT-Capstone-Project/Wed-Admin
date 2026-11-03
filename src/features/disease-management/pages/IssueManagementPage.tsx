import { Suspense, useState } from 'react'
import { Button, Flex, InputNumber, Select, Table, Tag } from 'antd'
import { PageHeader } from '../../../shared/ui'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import { auditDate } from '../../../shared/ui/audit-format'
import { ISSUE_STATUSES, type IssueQuery, type Issue } from '../api/issues.api'
import { useIssues } from '../api/issues.queries'
import { IssueDetailDrawer } from '../../../app/router/lazy-modals'
export function IssueManagementPage() {
  const [filters, setFilters] = useState<IssueQuery>({ page: 1, pageSize: 20 })
  const [selected, setSelected] = useState<number | null>(null)
  const query = useIssues(filters)
  return <div><PageHeader title="Sự cố & Bệnh hại" description="Giám sát bệnh học, điều phối chuyên gia và duyệt kết quả điều trị." />
    <Flex gap={12} wrap style={{ marginBottom: 16 }}>
      <Select aria-label="Trạng thái ca bệnh" placeholder="Trạng thái" allowClear style={{ width: 200 }} options={ISSUE_STATUSES.map(value => ({ value, label: value }))} onChange={status => setFilters({ ...filters, status, page: 1 })} />
      <Select aria-label="Mức độ nghiêm trọng" placeholder="Mức độ nghiêm trọng" allowClear style={{ width: 200 }} options={['HIGH', 'MEDIUM', 'LOW'].map(value => ({ value, label: value }))} onChange={severity => setFilters({ ...filters, severity, page: 1 })} />
      <InputNumber aria-label="Mã phiên canh tác" placeholder="Mã phiên" min={1} precision={0} onChange={value => setFilters({ ...filters, sessionId: value == null ? undefined : Number(value), page: 1 })} />
    </Flex>
    <QueryFeedback query={query} />
    {!query.isError && <Table<Issue> size="small" rowKey="issue_id" loading={query.isLoading} dataSource={query.data?.data} scroll={{ x: 950 }} locale={{ emptyText: 'Không có sự cố phù hợp bộ lọc' }} pagination={{ current: filters.page, pageSize: filters.pageSize, total: query.data?.pagination.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (page, pageSize) => setFilters({ ...filters, page: pageSize !== filters.pageSize ? 1 : page, pageSize }) }} columns={[
      { title: 'Mã ca', dataIndex: 'issue_id', render: value => <code>{value}</code> },
      { title: 'Tên sự cố', dataIndex: 'title' },
      { title: 'Mức độ', dataIndex: 'severity', render: (value: Issue['severity']) => <Tag color={{ HIGH: 'red', MEDIUM: 'orange', LOW: 'blue' }[value]}>{value}</Tag> },
      { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag>{value}</Tag> },
      { title: 'Thời gian tạo', dataIndex: 'created_at', render: auditDate },
      { title: 'Thao tác', render: (_, issue) => <Button onClick={() => setSelected(issue.issue_id)}>Hồ sơ / Điều phối</Button> },
    ]} />}
    {selected !== null && (
      <Suspense fallback={null}>
        <IssueDetailDrawer
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      </Suspense>
    )}
  </div>
}
