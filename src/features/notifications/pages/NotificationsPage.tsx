/**
 * Trang "Thông báo" — danh sách thông báo hệ thống của tài khoản Admin.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/notifications` (BE tự phân trang server-side).
 *   - Bộ lọc **trạng thái đọc** (`isRead`) → gửi lên BE.
 *   - Bộ lọc **loại** + tìm kiếm → lọc ở client vì BE chưa hỗ trợ
 *     tham số `type` cho endpoint này (xem `notification.api.ts`).
 *
 * ⚠ Phân loại hoàn toàn dựa trên `notification_type` của BE (xem
 *   `notification-status.config.ts`) — KHÔNG suy đoán từ nội dung.
 *   - Cột "Loại" chỉ hiển thị **1 Tag duy nhất**.
 *   - Chỉ cảnh báo IoT mới được tô nền hàng; các loại khác nền trắng.
 */
import { useMemo, useState } from 'react'
import {
  BellOutlined,
  BugOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  Button,
  Col,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Row,
  Select,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  ActionButton,
  DataTable,
  MetadataBadge,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../../../shared/ui'
import { formatDate, formatRelativeTime } from '../../../shared/utils/date'
import { useNotifications, useNotificationActions } from '../hooks/useNotifications'
import type { AppNotification } from '../types/notification.types'
import {
  isIotDangerAlert,
  NOTIFICATION_CATEGORY_META,
  notificationCategory,
  notificationCategoryMeta,
  notificationTypeLabel,
  type NotificationCategory,
} from '../components/notification-status.config'
import { REFERENCE_TYPE_DICTIONARY } from '../../../shared/i18n/status/reference'
import { statusLabel } from '../../../shared/i18n/status/registry'
import '../notifications-industrial.css'

type ReadFilter = 'ALL' | 'UNREAD' | 'READ'

const READ_OPTIONS: Array<{ value: ReadFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNREAD', label: 'Chưa đọc' },
  { value: 'READ', label: 'Đã đọc' },
]

/** Bộ lọc theo **nhóm hiển thị** (dựa trực tiếp trên `notification_type`). */
type TypeFilter = 'ALL' | NotificationCategory

const TYPE_FILTER_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả loại' },
  { value: 'iot', label: NOTIFICATION_CATEGORY_META.iot.label },
  { value: 'cultivation', label: NOTIFICATION_CATEGORY_META.cultivation.label },
  { value: 'system', label: NOTIFICATION_CATEGORY_META.system.label },
]

/** Icon tương ứng với nhóm hiển thị. */
function CategoryIcon({ category }: { category: NotificationCategory }) {
  if (category === 'iot') return <WarningOutlined />
  if (category === 'cultivation') return <BugOutlined />
  return <BellOutlined />
}

