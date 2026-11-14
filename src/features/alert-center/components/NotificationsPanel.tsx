import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  Descriptions,
  Drawer,
  Flex,
  Input,
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
  StatCard,
  StatGrid,
  StatusBadge,
} from '../../../shared/ui'
import { formatDate, formatRelativeTime } from '../../../shared/utils/date'
import {
  useAllNotifications,
  useNotificationActions,
} from '../../notifications/hooks/useNotifications'
import { markAlertsAsRead } from '../utils/mark-alerts-as-read'
import type { AppNotification } from '../../notifications/types/notification.types'
import {
  NOTIFICATION_BUSINESS_GROUPS,
  notificationBusinessGroup,
  notificationCategory,
  notificationCategoryMeta,
  notificationTypeLabel,
  type NotificationBusinessGroup,
} from '../../notifications/components/notification-status.config'
import { isBusinessNotificationType } from '../../notifications/utils/notification-classification'
import { REFERENCE_TYPE_DICTIONARY } from '../../../shared/i18n/status/reference'
import { statusLabel } from '../../../shared/i18n/status/registry'

type ReadFilter = 'ALL' | 'UNREAD' | 'READ'

const READ_OPTIONS: Array<{ value: ReadFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNREAD', label: 'Chưa đọc' },
  { value: 'READ', label: 'Đã đọc' },
]

/**
 * Bộ lọc theo **nhóm nghiệp vụ** (dựa trực tiếp trên `notification_type`).
 *
 * ⚠ KHÔNG có nhóm `iot` ở đây — nhóm kỹ thuật đã bị **loại trừ hoàn toàn**
 *   (thuộc tab 1). Xem `isBusinessNotificationType()`.
 */
type TypeFilter = 'ALL' | NotificationBusinessGroup

const TYPE_FILTER_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả loại' },
  ...NOTIFICATION_BUSINESS_GROUPS.map((group) => ({
    value: group.value,
    label: group.label,
  })),
]

/** Icon tương ứng với nhóm hiển thị. */
function CategoryIcon({ category }: { category: string }) {
  if (category === 'iot') return <WarningOutlined />
  if (category === 'cultivation') return <BugOutlined />
  return <BellOutlined />
}

/**
 * Tab 2 của Trung tâm "Cảnh báo & Thông báo" — **Thông báo hệ thống**.
 *
 * ⚠ **Phạm vi dữ liệu (tách biệt hoàn toàn với tab 1)**:
 *   Chỉ hiển thị thông báo **nghiệp vụ vận hành**:
 *     - Đơn hàng / thanh toán (`PAYMENT_STATUS`, `ORDER_STATUS`).
 *     - Thu hoạch (`HARVEST_*`).
 *     - Phiên canh tác / vòng đời canh tác (`CULTIVATION_*`).
 *     - Sự cố bệnh hại (`MUSHROOM_DISEASE`).
 *     - Thông báo hệ thống chung (`OPERATOR_MESSAGE`, type lạ).
 *
 *   ⇒ Mọi thông báo thuộc nhóm **kỹ thuật** (IoT / thiết bị / cảm biến /
 *     vi khí hậu) đều bị **loại trừ** ⇒ 2 tab không thể hiển thị trùng
 *     bản ghi (trước đây 23 bản ghi cảm biến IoT hiện ở cả 2 tab).
 *
 * ⚠ Tái sử dụng nguyên vẹn logic fetch + hiển thị của trang `/notifications`
 *   cũ (`useNotifications` + `useNotificationActions`). Chỉ bổ sung:
 *   - Chuẩn hoá màu nền dòng theo trạng thái đọc (đỏ nhạt / xám nhạt).
 *     Trước đây chỉ nhóm `iot` được tô nền đỏ ⇒ thông báo đã đọc vẫn giữ
 *     nền đỏ. Nay **mọi** dòng đã đọc đều chuyển về nền xám trung tính.
 */
export interface NotificationsPanelProps {
  /**
   * ID thông báo (BE) cần **mở thẳng Drawer chi tiết** khi vào trang.
   *
   * ⚠ Deep-link từ chuông thông báo (`?notification=<id>`).
   */
  focusNotificationId?: number | null
}

