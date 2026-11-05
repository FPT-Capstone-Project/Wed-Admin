import { create } from 'zustand'

interface NotificationState {
  /**
   * Số thông báo chưa đọc — BE trả ở `meta.unread_count` của
   * `GET /api/notifications` (xem `notification.controller.js`).
   *
   * `null` = chưa từng lấy (ví dụ admin không vào trang thông báo), để phân biệt
   * với `0` = đã lấy và thật sự không có gì.
   */
  unreadCount: number | null

  /** Cờ "đọc" cho badge — UI chỉ hiện chấm đỏ khi `unreadCount > 0`. */
  setUnreadCount: (count: number) => void

  /**
   * Giảm 1 đơn vị (optimistic) khi đánh dấu 1 thông báo đã đọc.
   *
   * ⚠ BE không trả `meta.unread_count` trong response của
   *   `PATCH /api/notifications/:id/read` ⇒ badge không tự giảm nếu không
   *   cập nhật tại chỗ. Giá trị được "đồng bộ lại" bởi request list kế tiếp.
   */
  decrementUnreadCount: () => void

  /** Đặt lại khi đăng xuất, tránh số của user trước lọt sang user sau. */
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: null,
  setUnreadCount: (count) =>
    set({ unreadCount: Number.isFinite(count) && count > 0 ? count : 0 }),
  decrementUnreadCount: () =>
    set((state) => ({
      unreadCount:
        state.unreadCount === null
          ? null
          : Math.max(0, state.unreadCount - 1),
    })),
  reset: () => set({ unreadCount: null }),
}))

/** Selector cho component không muốn subscribe to: */
export const selectUnreadCount = (state: NotificationState) => state.unreadCount

/**
 * Điểm ghi duy nhất cho interceptor của axios.
 *
 * Được `response-adapter.ts` gọi mỗi khi response chứa `meta.unread_count`,
 * nên import store ở đây (module-level) thay vì tạo phụ thuộc vòng.
 */
export function pushUnreadCount(count: unknown) {
  if (typeof count !== 'number' || !Number.isFinite(count)) return
  useNotificationStore.getState().setUnreadCount(count)
}