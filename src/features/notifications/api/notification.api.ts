import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  AppNotification,
  NotificationListQuery,
  NotificationListResult,
  NotificationPagination,
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
