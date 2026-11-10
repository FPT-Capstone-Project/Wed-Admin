import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  fetchAdminCultivationSession,
  fetchAdminCultivationSessions,
  fetchAllAdminCultivationSessions,
  fetchAllAdminCultivationSessionsDetailed,
  type AdminSessionQuery,
  type AllAdminCultivationSessionsResult,
} from '../api/admin-session.api'
import type {
  AdminCultivationSessionDto,
  AdminCultivationSessionResult,
} from '../types/admin-session.types'
import type { CultivationSessionStatus } from '../types/session.types'

/**
 * Query keys cho endpoint quản trị phiên canh tác.
 */
export const adminSessionKeys = {
  all: ['admin-cultivation-sessions'] as const,
  list: (query: AdminSessionQuery) =>
    [...adminSessionKeys.all, 'list', query] as const,
  allItems: (status?: CultivationSessionStatus) =>
    [...adminSessionKeys.all, 'all-items', status ?? 'ALL'] as const,
  allDetailed: () => [...adminSessionKeys.all, 'all-detailed'] as const,
  details: () => [...adminSessionKeys.all, 'detail'] as const,
  detail: (sessionId: number) =>
    [...adminSessionKeys.details(), sessionId] as const,
}

/**
 * Danh sách phiên canh tác của **toàn bộ khách hàng**.
 *
 * ⚠ Nguồn: `GET /api/cultivation-sessions/admin` (roles 1 = Admin,
 *   2 = Farm Operator) — endpoint **mới**, thay cho luồng farm
 *   (`GET /api/farm/sessions`) vốn không có phân trang server-side và không
 *   trả kèm khay / giai đoạn sinh trưởng / tiến độ.
 *
 * ⚠ `query` nên được `useMemo` ở component để giữ referential stability,
 *   tránh vòng render vô hạn với object literal.
 */
export function useAdminCultivationSessions(
  query: AdminSessionQuery = {},
  options?: Partial<UseQueryOptions<AdminCultivationSessionResult, Error>>,
) {
  return useQuery<AdminCultivationSessionResult, Error>({
    queryKey: adminSessionKeys.list(query),
    queryFn: () => fetchAdminCultivationSessions(query),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Danh sách **toàn bộ** phiên (đã gộp mọi trang server-side).
 *
 * ⚠ Dùng cho trang "Phiên canh tác" vì UI cần lọc theo **từ khóa tìm kiếm**
 *   trên toàn bộ tập dữ liệu — BE chỉ hỗ trợ lọc theo `status`.
 *
 * ⚠ `status` vẫn gửi lên BE (lọc server-side) ⇒ chỉ tải các phiên đang
 *   lọc, thay vì tải tất cả rồi lọc client.
 */
export function useAllAdminCultivationSessions(
  status?: CultivationSessionStatus,
  options?: Partial<UseQueryOptions<AdminCultivationSessionDto[], Error>>,
) {
  return useQuery<AdminCultivationSessionDto[], Error>({
    queryKey: adminSessionKeys.allItems(status),
    queryFn: () =>
      fetchAllAdminCultivationSessions({ status, pageSize: 100 }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Danh sách **toàn bộ** phiên (đã gộp mọi trang server-side) + cờ "đã tải đủ".
 *
 * ⚠ Dùng cho trang "Đơn đặt từ App" vì cần **toàn bộ** phiên của mỗi đơn để
 *   suy ra trạng thái đơn (đơn bị kẹt "Đang xử lý" dù phiên đã
 *   `COMPLETED` — xem `derive-order-status.ts`).
 *
 * ⚠ `complete = false` ⇒ đã vượt giới hạn trang ⇒ **không** kết luận "mọi phiên
 *   của đơn đã hoàn tất" được.
 */
export function useAllAdminCultivationSessionsDetailed(
  options?: Partial<UseQueryOptions<AllAdminCultivationSessionsResult, Error>>,
) {
  return useQuery<AllAdminCultivationSessionsResult, Error>({
    queryKey: adminSessionKeys.allDetailed(),
    queryFn: () =>
      fetchAllAdminCultivationSessionsDetailed({ pageSize: 100 }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Chi tiết 1 phiên từ endpoint quản trị.
 *
 * ⚠ `GET /api/cultivation-sessions/admin/{sessionId}` — đã join sẵn khách /
 *   gói / nấm / tiến độ / khay được gán ⇒ không cần gọi thêm endpoint khác.
 */
export function useAdminCultivationSession(
  sessionId: number | null,
  options?: Partial<UseQueryOptions<AdminCultivationSessionDto | null, Error>>,
) {
  return useQuery<AdminCultivationSessionDto | null, Error>({
    queryKey: adminSessionKeys.detail(sessionId ?? -1),
    queryFn: () => fetchAdminCultivationSession(sessionId as number),
    enabled: sessionId !== null && sessionId > 0,
    ...options,
  })
}
