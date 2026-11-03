import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { sessionApi, type SessionListResult } from '../api/session.api'
import type {
  CultivationSession,
  SessionListQuery,
} from '../types/session.types'

/**
 * Hooks phiên canh tác — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không ghi dữ liệu phiên.
 */

/** Query keys */
export const sessionKeys = {
  all: ['farm-session-views'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (query: SessionListQuery) => [...sessionKeys.lists(), query] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (sessionId: number) => [...sessionKeys.details(), sessionId] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────

/**
 * Danh sách phiên canh tác — có phân trang + bộ lọc đầy đủ.
 *
 * `query` nên được `useMemo` ở component để giữ referential stability,
 * tránh vòng render vô hạn với object literal.
 */
export function useSessions(
  query: SessionListQuery = {},
  options?: Partial<UseQueryOptions<SessionListResult, Error>>,
) {
  return useQuery<SessionListResult, Error>({
    queryKey: sessionKeys.list(query),
    queryFn: () => sessionApi.list(query),
    placeholderData: (prev) => prev,
    ...options,
  })
}

/**
 * Chi tiết một phiên (kèm mảng `trays[]`).
 * Tự disable khi `sessionId` không hợp lệ.
 */
export function useSession(
  sessionId: number | null,
  options?: Partial<UseQueryOptions<CultivationSession, Error>>,
) {
  return useQuery<CultivationSession, Error>({
    queryKey: sessionKeys.detail(sessionId ?? -1),
    queryFn: async () => {
      const result = await sessionApi.getById(sessionId as number, true)
      if (!result) {
        throw new Error(`Không tìm thấy phiên canh tác ID ${sessionId}`)
      }
      return result
    },
    enabled: sessionId !== null && sessionId > 0,
    ...options,
  })
}

/**
 * Danh sách phiên đang chạy theo khay.
 *
 * ⚠ Dùng cho ô khay ở `RoomListPage`: FE đối chiếu quan hệ khay từ trạng thái đơn hàng, nên
 *   gọi 1 lần với `pageSize` lớn rồi lọc tại client — nhanh hơn gọi N
 *   request theo từng khay.
 */
export function useSessionByTray(
  trayId: number | null,
  options?: Partial<UseQueryOptions<CultivationSession | null, Error>>,
) {
  return useQuery<CultivationSession | null, Error>({
    queryKey: [...sessionKeys.all, 'by-tray', trayId] as const,
    queryFn: async () => {
      if (!trayId || trayId <= 0) return null
      const result = await sessionApi.list({ trayId, pageSize: 5 })
      return result.items[0] ?? null
    },
    enabled: trayId !== null && trayId > 0,
    staleTime: 30_000,
    ...options,
  })
}
