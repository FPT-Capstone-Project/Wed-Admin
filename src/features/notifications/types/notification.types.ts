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
  | 'SENSOR_ALERT'
  | 'OPERATOR_MESSAGE'
  | 'PAYMENT_STATUS'
  | (string & {})

/**
 * Nhóm thông báo liên quan cảnh báo vận hành (dùng cho trang `/alerts`).
 *
 * ⚠ Gồm cả type **kỹ thuật** (`DEVICE_ISSUE`, `SENSOR_ALERT`) và type
 *   **nghiệp vụ** (`MUSHROOM_DISEASE`, `OPERATOR_MESSAGE`) — trung tâm
 *   "Cảnh báo & Thông báo" sẽ tách 2 nhóm này ra 2 tab
 *   (xem `features/notifications/utils/notification-classification.ts`).
 */
export const OPERATIONAL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'MUSHROOM_DISEASE',
  'DEVICE_ISSUE',
  'SENSOR_ALERT',
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

/**
 * Bộ lọc `GET /api/notifications`.
 *
 * ⚠ BE hiện chỉ hỗ trợ `isRead` + phân trang (`parseIsRead`, `parsePagination`
 *   trong `notification.service.js`). Tham số `type` **không** được BE
 *   đọc ⇒ FE lọc theo loại ở client (xem `NotificationsPage`).
 */
export interface NotificationListQuery {
  /** `true` = chỉ lấy đã đọc, `false` = chỉ lấy chưa đọc. */
  isRead?: boolean
  /** Mặc định BE = 1 */
  page?: number
  /** Mặc định BE = 20, tối đa 100 */
  pageSize?: number
}

// ─── Gửi thông báo tới khách của phiên canh tác ───────────────────────────

/**
 * Loại thông báo mà **Admin / Farm Operator** được phép gửi thủ công.
 *
 * ⚠ Nguồn: Swagger `POST /api/notifications/cultivation-sessions/{sessionId}`
 *   → `type.enum`. BE **từ chối** mọi type ngoài danh sách này (400).
 */
export type SendableNotificationType =
  | 'OPERATOR_MESSAGE'
  | 'MUSHROOM_DISEASE'
  | 'DEVICE_ISSUE'

/** Body gửi lên `POST /api/notifications/cultivation-sessions/{sessionId}`. */
export interface SendSessionNotificationPayload {
  /** Bắt buộc — 1..100 ký tự sau khi trim. */
  title: string
  /** Bắt buộc — 1..1000 ký tự sau khi trim. */
  message: string
  /** Mặc định `OPERATOR_MESSAGE`. */
  type?: SendableNotificationType
}

/** Thông báo BE trả về sau khi gửi thành công (201). */
export interface SentSessionNotification {
  notification_id: number
  /** Người nhận — luôn là khách hàng (role 3) của phiên. */
  user_id: number
  notification_type: SendableNotificationType
  title: string
  message: string
  /** Luôn `CULTIVATION_SESSION` — do BE tự set. */
  reference_type: string
  /** `cultivation_sessions.session_id` — do BE tự set. */
  reference_id: number
  created_at: string
}
