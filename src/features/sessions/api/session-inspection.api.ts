/**
 * API layer cho kiểm tra khay hằng ngày (giai đoạn 2) — **chỉ đọc**.
 *
 * Nguồn (BE):
 *   - `GET /api/cultivation-sessions/{sessionId}/daily-inspections`
 *   - `GET /api/cultivation-sessions/{sessionId}/trays/{sessionTrayId}/daily-inspections`
 *   - `GET /api/cultivation-sessions/admin/{sessionId}/daily-inspections`
 *   - `GET /api/cultivation-sessions/admin/{sessionId}/trays/{sessionTrayId}/daily-inspections`
 *
 * ⚠ BE bọc `{ data: {...} }` (xem `cultivationSession.controller.js`) ⇒
 *   `ensureObject` bóc đúng 1 cấp.
 *
 * ⚠ **Phân biệt endpoint admin / không admin**: BE đăng ký **cả hai** biến
 *   thể với cùng handler (`cultivationSession.routes.js`) ⇒ gọi biến thể
 *   không có `/admin` vẫn đúng cho Admin + Farm Operator + Customer.
 *   Module này dùng biến thể **không `/admin`** vì nó phù hợp cho cả 2
 *   màn hình (Session drawer + Tray drawer) và Customer.
 */
import { apiClient } from '../../../shared/api/client'
import { cleanQueryParams } from '../../../shared/api/list-response'
import { ensureObject } from '../../../shared/api/response-normalizer'
import {
  normalizeDailyInspection,
  normalizeDailyInspectionSession,
  normalizeDailyInspectionTray,
} from './session-inspection-normalizer'
import type {
  DailyInspection,
  DailyInspectionPagination,
  DailyInspectionQuery,
  SessionDailyInspectionResult,
  TrayDailyInspectionResult,
} from '../types/session-inspection.types'

/** Gốc endpoint — không kèm `/admin` (roles 1, 2, 3 đều gọi được). */
export const CULTIVATION_SESSIONS_URL = '/api/cultivation-sessions'

/** Số trang tối đa gộp lại — chặn kéo quá nhiều trang khi dữ liệu lớn. */
const DEFAULT_MAX_PAGES = 20

/**
 * GET /api/cultivation-sessions/{sessionId}/daily-inspections
 *
 * Lấy **toàn bộ** lần kiểm tra của mọi khay thuộc phiên (kèm ảnh).
 *
 * ⚠ Cần nhiều trang khi phiên có nhiều khay × nhiều ngày ⇒ hàm này gộp
 *   mọi trang (giới hạn `maxPages`) để UI không phải lọc bằng tay.
 */
export async function fetchSessionDailyInspections(
  sessionId: number,
  query: DailyInspectionQuery = {},
  options: { maxPages?: number } = {},
): Promise<SessionDailyInspectionResult> {
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 100))
  const url = `${CULTIVATION_SESSIONS_URL}/${sessionId}/daily-inspections`

  const pages = await fetchAllPages(url, pageSize, maxPages)

  return {
    session: normalizeDailyInspectionSession(pages[0]?.session),
    inspections: pages.flatMap((page) => page.inspections),
    pagination: buildPagination(pages[0]?.pagination, pageSize),
  }
}

/**
 * GET /api/cultivation-sessions/{sessionId}/trays/{sessionTrayId}/daily-inspections
 *
 * Lấy lịch sử kiểm tra **chỉ của 1 khay** trong phiên (kèm ảnh).
 *
 * ⚠ `sessionTrayId` là `cultivation_session_trays.session_tray_id` —
 *   KHÔNG phải `cultivation_trays.tray_id` vật lý.
 */
export async function fetchTrayDailyInspections(
  sessionId: number,
  sessionTrayId: number,
  query: DailyInspectionQuery = {},
  options: { maxPages?: number } = {},
): Promise<TrayDailyInspectionResult> {
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 100))
  const url = `${CULTIVATION_SESSIONS_URL}/${sessionId}/trays/${sessionTrayId}/daily-inspections`

  const pages = await fetchAllPages(url, pageSize, maxPages)

  return {
    tray: normalizeDailyInspectionTray(pages[0]?.tray),
    inspections: pages.flatMap((page) => page.inspections),
    pagination: buildPagination(pages[0]?.pagination, pageSize),
  }
}

// ─── Internals ───────────────────────────────────────────────────────────

/** Shape thô của 1 trang response (trước khi chuẩn hoá theo từng biến thể). */
interface RawInspectionPage {
  session?: unknown
  tray?: unknown
  inspections: DailyInspection[]
  pagination: DailyInspectionPagination
}

/** Gọi từng trang song song (giới hạn `maxPages`) rồi gộp lại. */
async function fetchAllPages(
  url: string,
  pageSize: number,
  maxPages: number,
): Promise<RawInspectionPage[]> {
  const first = await fetchInspectionPage(url, 1, pageSize)
  const totalPages = Math.min(first.pagination.totalPages, maxPages)
  if (totalPages <= 1) return [first]

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchInspectionPage(url, index + 2, pageSize),
    ),
  )

  return [first, ...rest]
}

/** Gọi 1 trang + chuẩn hoá shape thô. */
async function fetchInspectionPage(
  url: string,
  page: number,
  pageSize: number,
): Promise<RawInspectionPage> {
  const params = cleanQueryParams({ page, pageSize })

  const response = await apiClient.get<unknown>(url, { params })
  const body = ensureObject<Record<string, unknown>>(response.data)
  if (!body) {
    throw new Error('Dữ liệu kiểm tra khay không đúng định dạng')
  }

  return {
    session: body.session,
    tray: body.tray,
    inspections: (Array.isArray(body.inspections) ? body.inspections : []).map(
      normalizeDailyInspection,
    ),
    pagination: normalizePagination(body.pagination),
  }
}

/** Chuẩn hoá metadata phân trang — BE trả kèm trong `data.pagination`. */
function normalizePagination(raw: unknown): DailyInspectionPagination {
  const obj = ensureObject<Record<string, unknown>>(raw)
  const page = pickNumber(obj, 'page') ?? 1
  const pageSize = pickNumber(obj, 'pageSize') ?? 20
  const total = pickNumber(obj, 'total') ?? 0
  const totalPages =
    pickNumber(obj, 'totalPages') ?? Math.ceil(total / Math.max(1, pageSize))
  return { page, pageSize, total, totalPages }
}

/** Gộp phân trang khi đã gộp nhiều trang. */
function buildPagination(
  first: DailyInspectionPagination | undefined,
  pageSize: number,
): DailyInspectionPagination {
  return {
    page: 1,
    pageSize,
    total: first?.total ?? 0,
    totalPages: first?.totalPages ?? 0,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function pickNumber(obj: Record<string, unknown> | null, ...keys: string[]) {
  if (!obj) return null
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