export function NotificationsPanel({
  focusNotificationId = null,
}: NotificationsPanelProps = {}) {
  const { read, readMany, pending } = useNotificationActions()
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')
  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')

    /**
     * Đánh dấu đã đọc — **optimistic** trên CẢ 2 cache.
     *
     * ⚠ Tab 1 (Cảnh báo) **cũng** chứa các thông báo kỹ thuật (nguồn
     *   `NOTIFICATION`) ⇒ phải cập nhật cache cảnh báo luôn, nếu không badge
     *   của tab 1 sẽ **stale** (vẫn đếm cảnh báo đã đọc) ⇒ người dùng tưởng
     *   còn việc chưa xem.
     */
  const markRead = (notificationId: number) => {
    markAlertsAsRead(queryClient, [notificationId])
    read.mutate(notificationId)
  }

  /**
   * Lấy **toàn bộ** thông báo (mọi trang).
   *
   * ⚠ BE không lọc được theo `notification_type` ⇒ phải lọc ở client. Nếu
   *   chỉ lấy 1 trang thì danh sách tab 2 bị "thưa" và số đếm badge sai.
   */
  const { data, isLoading, isError, error, refetch } = useAllNotifications()

  const items = useMemo(() => data?.items ?? [], [data])

  /**
   * Tập thông báo **nghiệp vụ** — đã loại trừ toàn bộ nhóm kỹ thuật (tab 1).
   */
  const businessItems = useMemo(
    () => items.filter((item) => isBusinessNotificationType(item.notification_type)),
    [items],
  )

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return businessItems.filter((item) => {
      // Bộ lọc trạng thái đọc.
      if (readFilter === 'UNREAD' && item.is_read) return false
      if (readFilter === 'READ' && !item.is_read) return false

      // Lọc theo nhóm nghiệp vụ — suy ra trực tiếp từ `notification_type`.
      if (
        typeFilter !== 'ALL' &&
        notificationBusinessGroup(item.notification_type) !== typeFilter
      ) {
        return false
      }

      if (!keyword) return true

      return [item.title, item.message, item.notification_type]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword))
    })
  }, [businessItems, readFilter, searchText, typeFilter])

  /**
   * Số chưa đọc của **tab 2** — tính trên đúng tập đang hiển thị.
   */
  const unreadCount = useMemo(
    () => businessItems.filter((item) => !item.is_read).length,
    [businessItems],
  )

  /**
   * Item cần mở thẳng Drawer khi vào trang (deep-link `?notification=<id>`).
   *
   * ⚠ Tính **trong lúc render** (không dùng `useEffect` + `setState`) ⇒
   *   tuân thủ React 19 (`react-hooks/set-state-in-effect`) và không gây
   *   "cascading render".
   */
  const focusTarget = useMemo(
    () =>
      focusNotificationId == null
        ? null
        : (businessItems.find(
            (item) => item.notification_id === focusNotificationId,
          ) ?? null),
    [businessItems, focusNotificationId],
  )

  /**
   * Drawer đang mở.
   *
   * ⚠ Ưu tiên `focusTarget` (deep-link) — nhưng **chỉ 1 lần** cho mỗi focus
   *   id ⇒ sau khi user đóng Drawer, refetch cache không mở lại.
   */
  const [dismissedFocusKey, setDismissedFocusKey] = useState<number | null>(null)
  const [manualDetail, setManualDetail] = useState<AppNotification | null>(null)
  const detail =
    focusTarget && dismissedFocusKey !== focusNotificationId
      ? focusTarget
      : manualDetail

  const openDetail = (item: AppNotification) => {
    // Mở thủ công ⇒ bỏ deep-link đang giữ Drawer mở.
    setDismissedFocusKey(focusNotificationId)
    setManualDetail(item)
    // Mở chi tiết ⇒ coi như đã đọc (giống hành vi app khách hàng).
    if (!item.is_read && !pending) markRead(item.notification_id)
  }

  /** Nhóm hiển thị của thông báo đang mở trong Drawer. */
  const detailMeta = useMemo(
    () =>
      detail ? notificationCategoryMeta(detail.notification_type) : null,
    [detail],
  )
  const detailCategory = useMemo(
    () =>
      detail
        ? notificationCategory(detail.notification_type)
        : ('system' as const),
    [detail],
  )

  /**
   * Đánh dấu đọc **tất cả** thông báo đang hiển thị ở tab 2.
   *
   * ⚠ KHÔNG dùng `readAll` (đánh dấu đọc toàn bộ tài khoản) vì sẽ xoá luôn
   *   cảnh báo kỹ thuật của tab 1 ⇒ mất việc chưa xem ở tab kia.
   *   Chỉ đánh dấu đọc **đúng các ID** thuộc tab 2.
   */
  const markAllVisibleRead = () => {
    const ids = businessItems
      .filter((item) => !item.is_read)
      .map((item) => item.notification_id)
    if (ids.length === 0) return

    markAlertsAsRead(queryClient, ids)
    readMany.mutate(ids)
  }

  /**
   * Đánh dấu đọc cho item vừa mở Drawer từ deep-link.
   *
   * ⚠ Dùng `useEffect` (không setState) ⇒ chỉ gọi API, không render lại.
   * ⚠ `handledMarkRef` chống gọi lặp ⇒ mỗi thông báo chỉ đánh dấu đọc
   *   **1 lần** cho mỗi lần deep-link (tránh vòng lặp khi cache refetch).
   */
  const handledMarkRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!focusTarget) return
    if (dismissedFocusKey === focusNotificationId) return
    if (focusTarget.is_read) return
    if (pending) return
    if (handledMarkRef.current.has(focusTarget.notification_id)) return

    handledMarkRef.current.add(focusTarget.notification_id)
    markAlertsAsRead(queryClient, [focusTarget.notification_id])
    read.mutate(focusTarget.notification_id)
  }, [
    focusTarget,
    dismissedFocusKey,
    focusNotificationId,
    pending,
    queryClient,
    read,
  ])

  return (
    <div>
      <Flex gap={8} align="center" wrap style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <MetadataBadge
          label={`${unreadCount} chưa đọc`}
          icon={<BellOutlined />}
        />
        <Button
          loading={readMany.isPending}
          disabled={pending || unreadCount === 0}
          onClick={markAllVisibleRead}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </Flex>

      <StatGrid columns={2} style={{ marginBottom: 'var(--mcms-space-4)' }}>
        <StatCard
          title="Tổng thông báo"
          value={businessItems.length}
          tone="neutral"
          description="Thông báo nghiệp vụ của tài khoản"
        />
        <StatCard
          title="Chưa đọc"
          value={unreadCount}
          tone="danger"
          highlightValue
          description="Thông báo nghiệp vụ chưa đọc"
        />
      </StatGrid>

      <Flex vertical gap={8} style={{ marginBottom: 'var(--mcms-space-4)' }}>
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
            onChange={(value) => setReadFilter(value)}
            style={{ width: 140 }}
          />
          <Select<TypeFilter>
            value={typeFilter}
            options={TYPE_FILTER_OPTIONS}
            onChange={(value) => setTypeFilter(value)}
            style={{ width: 220 }}
          />
        </Flex>
      </Flex>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <DataTable<AppNotification>
          rowKey="notification_id"
          /*
           * ⚠ Chuẩn hoá trạng thái đọc — **1 nguồn quyết định duy nhất**:
           *   - `is_read === false` → `mcms-center-row-unread` (nền đỏ nhạt
           *     + viền trái đỏ đậm).
           *   - `is_read === true`  → `mcms-center-row-read` (nền xám nhạt
           *     trung tính, KHÔNG viền đỏ).
           *
           * Trước đây nhóm `iot` được tô nền đỏ **vô điều kiện** ⇒ thông báo
           * đã đọc vẫn giữ nền đỏ ⇒ gây hiểu nhầm là còn việc chưa xử lý.
           */
          rowClassName={(item) =>
            item.is_read ? 'mcms-center-row-read' : 'mcms-center-row-unread'
          }
          dataSource={filteredItems}
          loading={false}
          scrollX={860}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Tổng ${total} thông báo`,
          }}
          columns={[
            {
              title: 'Trạng thái',
              dataIndex: 'is_read',
              key: 'is_read',
              width: 120,
              render: (isRead: boolean) => (
                <StatusBadge
                  tone={isRead ? 'muted' : 'danger'}
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
                  <Tooltip
                    title={
                      value ? formatDate(value, 'HH:mm DD/MM/YYYY') : undefined
                    }
                  >
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
                    onClick={() => markRead(item.notification_id)}
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
        onClose={() => {
          setDismissedFocusKey(focusNotificationId)
          setManualDetail(null)
        }}
        title="Chi tiết thông báo"
        width={520}
        className="mcms-alert-center-drawer"
        footer={
          <Flex justify="end" gap={8}>
            <Button
              onClick={() => {
                setDismissedFocusKey(focusNotificationId)
                setManualDetail(null)
              }}
            >
              Đóng
            </Button>
            <Button
              type="primary"
              disabled={!detail || detail.is_read || pending}
              loading={read.isPending}
              onClick={() => {
                if (!detail) return
                markRead(detail.notification_id)
                setDismissedFocusKey(focusNotificationId)
                setManualDetail(null)
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
                tone={detail.is_read ? 'muted' : 'danger'}
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
              <div className="mcms-alert-center-detail-body">
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
                      {detail.read_at
                        ? formatDate(detail.read_at, 'HH:mm DD/MM/YYYY')
                        : '—'}
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
