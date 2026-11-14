import { withFarmGrowth } from './farm-growth.api'
import { apiClient } from '../../../shared/api/client'
import { cleanQueryParams, unwrapListResponse } from '../../../shared/api/list-response'
import { ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import { normalizeAdminSession } from './admin-session-normalizer'
import type {
  AdminCultivationSessionDto,
  AdminCultivationSessionResult,
} from '../types/admin-session.types'
import type { CultivationSessionStatus } from '../types/session.types'

/** Endpoint quản trị — roles 1 (Admin) và 2 (Farm Operator). */
export const ADMIN_SESSIONS_URL = '/api/cultivation-sessions/admin'

/** Bộ lọc server-side của `GET /api/cultivation-sessions/admin`. */
export interface AdminSessionQuery {
  page?: number
  pageSize?: number
  status?: CultivationSessionStatus
  userId?: number
  mushroomTypeId?: number
  trayId?: number
  /** ISO date-time — lọc theo ngày bắt đầu canh tác. */
  startDateFrom?: string
  startDateTo?: string
}

/**
 * GET /api/cultivation-sessions/admin — danh sách phiên canh tác của
 * **toàn bộ khách hàng**.
 *
 * ⚠ Chỉ role 1 (Admin) và 2 (Farm Operator) được gọi.
 *
 * Response: `{ data: AdminCultivationSessionDto[], pagination: {...} }`
 *
 * ⚁ Khác `sessionApi.list()` (luồng farm): endpoint này có **phân trang
 *   server-side** và trả kèm khay được gán + giai đoạn sinh trưởng + tiến độ
 *   ⇒ không cần gọi thêm endpoint khác để dựng bảng.
 */
export async function fetchAdminCultivationSessions(
  query: AdminSessionQuery = {},
): Promise<AdminCultivationSessionResult> {
  const params = cleanQueryParams({
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    userId: query.userId,
    mushroomTypeId: query.mushroomTypeId,
    trayId: query.trayId,
    startDateFrom: query.startDateFrom,
    startDateTo: query.startDateTo,
  })

  const response = await apiClient.get<unknown>(ADMIN_SESSIONS_URL, { params })
  const unwrapped = unwrapListResponse<unknown>(response.data)

  return {
    items: await withFarmGrowth(unwrapped.data.map(normalizeAdminSession)),
    pagination: {
      page: unwrapped.pagination.page,
      pageSize: unwrapped.pagination.pageSize,
      total: unwrapped.pagination.total,
      totalPages: unwrapped.pagination.totalPages,
    },
  }
}

/**
 * GET /api/cultivation-sessions/admin — lấy **toàn bộ** phiên của mọi khách.
 *
 * ⚠ Vì sao cần? UI cần lọc theo **từ khóa tìm kiếm** (khách / mã đơn /
 *   gói / mã khay) trên toàn bộ tập dữ liệu — BE không hỗ trợ tìm kiếm
 *   theo từ khóa, chỉ hỗ trợ lọc theo `status`. Hàm này tự đọc
 *   `pagination.totalPages` rồi gọi tiếp các trang còn lại.
 *
 * ⚠ `pageSize` tối đa của BE là 100.
 */
export async function fetchAllAdminCultivationSessions(
  options: {
    pageSize?: number
    maxPages?: number
    status?: CultivationSessionStatus
  } = {},
): Promise<AdminCultivationSessionDto[]> {
  return (await fetchAllAdminCultivationSessionsDetailed(options)).items
}

/**
 * Kết quả tải **toàn bộ** phiên — kèm cờ `complete`.
 *
 * ⚠ `complete = false` ⇒ đã vượt `maxPages` ⇒ **chưa chắc tải đủ** ⇒ không
 *   được kết luận "mọi phiên của đơn đã hoàn tất" (xem `derive-order-status.ts`).
 */
export interface AllAdminCultivationSessionsResult {
  items: AdminCultivationSessionDto[]
  /** Tổng số phiên theo BE (`pagination.total`). */
  total: number
  /** `true` khi đã tải **đủ** mọi trang (không bị cắt bởi `maxPages`). */
  complete: boolean
}

/**
 * GET /api/cultivation-sessions/admin — lấy toàn bộ phiên + thông tin "đã đủ
 * chưa" (dùng cho trang Đơn hàng để suy ra trạng thái đơn từ trạng thái phiên).
 */
export async function fetchAllAdminCultivationSessionsDetailed(
  options: {
    pageSize?: number
    maxPages?: number
    status?: CultivationSessionStatus
  } = {},
): Promise<AllAdminCultivationSessionsResult> {
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 100))
  const maxPages = Math.max(1, options.maxPages ?? 20)

  const first = await fetchAdminCultivationSessions({
    page: 1,
    pageSize,
    status: options.status,
  })
  const totalPages = Math.min(first.pagination.totalPages, maxPages)
  if (totalPages <= 1) {
    return {
      items: first.items,
      total: first.pagination.total,
      complete: first.pagination.totalPages <= maxPages,
    }
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminCultivationSessions({
        page: index + 2,
        pageSize,
        status: options.status,
      }),
    ),
  )

  const items = [first.items, ...rest.map((result) => result.items)].flat()

  return {
    items,
    total: first.pagination.total,
    complete: first.pagination.totalPages <= maxPages,
  }
}

/**
 * GET /api/cultivation-sessions/admin/{sessionId} — chi tiết 1 phiên.
 *
 * ⚠ Response: `{ data: AdminCultivationSessionDto }` (đã join sẵn khách /
 *   gói / nấm / tiến độ / khay được gán).
 */
export async function fetchAdminCultivationSession(
  sessionId: number,
): Promise<AdminCultivationSessionDto | null> {
  try {
    const response = await apiClient.get<unknown>(
      `${ADMIN_SESSIONS_URL}/${sessionId}`,
    )
    const body = ensureObject<Record<string, unknown>>(response.data)
    if (!body) return null

    // BE bọc `{ data: {...} }` ⇒ `ensureObject` đã bóc 1 cấp.
    return (await withFarmGrowth([normalizeAdminSession(body)]))[0]
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

/**
 * Điều kiện role cho endpoint quản trị.
 *
 * ⚠ Export để UI tắt query khi người dùng không đủ quyền, tránh gọi API
 *   và luôn nhận 403 (giống pattern `useTraySessionSummaries`).
 */
export function canAccessAdminSessions(roleId: number | undefined): boolean {
  return roleId === 1 || roleId === 2
}
