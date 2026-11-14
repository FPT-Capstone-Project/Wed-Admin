import { apiClient } from '../../../shared/api/client'
import { cleanQueryParams } from '../../../shared/api/list-response'
import { ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type {
  SessionEnvironmentGrowthStage,
  SessionEnvironmentHistoryQuery,
  SessionEnvironmentHistoryResult,
  SessionEnvironmentLatestResult,
  SessionEnvironmentPagination,
  SessionEnvironmentRecord,
} from '../types/session-environment-history.types'

/**
 * API lịch sử môi trường (Environment History) của phiên canh tác.
 *
 * ⚠ **100% READ-ONLY** — không thêm POST/PATCH/PUT/DELETE ở đây.
 *
 * ## Endpoints (tag Swagger `Environment History`)
 *
 *   - `GET /api/environment-history/sessions/{sessionId}`
 *     → lịch sử **phân trang** (trung bình 10 phút/tầng).
 *   - `GET /api/environment-history/sessions/{sessionId}/latest`
 *     → bản ghi **mới nhất** (hoặc `null` khi chưa có bucket nào được lưu).
 *
 * ## Vì sao thay API cũ?
 *
 * ⚠ Endpoint cũ `/api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *   đã bị BE **gỡ bỏ** (không còn trong Swagger ⇒ trả **404**).
 *   BE giờ tổng hợp sẵn dữ liệu **theo tầng** mỗi **10 phút** vào bảng
 *   `cultivation_environment_history` ⇒ 1 request phủ trọn cửa sổ 24 giờ.
 *
 * ## Phân quyền
 *
 * Swagger: *"Customers may access sessions belonging to their account; Admins
 * and Farm Operators may access any session."* ⇒ Web Admin (role 1/2) đọc được
 * mọi phiên.
 */

/** Base endpoint nhóm Environment History. */
export const ENVIRONMENT_HISTORY_URL = '/api/environment-history'

/**
 * `pageSize` tối đa mà BE **chắc chắn** chấp nhận.
 *
 * ⚠ BE giới hạn cứng 100 (`Backend/src/utils/pagination.js` →
 *   `MAX_PAGE_SIZE = 100`, và `parsePagination` **ném 400** nếu vượt quá).
 *   ⇒ Ta dùng 100 làm mức an toàn; không "thử 500 rồi fallback" vì mỗi lần
 *   thử sai đều tốn 1 round-trip và gây 400 log trên BE.
 */
const SAFE_PAGE_SIZE = 100

/**
 * GET `/api/environment-history/sessions/{sessionId}`
 *
 * Lịch sử môi trường **đã gộp sẵn 10 phút/tầng** của phiên, có phân trang.
 *
 * ⚠ Response 200 **chưa có schema** trong Swagger (chỉ `description` dạng
 *   text) ⇒ ta đọc **nhiều vị trí** ứng viên cho mảng bản ghi thay vì đoán
 *   cứng 1 shape.
 *
 * @returns `null` khi BE trả 404 (phiên không tồn tại / không được phép).
 */
export async function fetchSessionEnvironmentHistory(
  sessionId: number,
  query: SessionEnvironmentHistoryQuery = {},
): Promise<SessionEnvironmentHistoryResult | null> {
  const params = cleanQueryParams({
    from: query.from,
    to: query.to,
    page: query.page,
    pageSize: query.pageSize,
  })

  try {
    const response = await apiClient.get<unknown>(
      `${ENVIRONMENT_HISTORY_URL}/sessions/${sessionId}`,
      { params },
    )
    const body = ensureObject<Record<string, unknown>>(response.data)
    if (!body) return null

    return {
      records: pickRecords(body),
      pagination: normalizeEnvironmentPagination(body),
    }
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

/**
 * GET `/api/environment-history/sessions/{sessionId}/latest`
 *
 * Bản ghi môi trường **mới nhất** của phiên.
 *
 * ⚠ BE trả `{ "data": null }` khi chưa có bucket nào được lưu ⇒ **không** phải
 *   lỗi ⇒ trả `null` (UI hiển thị empty state).
 *
 * @returns `null` khi BE trả 404 **hoặc** khi chưa có bản ghi nào.
 */
export async function fetchLatestSessionEnvironment(
  sessionId: number,
): Promise<SessionEnvironmentLatestResult> {
  try {
    const response = await apiClient.get<unknown>(
      `${ENVIRONMENT_HISTORY_URL}/sessions/${sessionId}/latest`,
    )
    const body = ensureObject<Record<string, unknown>>(response.data)
    if (!body) return null

    /*
     * ⚠ Shape BE: `{ data: { …record… } }` — wrapper `data` là **object**.
     *
     *   `ensureObject` đã bóc 1 cấp wrapper `data` ⇒ `body` chính là record.
     *
     * ⚠ Nhưng khi BE trả `{ "data": null }` (chưa có bucket nào được lưu),
     *   `ensureObject` **không** bóc (vì `data` là `null`) ⇒ `body` vẫn là
     *   wrapper ⇒ phải kiểm tra `data` một cách tường minh.
     */
    if ('data' in body) {
      const nested = body.data
      if (nested === null || nested === undefined) return null
      return normalizeEnvironmentRecord(nested)
    }

    return normalizeEnvironmentRecord(body)
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

/**
 * Gộp **toàn bộ** lịch sử môi trường của phiên trong 1 cửa sổ thời gian.
 *
 * ⚠ Biểu đồ cần **nhiều điểm** ⇒ phải lặp trang (BE giới hạn `pageSize` 100).
 *   Khi đã lấy đủ `totalPages` thì dừng ⇒ không kéo thừa.
 *
 * ⚠ **Vì sao cần theo khoảng thời gian?**
 *   BE sắp xếp **tăng dần** theo `period_start` ⇒ `from`/`to` lọc ở phía BE
 *   (khoảng `[from, to)`) ⇒ mỗi mốc thời gian có dữ liệu riêng, không bị
 *   "co cụm" về vài chút cuối cùng.
 *
 * @returns Mảng rỗng khi không có dữ liệu / route chưa tồn tại.
 */
export async function fetchAllSessionEnvironmentRecords(
  sessionId: number,
  options: {
    from?: number
    to?: number
    pageSize?: number
    maxPages?: number
  } = {},
): Promise<SessionEnvironmentRecord[]> {
  const pageSize = Math.min(
    SAFE_PAGE_SIZE,
    Math.max(1, options.pageSize ?? SAFE_PAGE_SIZE),
  )
  /*
   * ⚠ **Trần cứng 20 trang** (≈2.000 bản ghi).
   *
   * Lý do: dữ liệu đã gộp 10 phút/tầng ⇒ 24 giờ × 6 tầng ≈ 864 bản ghi
   *   ⇒ 9 trang là đủ. Trần 20 trang để an toàn nếu phiên có nhiều tầng.
   */
  const maxPages = Math.min(
    Math.max(1, options.maxPages ?? 20),
    20,
  )

  const params = cleanQueryParams({
    from:
      options.from != null ? new Date(options.from).toISOString() : undefined,
    to: options.to != null ? new Date(options.to).toISOString() : undefined,
  })

  const first = await fetchSessionEnvironmentHistory(sessionId, {
    ...params,
    page: 1,
    pageSize,
  })
  if (!first) return []

  const collected: SessionEnvironmentRecord[] = [...first.records]
  const totalPages = Math.min(first.pagination.totalPages, maxPages)
  if (totalPages <= 1) return collected

  /*
   * ⚠ Lấy trang **song song theo lô** (mỗi lô 5 trang) — tránh throttle BE
   *   khi mở drawer.
   */
  const FETCH_PAGE_BATCH_SIZE = 5
  for (let page = 2; page <= totalPages; page += FETCH_PAGE_BATCH_SIZE) {
    const batch = Array.from(
      { length: Math.min(FETCH_PAGE_BATCH_SIZE, totalPages - page + 1) },
      (_, index) => page + index,
    )

    const results = await Promise.all(
      batch.map((target) =>
        fetchSessionEnvironmentHistory(sessionId, {
          ...params,
          page: target,
          pageSize,
        }),
      ),
    )

    for (const result of results) {
      collected.push(...(result?.records ?? []))
    }
  }

  return collected
}

/**
 * Lấy **bản ghi mới nhất** của phiên — theo thứ tự thời gian **giảm dần**.
 *
 * ⚠ **Vì sao cần hàm riêng?**
 *
 *   BE sắp xếp `ORDER BY period_start ASC` ⇒ **trang 1 là bản ghi CŨ NHẤT**.
 *   Ta cần bản ghi **MỚI NHẤT** ⇒ phải đi từ **trang cuối** ngược lại.
 *
 * ⚠ Cách tính:
 *   - Trang cuối chứa `total - (totalPages - 1) * pageSize` bản ghi.
 *   - Mỗi trang trước đó chứa đúng `pageSize` bản ghi.
 *   ⇒ Cần bao nhiêu trang cuối thì cộng dồn cho tới khi đủ `limit`.
 *
 * @returns Bản ghi đã sort giảm dần (mới nhất trước) + phân trang gốc của BE.
 */
export async function fetchNewestSessionEnvironmentRecords(
  sessionId: number,
  options: { limit?: number } = {},
): Promise<SessionEnvironmentHistoryResult | null> {
  const limit = Math.max(1, options.limit ?? 200)
  const pageSize = SAFE_PAGE_SIZE

  const first = await fetchSessionEnvironmentHistory(sessionId, {
    page: 1,
    pageSize,
  })
  if (!first) return null

  const { total, totalPages } = first.pagination
  if (total === 0 || totalPages <= 1) {
    return {
      records: sortRecordsByPeriodDesc(first.records).slice(0, limit),
      pagination: first.pagination,
    }
  }

  // Số bản ghi nằm ở trang cuối (trang cuối có thể **không đầy**).
  const lastPageCount = total - (totalPages - 1) * pageSize
  let neededPages = 1
  let collected = lastPageCount
  while (collected < limit && neededPages < totalPages) {
    neededPages += 1
    collected += pageSize
  }

  const startPage = Math.max(1, totalPages - neededPages + 1)
  const targetPages = Array.from(
    { length: totalPages - startPage + 1 },
    (_, index) => startPage + index,
  )

  const results = await Promise.all(
    targetPages.map((page) =>
      fetchSessionEnvironmentHistory(sessionId, { page, pageSize }),
    ),
  )

  const records: SessionEnvironmentRecord[] = []
  for (const result of results) records.push(...(result?.records ?? []))

  return {
    records: sortRecordsByPeriodDesc(records).slice(0, limit),
    pagination: first.pagination,
  }
}

/** Sort bản ghi theo `period_start` **giảm dần** (mới nhất trước). */
function sortRecordsByPeriodDesc(
  records: readonly SessionEnvironmentRecord[],
): SessionEnvironmentRecord[] {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.period_start ?? '')
    const rightTime = Date.parse(right.period_start ?? '')
    const leftValid = Number.isFinite(leftTime)
    const rightValid = Number.isFinite(rightTime)

    // Bản ghi không có mốc thời gian ⇒ đẩy xuống cuối.
    if (leftValid !== rightValid) return leftValid ? -1 : 1
    if (leftValid && rightValid && leftTime !== rightTime) {
      return rightTime - leftTime
    }

    // Tie-break theo `floor_id` tăng dần ⇒ thứ tự **ổn định**.
    return (left.floor_id ?? 0) - (right.floor_id ?? 0)
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Chuẩn hoá 1 bản ghi lịch sử môi trường. */
export function normalizeEnvironmentRecord(
  raw: unknown,
): SessionEnvironmentRecord | null {
  const obj = ensureObject<Record<string, unknown>>(raw)
  if (!obj) return null

  return {
    session_id: pickNumber(obj, 'session_id', 'sessionId'),
    floor_id: pickNumber(obj, 'floor_id', 'floorId'),
    period_start: pickString(obj, 'period_start', 'periodStart'),
    period_end: pickString(obj, 'period_end', 'periodEnd'),
    growth_stage: pickGrowthStage(obj.growth_stage ?? obj.growthStage),
    temperature_avg: pickNumber(
      obj,
      'temperature_avg',
      'temperatureAvg',
      'temperature',
    ),
    humidity_avg: pickNumber(obj, 'humidity_avg', 'humidityAvg', 'humidity'),
  }
}

/** Giai đoạn canh tác hợp lệ — BE trả `UNKNOWN` khi chưa có tiến độ. */
const GROWTH_STAGES: readonly SessionEnvironmentGrowthStage[] = [
  'FRUITING_INITIATION',
  'PINNING',
  'YOUNG_FRUITING',
  'MATURATION',
  'UNKNOWN',
]

function pickGrowthStage(value: unknown): SessionEnvironmentGrowthStage | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return GROWTH_STAGES.includes(normalized as SessionEnvironmentGrowthStage)
    ? (normalized as SessionEnvironmentGrowthStage)
    : null
}

/**
 * Tìm mảng bản ghi trong response — thử nhiều vị trí ứng viên vì schema 200
 * chưa được công khai.
 *
 * ⚠ Shape thực tế của BE: `{ data: [...], pagination: {...} }` ⇒ `data` là
 *   **mảng**. `ensureObject` chỉ bóc wrapper `data` khi nó là **object** ⇒
 *   với mảng, `body` vẫn là object gốc ⇒ ta đọc `body.data` ở đây.
 */
function pickRecords(body: Record<string, unknown>): SessionEnvironmentRecord[] {
  const candidates = [
    body.data,
    body.records,
    body.items,
    body.content,
  ]

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    return candidate
      .map((item) => normalizeEnvironmentRecord(item))
      .filter((item): item is SessionEnvironmentRecord => item !== null)
  }
  return []
}

/**
 * Chuẩn hoá phân trang — BE trả `{ page, pageSize, total, totalPages }` ở
 * cấp gốc.
 */
function normalizeEnvironmentPagination(
  body: Record<string, unknown>,
): SessionEnvironmentPagination {
  const source =
    ensureObject<Record<string, unknown>>(body.pagination) ??
    ensureObject<Record<string, unknown>>(body.meta) ??
    body

  const page = pickNumber(source, 'page', 'currentPage') ?? 1
  const pageSize = pickNumber(source, 'pageSize', 'page_size', 'limit') ?? 20
  const total = pickNumber(source, 'total', 'totalItems') ?? 0
  const totalPages =
    pickNumber(source, 'totalPages', 'total_pages') ??
    (pageSize > 0 ? Math.ceil(total / pageSize) : 0)

  return { page, pageSize, total, totalPages }
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
    // BE có thể trả số dạng chuẩn ("12") → ép an toàn.
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}
