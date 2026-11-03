/**
 * Thông báo (Notification) — DTO **read-only** cho Web Admin.
 *
 * Nguồn: `GET /api/notifications` (Swagger → tag `Notifications`).
 *
 * ⚠ Web Admin chỉ ĐỌC. Endpoint ghi của BE (`PATCH /api/notifications/read-all`,
 *   `PATCH /api/notifications/{id}/read`) thuộc phạm vi **nhân viên / app
 *   khách hàng** — Admin web không gọi.
 */

/**
 * Loại thông báo.
 *
 * ⚠ BE không công khai enum đầy đủ trong Swagger (chỉ ví dụ
 *   `CULTIVATION_STARTED`), nên type là `string` mở rộng + các hằng số
 *   quan trọng được liệt kê để lọc theo nhóm nghiệp vụ.
 */
export type NotificationType =
  | 'CULTIVATION_STARTED'
  | 'CULTIVATION_PROGRESS'
  | 'CULTIVATION_COMPLETED'
  | 'CULTIVATION_CANCELLED'
  | 'MUSHROOM_DISEASE'
  | 'DEVICE_ISSUE'
  | 'OPERATOR_MESSAGE'
  | 'PAYMENT_STATUS'
  | (string & {})

/** Nhóm thông báo liên quan cảnh báo vận hành (dùng cho trang `/alerts`). */
export const OPERATIONAL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'MUSHROOM_DISEASE',
  'DEVICE_ISSUE',
  'OPERATOR_MESSAGE',
]

/** Loại thông báo liên quan vòng đời canh tác. */
export const CULTIVATION_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'CULTIVATION_STARTED',
  'CULTIVATION_PROGRESS',
  'CULTIVATION_COMPLETED',
  'CULTIVATION_CANCELLED',
]

/** Một thông báo. */
export interface AppNotification {
  notification_id: number
  notification_type: NotificationType
  title: string | null
  message: string | null
  is_read: boolean
  created_at: string | null
  read_at: string | null
  /** VD: `CULTIVATION_SESSION` */
  reference_type: string | null
  /** VD: `cultivation_sessions.session_id` */
  reference_id: number | null
}

/** Metadata phân trang — BE trả kèm dưới key `pagination`. */
export interface NotificationPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Kết quả `GET /api/notifications`. */
export interface NotificationListResult {
  items: AppNotification[]
  pagination: NotificationPagination | null
  /** Đếm từ `meta.unread_count`. */
  unreadCount: number
}

/** Bộ lọc `GET /api/notifications`. */
export interface NotificationListQuery {
  /** `true` = chỉ lấy chưa đọc, `false` = chỉ lấy đã đọc. */
  isRead?: boolean
  /** Mặc định BE = 1 */
  page?: number
  /** Mặc định BE = 20, tối đa 100 */
  pageSize?: number
}