export function NotificationsPage() {
  const { read, readAll, pending } = useNotificationActions()
  const [searchText, setSearchText] = useState('')
  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [detail, setDetail] = useState<AppNotification | null>(null)

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

    return items.filter((item) => {
      // Lọc theo nhóm — suy ra trực tiếp từ `notification_type` của BE.
      if (typeFilter !== 'ALL') {
        if (notificationCategory(item.notification_type) !== typeFilter) {
          return false
        }
      }

      if (!keyword) return true

      return [item.title, item.message, item.notification_type]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword))
    })
  }, [items, searchText, typeFilter])

  const openDetail = (item: AppNotification) => {
    setDetail(item)
    // Mở chi tiết ⇒ coi như đã đọc (giống hành vi app khách hàng).
    if (!item.is_read && !pending) read.mutate(item.notification_id)
  }

  /** Nhóm hiển thị của thông báo đang mở trong Drawer. */
  const detailMeta = useMemo(
    () =>
      detail ? notificationCategoryMeta(detail.notification_type) : null,
    [detail],
  )
  const detailCategory = useMemo(
    () =>
      detail ? notificationCategory(detail.notification_type) : ('system' as const),
    [detail],
  )

  return (
    <div className="mcms-notifications-view">
      <PageHeader
        title="Thông báo"
        description="Danh sách thông báo của tài khoản đang đăng nhập."
        actions={
          <Flex gap={8} align="center" wrap>
            <MetadataBadge
              label={`${data?.unreadCount ?? 0} chưa đọc`}
              icon={<BellOutlined />}
            />
            <Button
              loading={readAll.isPending}
              disabled={pending || !data?.unreadCount}
              onClick={() => readAll.mutate()}
            >
              Đánh dấu tất cả đã đọc
            </Button>
          </Flex>
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
          <Flex vertical gap={8} style={{ marginBottom: 12 }}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm nội dung thông báo"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              style={{ width: '100%', maxWidth: 320 }}
            />
            <Flex gap={8} wrap>
              <Select<ReadFilter>
                value={readFilter}
                options={READ_OPTIONS}
                onChange={(value) => {
                  setReadFilter(value)
                  setPage(1)
                }}
                style={{ width: 140 }}
              />
              <Select<TypeFilter>
                value={typeFilter}
                options={TYPE_FILTER_OPTIONS}
                onChange={(value) => {
                  setTypeFilter(value)
                  setPage(1)
                }}
                style={{ width: 200 }}
              />
            </Flex>
          </Flex>
        </Col>
      </Row>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <DataTable<AppNotification>
          rowKey="notification_id"
          rowClassName={(item) => {
            const classes: string[] = []
            if (!item.is_read) classes.push('mcms-notification-row-unread')
            // ⚠ Chỉ cảnh báo IoT mới tô nền hàng — các loại khác nền trắng.
            if (isIotDangerAlert(item.notification_type)) {
              classes.push('mcms-notification-row-iot')
            }
            return classes.join(' ')
          }}
          dataSource={filteredItems}
          loading={false}
          scrollX={860}
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
              width: 120,
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
              width: 230,
              render: (type: string) => {
                const category = notificationCategory(type)
                const meta = notificationCategoryMeta(type)

                // ⚠ CHỈ 1 Tag duy nhất — không chèn dòng phụ.
                return (
                  <Tag
                    color={meta.color ?? undefined}
                    icon={<CategoryIcon category={category} />}
                    title={meta.description}
                  >
                    {meta.label}
                  </Tag>
                )
              },
            },
            {
              title: 'Nội dung',
              key: 'content',
              render: (_, item) => (
                <Flex vertical gap={2}>
                  <Typography.Text
                    strong={!item.is_read}
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {item.title ?? notificationTypeLabel(item.notification_type)}
                  </Typography.Text>
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
              width: 170,
              render: (value: string | null) => {
                const relative = formatRelativeTime(value)
                return (
                  <Tooltip title={value ? formatDate(value, 'HH:mm DD/MM/YYYY') : undefined}>
                    <Typography.Text
                      type="secondary"
                      className="mcms-notification-mono"
                      style={{ fontSize: 12 }}
                    >
                      {relative ?? '—'}
                    </Typography.Text>
                  </Tooltip>
                )
              },
            },
            {
              title: 'Thao tác',
              key: 'actions',
              width: 220,
              render: (_, item) => (
                <Flex gap={4} wrap>
                  <ActionButton
                    icon={<EyeOutlined />}
                    label="Xem chi tiết"
                    onClick={() => openDetail(item)}
                  />
                  <ActionButton
                    icon={<CheckCircleOutlined />}
                    label="Đánh dấu đã đọc"
                    disabled={item.is_read || pending}
                    onClick={() => read.mutate(item.notification_id)}
                  />
                </Flex>
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

      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Chi tiết thông báo"
        width={520}
        className="mcms-notification-drawer"
        footer={
          <Flex justify="end" gap={8}>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Button
              type="primary"
              disabled={!detail || detail.is_read || pending}
              loading={read.isPending}
              onClick={() => {
                if (!detail) return
                read.mutate(detail.notification_id, {
                  onSuccess: () => setDetail(null),
                })
              }}
            >
              Đánh dấu đã đọc
            </Button>
          </Flex>
        }
      >
        {detail && (
          <Flex vertical gap="var(--mcms-space-4)">
            <Flex gap={8} wrap align="center">
              <StatusBadge
                tone={detail.is_read ? 'muted' : 'info'}
                label={detail.is_read ? 'Đã đọc' : 'Chưa đọc'}
              />
              {detailMeta && (
                <Tag
                  color={detailMeta.color ?? undefined}
                  icon={<CategoryIcon category={detailCategory} />}
                  title={detailMeta.description}
                >
                  {detailMeta.label}
                </Tag>
              )}
              <MetadataBadge
                label={notificationTypeLabel(detail.notification_type)}
                icon={<BellOutlined />}
              />
            </Flex>

            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                {detail.title ?? 'Thông báo'}
              </Typography.Title>
              <div className="mcms-notification-detail-body">
                {detail.message ?? '—'}
              </div>
            </div>

            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                {
                  key: 'created_at',
                  label: 'Thời gian tạo',
                  children: (
                    <span className="mcms-notification-mono">
                      {detail.created_at
                        ? `${formatDate(detail.created_at, 'HH:mm DD/MM/YYYY')} (${formatRelativeTime(detail.created_at) ?? '—'})`
                        : '—'}
                    </span>
                  ),
                },
                {
                  key: 'read_at',
                  label: 'Thời gian đọc',
                  children: (
                    <span className="mcms-notification-mono">
                      {detail.read_at ? formatDate(detail.read_at, 'HH:mm DD/MM/YYYY') : '—'}
                    </span>
                  ),
                },
                {
                  key: 'reference',
                  label: 'Đối tượng liên quan',
                  children: detail.reference_type
                    ? `${statusLabel(REFERENCE_TYPE_DICTIONARY, detail.reference_type)}${detail.reference_id ? ` #${detail.reference_id}` : ''}`
                    : '—',
                },
              ]}
            />
          </Flex>
        )}
      </Drawer>
    </div>
  )
}
