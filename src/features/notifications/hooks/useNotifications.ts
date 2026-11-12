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
    /**
     * Key của cache "toàn bộ thông báo" (mọi trang).
     *
     * ⚠ Tách riêng khỏi `lists()` vì shape khác nhau:
     *   - `lists()` → 1 trang + `pagination` của BE.
     *   - `every()` → **mọi** bản ghi, dùng để lọc theo nhóm (tab 1 / tab 2)
     *     và đếm badge chính xác.
     */
    every: () => [...notificationKeys.all, 'every'] as const,
}

/**
 * Query "toàn bộ thông báo" — dùng chung cho:
 *   - Tab 2 "Thông báo hệ thống" (lọc nhóm nghiệp vụ ở client).
 *   - Badge đếm chưa đọc của **từng tab** trên `AlertCenterPage`.
 *   - Nguồn thông báo dựng cảnh báo trong `useOperationalAlerts`.
 *
 * ⚠ Vì sao phải lấy **toàn bộ**?
 *   BE **không** hỗ trợ lọc theo `notification_type` ⇒ FE buộc phải lọc ở
 *   client. Nếu chỉ lấy 1 trang thì:
 *     - danh sách tab 2 bị "thưa" (bản ghi của trang sau nằm ngoài trang),
 *     - số đếm badge bị **thiếu** ⇒ không khớp với dữ liệu hiển thị.
 */
export const ALL_NOTIFICATIONS_STALE_TIME = 30_000

export function useAllNotifications(
    options?: Partial<UseQueryOptions<NotificationListResult, Error>>,
) {
    return useQuery<NotificationListResult, Error>({
        queryKey: notificationKeys.every(),
        queryFn: () => notificationApi.listAll(),
        staleTime: ALL_NOTIFICATIONS_STALE_TIME,
        ...options,
    })
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

    /**
     * Đánh dấu **optimistic** — cập nhật cache của mọi list đang mở để hàng
     * tương ứng chuyển ngay từ nền "chưa đọc" (đỏ nhạt) sang nền "đã đọc"
     * (xám nhạt), không phải chờ round-trip mạng.
     *
     * ⚠ `queryClient.setQueryData` với `notificationKeys.all` sẽ áp cho
     *   **mọi** biến thể query con (prefix match) — đúng ý đồ: thông báo đó
     *   có thể đang hiện ở nhiều bộ lọc/trang cùng lúc (kể cả cache "toàn bộ
     *   thông báo" dùng cho tab 2 + badge).
     */
    const markReadOptimistic = (notificationIds: number | number[]) => {
        const ids = Array.isArray(notificationIds)
            ? notificationIds.filter((id) => Number.isFinite(id))
            : [notificationIds].filter((id) => Number.isFinite(id))
        if (ids.length === 0) return
        const idSet = new Set(ids)

        client.setQueriesData<NotificationListResult>(
            { queryKey: notificationKeys.all },
            (previous) => {
                if (!previous?.items) return previous

                let changed = 0
                const items = previous.items.map((item) => {
                    if (idSet.has(item.notification_id) && !item.is_read) {
                        changed += 1
                        return {
                            ...item,
                            is_read: true,
                            read_at: item.read_at ?? new Date().toISOString(),
                        }
                    }
                    return item
                })

                // Đã đọc rồi ⇒ không cần cập nhật gì.
                if (changed === 0) return previous

                return {
                    ...previous,
                    items,
                    unreadCount: Math.max(0, previous.unreadCount - changed),
                }
            },
        )
    }

    /** Đánh dấu **tất cả** đã đọc — optimistic trên toàn bộ list. */
    const markAllReadOptimistic = () => {
        client.setQueriesData<NotificationListResult>(
            { queryKey: notificationKeys.all },
            (previous) => {
                if (!previous?.items) return previous
                return {
                    ...previous,
                    items: previous.items.map((item) =>
                        item.is_read
                            ? item
                            : { ...item, is_read: true, read_at: new Date().toISOString() },
                    ),
                    unreadCount: 0,
                }
            },
        )
    }

    const read = useMutation({
        mutationFn: notificationApi.markRead,
        onMutate: (notificationId: number) => {
            useNotificationStore.getState().decrementUnreadCount()
            markReadOptimistic(notificationId)
        },
        ...options,
    })

    /**
     * Đánh dấu đọc **nhiều** thông báo theo danh sách ID.
     *
     * ⚠ Vì sao không dùng `readAll` (đánh dấu đọc TẤT CẢ)?
     *   Trung tâm "Cảnh báo & Thông báo" có 2 tab **tách biệt hoàn toàn**:
     *     - Tab 1 = cảnh báo kỹ thuật (IoT).
     *     - Tab 2 = thông báo nghiệp vụ.
     *   Nếu tab 2 gọi `readAll` thì sẽ đánh dấu đọc luôn cả cảnh báo của
     *   tab 1 ⇒ xoá việc chưa xem của tab 1 ⇒ sai.
     *   ⇒ Tab 2 chỉ đánh dấu đọc **đúng các ID** đang hiển thị.
     */
    const readMany = useMutation({
        mutationFn: async (notificationIds: number[]) => {
            const ids = notificationIds.filter((id) => Number.isFinite(id))
            // ⚠ Chạy **tuần tự** (không `Promise.all`) — danh sách có thể
            //   dài hàng chục thông báo ⇒ gọi song song sẽ dồn hàng chục
            //   request cùng lúc vào BE. Mỗi lỗi 1 thông báo không được
            //   làm hỏng cả lô ⇒ bỏ qua lỗi đó.
            const done: number[] = []
            for (const id of ids) {
                try {
                    await notificationApi.markRead(id)
                    done.push(id)
                } catch {
                    // Bỏ qua — thông báo đó sẽ được thử lại ở lần sau.
                }
            }
            return done
        },
        onMutate: (notificationIds: number[]) => {
            const ids = notificationIds.filter((id) => Number.isFinite(id))
            const store = useNotificationStore.getState()
            // Chỉ giảm badge theo số thông báo **thực sự chưa đọc** trong
            // cache — tránh giảm quá ⇒ badge âm (đã được `Math.max` chặn).
            const unreadInCache = new Set<number>()
            client.getQueriesData<NotificationListResult>({
                queryKey: notificationKeys.all,
            }).forEach(([, result]) => {
                result?.items?.forEach((item) => {
                    if (!item.is_read) unreadInCache.add(item.notification_id)
                })
            })
            const toDecrement = ids.filter((id) => unreadInCache.has(id)).length
            for (let index = 0; index < toDecrement; index += 1) {
                store.decrementUnreadCount()
            }
            markReadOptimistic(ids)
        },
        ...options,
    })

    const readAll = useMutation({
        mutationFn: notificationApi.markAllRead,
        onMutate: () => {
            useNotificationStore.getState().setUnreadCount(0)
            markAllReadOptimistic()
        },
        ...options,
    })
    return {
        read,
        readMany,
        readAll,
        pending: read.isPending || readMany.isPending || readAll.isPending,
    }
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
