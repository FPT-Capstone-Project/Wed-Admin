import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { getApiErrorMessage } from '../../../shared/api/error'
import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  notificationApi,
    sendSessionNotification,
} from '../api/notification.api'
import { useNotificationStore } from '../store/notification.store'
import type {
    NotificationListQuery,
  NotificationListResult,
  SendSessionNotificationPayload,
  SentSessionNotification,
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

  /**
   * ⚠ BE **không** trả `meta.unread_count` ở response của
   *   `PATCH /api/notifications/:id/read` ⇒ badge trên Header sẽ không tự
   *   giảm nếu chỉ chờ refetch. Vì vậy cập nhật **optimistic** store
   *   ngay khi đánh dấu đọc, đồng thời invalidate để BE là nguồn sự thật.
   */
  const options = {
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: notificationKeys.all })
      void message.success('Đã đánh dấu thông báo đã đọc')
    },
    onError: (error: Error) => { void message.error(getApiErrorMessage(error)) },
  }
  const read = useMutation({
    mutationFn: notificationApi.markRead,
    onMutate: () => {
      useNotificationStore.getState().decrementUnreadCount()
    },
    ...options,
  })
  const readAll = useMutation({
    mutationFn: notificationApi.markAllRead,
    onMutate: () => {
      useNotificationStore.getState().setUnreadCount(0)
    },
    ...options,
  })
  return { read, readAll, pending: read.isPending || readAll.isPending }
}

/**
 * Gửi thông báo cho khách hàng của một phiên canh tác.
 *
 * ⚠ Đây là **thao tác ghi** — khác hẳn phần còn lại của module này vốn
 *   chỉ đọc. BE tự xác định người nhận qua `session → order → user`
 *   (khách role 3), tự set `reference_type` / `reference_id`.
 *
 * ⚠ Hook **tự** hiện toast (AntD `message`) khi thành công / thất bại ⇒
 *   component gọi hook không cần `try/catch` + `message.*` thủ công.
 *   `mutateAsync` vẫn **reject** khi lỗi ⇒ dùng `.catch(() => undefined)`
 *   khi không cần xử lý thêm (xem `RoomAdministration`).
 */
export function useSendSessionNotification() {
  const { message } = App.useApp()

  const mutation = useMutation<
    SentSessionNotification,
    Error,
    { sessionId: number; payload: SendSessionNotificationPayload }
  >({
    mutationFn: ({ sessionId, payload }) =>
      sendSessionNotification(sessionId, payload),
    onSuccess: (result) => {
      void message.success(
        `Đã gửi thông báo tới khách hàng (phiên #${result.reference_id})`,
      )
    },
    onError: (error: Error) => {
      void message.error(getApiErrorMessage(error))
    },
  })

  /** Gửi thông báo — tiện cho `onConfirm` của `Popconfirm`. */
  const send = (
    sessionId: number,
    payload: SendSessionNotificationPayload,
  ): Promise<SentSessionNotification> =>
    mutation.mutateAsync({ sessionId, payload })

  return { ...mutation, send }
}
