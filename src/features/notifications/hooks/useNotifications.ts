import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { notificationApi } from '../api/notification.api'
import type {
  NotificationListQuery,
  NotificationListResult,
} from '../types/notification.types'

/**
 * Hooks thông báo — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không đánh dấu đã đọc.
 */

/** Query keys */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (query: NotificationListQuery) => [...notificationKeys.lists(), query] as const,
}

/**
 * Danh sách thông báo của user đang đăng nhập.
 *
 * @param query bộ lọc `isRead` + phân trang
 */
export function useNotifications(
  query: NotificationListQuery = {},
  options?: Partial<UseQueryOptions<NotificationListResult, Error>>,
) {
  return useQuery<NotificationListResult, Error>({
    queryKey: notificationKeys.list(query),
    queryFn: () => notificationApi.list(query),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Số thông báo chưa đọc — lấy từ `meta.unread_count` của BE.
 *
 * Dùng cho badge chuông ở header.
 */
export function useUnreadNotificationCount(
  options?: Partial<UseQueryOptions<number, Error>>,
) {
  return useQuery<number, Error>({
    queryKey: [...notificationKeys.all, 'unread-count'],
    queryFn: async () => {
      const result = await notificationApi.list({ page: 1, pageSize: 1 })
      return result.unreadCount
    },
    staleTime: 30_000,
    ...options,
  })
}
