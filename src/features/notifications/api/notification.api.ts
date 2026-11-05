import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  AppNotification,
  NotificationListQuery,
  NotificationListResult,
  NotificationPagination,
  SendSessionNotificationPayload,
  SentSessionNotification,
} from '../types/notification.types'

const BASE = '/api/notifications'

export const notificationApi = {
  async markRead(id: number): Promise<void> { await apiClient.patch(`${BASE}/${id}/read`) },
  async markAllRead(): Promise<void> { await apiClient.patch(`${BASE}/read-all`) },
  async list(
    query: NotificationListQuery = {},
  ): Promise<NotificationListResult> {
    const response = await apiClient.get<unknown>(BASE, { params: query })

    const items = ensureArray<unknown>(response.data).map(normalizeNotification)

    const body = response.data as { pagination?: unknown } | null
    const pagination = normalizePagination(body?.pagination)
    const unreadCount = pickUnreadCount(response.data) ?? items.filter((n) => !n.is_read).length

    return { items, pagination, unreadCount }
  },
}

/**
 * POST /api/notifications/cultivation-sessions/{sessionId}
 *
 * Gửi thông báo cho **khách hàng** sở hữu phiên canh tác.
 *
 * ⚠ BE tự xác định người nhận ( qua `session → order → user`), tự set
 *   `reference_type = 'CULTIVATION_SESSION'` và `reference_id = sessionId`
 *   ⇒ FE **không** được gửi thêm các field này (BE bỏ qua).
 *
 * ⚠ BE chỉ cho phép gửi cho phiên còn active (PENDING → HARVESTING);
 *   phiên COMPLETED / CANCELLED ⇒ **409**.
 *
 * ⚠ Chỉ role 1 (Admin) và 2 (Farm Operator) được gọi — Customer không.
 */
export async function sendSessionNotification(
  sessionId: number,
  payload: SendSessionNotificationPayload,
): Promise<SentSessionNotification> {
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    throw new Error('Mã phiên canh tác không hợp lệ')
  }

  const title = payload.title.trim()
  const message = payload.message.trim()

  // Chặn sớm để không gọi API chắc chắn bị 400.
  if (!title || title.length > 100) {
    throw new Error('Tiêu đề thông báo phải có từ 1 đến 100 ký tự')
  }
  if (!message || message.length > 1000) {
    throw new Error('Nội dung thông báo phải có từ 1 đến 1000 ký tự')
  }

  const response = await apiClient.post<unknown>(
    `${BASE}/cultivation-sessions/${sessionId}`,
    {
      title,
      message,
      type: payload.type ?? 'OPERATOR_MESSAGE',
    },
  )

  const body = ensureObject<Record<string, unknown>>(response.data)
  return normalizeSentNotification(body, sessionId)
}

/** Chuẩn hoá response 201 của `POST .../cultivation-sessions/{sessionId}`. */
function normalizeSentNotification(
  raw: Record<string, unknown> | null,
  sessionId: number,
): SentSessionNotification {
  const obj = raw ?? {}

  return {
    notification_id: pickNumber(obj, 'notification_id', 'notificationId', 'id') ?? 0,
    user_id: pickNumber(obj, 'user_id', 'userId') ?? 0,
    notification_type:
      (pickString(obj, 'notification_type', 'notificationType', 'type') ??
        'OPERATOR_MESSAGE') as SentSessionNotification['notification_type'],
    title: pickString(obj, 'title') ?? '',
    message: pickString(obj, 'message', 'body', 'content') ?? '',
    reference_type: pickString(obj, 'reference_type', 'referenceType') ?? 'CULTIVATION_SESSION',
    reference_id: pickNumber(obj, 'reference_id', 'referenceId') ?? sessionId,
    created_at: pickString(obj, 'created_at', 'createdAt') ?? '',
  }
}

// ─── Normalizers ─────────────────────────────────────────────────────────

function normalizeNotification(raw: unknown): AppNotification {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    notification_id: pickNumber(obj, 'notification_id', 'notificationId', 'id') ?? 0,
    notification_type:
      pickString(obj, 'notification_type', 'notificationType', 'type') ?? 'OPERATOR_MESSAGE',
    title: pickString(obj, 'title'),
    message: pickString(obj, 'message', 'body', 'content'),
    is_read: pickBoolean(obj, 'is_read', 'isRead') ?? false,
    created_at: pickString(obj, 'created_at', 'createdAt'),
    read_at: pickString(obj, 'read_at', 'readAt'),
    reference_type: pickString(obj, 'reference_type', 'referenceType'),
    reference_id: pickNumber(obj, 'reference_id', 'referenceId'),
  }
}

function normalizePagination(raw: unknown): NotificationPagination | null {
  const obj = ensureObject<Record<string, unknown>>(raw)
  if (!obj) return null

  const page = pickNumber(obj, 'page') ?? 1
  const pageSize = pickNumber(obj, 'pageSize', 'limit') ?? 20
  const total = pickNumber(obj, 'total') ?? 0
  const totalPages =
    pickNumber(obj, 'totalPages') ?? (pageSize > 0 ? Math.ceil(total / pageSize) : 0)

  return { page, pageSize, total, totalPages }
}

function pickUnreadCount(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null) return null
  const body = raw as Record<string, unknown>
  const meta = body.meta
  if (typeof meta !== 'object' || meta === null) return null
  const value = (meta as Record<string, unknown>).unread_count
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function pickString(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function pickBoolean(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return null
}
