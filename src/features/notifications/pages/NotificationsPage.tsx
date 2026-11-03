import { useMemo, useState } from 'react'
import { BellOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Col, Flex, Input, Row, Select, Skeleton, Typography } from 'antd'
import {
  DataTable,
  MetadataBadge,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../../../shared/ui'
import { useNotifications, useNotificationActions } from '../hooks/useNotifications'
import type { AppNotification } from '../types/notification.types'

const READ_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNREAD', label: 'Chưa đọc' },
  { value: 'READ', label: 'Đã đọc' },
]

const TYPE_LABELS: Record<string, string> = {
  CULTIVATION_STARTED: 'Bắt đầu canh tác',
  CULTIVATION_PROGRESS: 'Tiến độ canh tác',
  CULTIVATION_COMPLETED: 'Hoàn thành canh tác',
  CULTIVATION_CANCELLED: 'Hủy canh tác',
  MUSHROOM_DISEASE: 'Nấm bệnh / mốc',
  DEVICE_ISSUE: 'Sự cố thiết bị',
  OPERATOR_MESSAGE: 'Thông báo từ nhân viên',
  PAYMENT_STATUS: 'Trạng thái thanh toán',
}

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FMT.format(date)
}

export function NotificationsPage() {
  const { read, readAll, pending } = useNotificationActions()
  const [searchText, setSearchText] = useState('')
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const query = useMemo(
    () => ({
      isRead: readFilter === 'ALL' ? undefined : readFilter === 'READ',
      page,
      pageSize,
    }),
    [page, pageSize, readFilter],
  )

  const { data, isLoading, isError, error, refetch } = useNotifications(query)

  const items = useMemo(() => data?.items ?? [], [data])
  const pagination = data?.pagination

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((item) =>
      [item.title, item.message, item.notification_type]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    )
  }, [items, searchText])

  return (
    <div>
      <PageHeader
        title="Thông báo"
        description="Danh sách thông báo của tài khoản đang đăng nhập."
        actions={
          <Flex gap={8}><Button loading={readAll.isPending} disabled={pending || !data?.unreadCount} onClick={() => readAll.mutate()}>Đánh dấu tất cả đã đọc</Button><MetadataBadge
            label={`${data?.unreadCount ?? 0} chưa đọc`}
            icon={<BellOutlined />}
          /></Flex>
        }
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <Col xs={12} lg={8}>
          <StatCard
            title="Tổng thông báo"
            value={pagination?.total ?? items.length}
            tone="neutral"
            description="Theo bộ lọc của tài khoản"
          />
        </Col>
        <Col xs={12} lg={8}>
          <StatCard
            title="Chưa đọc"
            value={data?.unreadCount ?? 0}
            tone="info"
            highlightValue
            description="Thông báo chưa đọc của tài khoản"
          />
        </Col>
        <Col xs={24} lg={8}>
          <Flex gap={12} wrap style={{ marginBottom: 12 }}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm nội dung thông báo"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              style={{ width: 260, maxWidth: '100%' }}
            />
            <Select
              value={readFilter}
              options={READ_OPTIONS}
              onChange={(value) => {
                setReadFilter(value)
                setPage(1)
              }}
              style={{ width: 170 }}
            />
          </Flex>
        </Col>
      </Row>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <DataTable<AppNotification>
          rowKey="notification_id"
          onRow={item => ({
            onClick: event => {
              if (event.target instanceof Element && event.target.closest('button')) return
              if (!item.is_read && !pending) read.mutate(item.notification_id)
            },
            style: { cursor: item.is_read ? 'default' : 'pointer' },
          })}
          dataSource={filteredItems}
          loading={false}
          scrollX={760}
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total ?? filteredItems.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Tổng ${total} thông báo`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage)
              setPageSize(nextPageSize)
            },
          }}
          columns={[
            {
              title: 'Trạng thái',
              dataIndex: 'is_read',
              key: 'is_read',
              width: 110,
              render: (isRead: boolean) => (
                <StatusBadge
                  tone={isRead ? 'muted' : 'info'}
                  label={isRead ? 'Đã đọc' : 'Chưa đọc'}
                />
              ),
            },
            {
              title: 'Loại',
              dataIndex: 'notification_type',
              key: 'notification_type',
              width: 190,
              render: (type: string) => (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {TYPE_LABELS[type] ?? type}
                </Typography.Text>
              ),
            },
            {
              title: 'Nội dung',
              key: 'content',
              render: (_, item) => (
                <Flex vertical gap={2}>
                  <Button type="link" disabled={item.is_read || pending} onClick={() => read.mutate(item.notification_id)} style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }}>{item.title ?? 'Thông báo'}</Button>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.message ?? '—'}
                  </Typography.Text>
                </Flex>
              ),
            },
            {
              title: 'Thời gian',
              dataIndex: 'created_at',
              key: 'created_at',
              width: 150,
              render: (value: string | null) => (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {fmtDate(value)}
                </Typography.Text>
              ),
            },
          ]}
          error={
            isError
              ? {
                  message:
                    error?.message ??
                    'Không tải được danh sách thông báo. Lỗi không xác định.',
                }
              : undefined
          }
          onRetry={() => void refetch()}
          emptyTitle="Không có thông báo nào"
          emptyDescription="Thông báo sẽ xuất hiện khi có sự kiện trong hệ thống."
        />
      )}
    </div>
  )
}
