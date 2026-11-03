import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { getApiErrorMessage } from '../../../shared/api/error'
import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { notificationApi } from '../api/notification.api'
import type {
  NotificationListQuery,
  NotificationListResult,
} from '../types/notification.types'

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (query: NotificationListQuery) => [...notificationKeys.lists(), query] as const,
}

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

export function useNotificationActions() {
  const client = useQueryClient()
  const { message } = App.useApp()
  const options = {
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: notificationKeys.all })
      void message.success('Đã đánh dấu thông báo đã đọc')
    },
    onError: (error: Error) => { void message.error(getApiErrorMessage(error)) },
  }
  const read = useMutation({ mutationFn: notificationApi.markRead, ...options })
  const readAll = useMutation({ mutationFn: notificationApi.markAllRead, ...options })
  return { read, readAll, pending: read.isPending || readAll.isPending }
}
