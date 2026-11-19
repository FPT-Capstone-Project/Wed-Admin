import { keepPreviousData, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  fetchAllSessionEnvironmentRecords,
  fetchNewestSessionEnvironmentRecords,
  fetchSessionEnvironmentHistory,
  fetchSessionDailyAverages,
} from '../api/session-environment-history.api'
import {
  environmentRecordsToClimatePoints,
  type SessionClimatePoint,
} from '../utils/session-environment-aggregation.utils'
import {
  resolveTimeRangeWindow,
  type SessionSensorTimeRange,
} from '../utils/session-sensor-aggregation.utils'
import { filterRecordsBySessionFloorScope, sortEnvironmentRecordsByTimeDesc } from '../utils/session-floor-matching.utils'
import type {
  SessionEnvironmentHistoryQuery,
  SessionEnvironmentHistoryResult,
  SessionEnvironmentLatestResult,
  SessionEnvironmentRecord,
} from '../types/session-environment-history.types'

/**
 * Hooks **Environment History** của một phiên canh tác — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không ghi dữ liệu môi trường.
 *
 * ## Nguồn (tag Swagger `Environment History`)
 *
 *   - `GET /api/environment-history/sessions/{sessionId}` — lịch sử phân trang.
 *   - `GET /api/environment-history/sessions/{sessionId}/latest` — bản ghi mới nhất.
 */

/**
 * Số bản ghi **mới nhất** cần lấy để tìm bản ghi mới nhất **của đúng tầng**.
 *
 * ⚠ Vì sao cần nhiều hơn 1?
 *   BE có thể trả các bản ghi của **nhiều tầng** xen kẽ (dữ liệu cũ còn sót)
 *   ⇒ bản ghi mới nhất *tuyệt đối* có thể thuộc tầng khác ⇒ ta lấy một lô
 *   bản ghi mới nhất, lọc theo tầng của phiên rồi mới lấy `records[0]`.
 *
 * ⚠ 200 bản ghi = 2 trang × 100 ⇒ đủ để vượt qua lượng bản ghi rác.
 */
const NEWEST_RECORDS_LIMIT = 200

/**
 * **Phạm vi tầng** dùng để lọc bản ghi cảm biến của 1 phiên.
 *
 * ⚠ `floorIds` = khoá kỹ thuật trong DB; `floorNumbers` = số tầng thực tế.
 */
export interface SessionFloorScopeOptions {
  /** Tập `floor_id` của các tầng thuộc phiên. */
  floorIds?: ReadonlySet<number>
  /** Tập `floor_number` của các tầng thuộc phiên. */
  floorNumbers?: ReadonlySet<number>
  /** Map `floor_id` → `floor_number` — dùng để suy ra số tầng thực tế. */
  floorNumberByFloorId?: ReadonlyMap<number, number>
}

/**
 * Dựng chữ ký ổn định của phạm vi tầng — dùng làm phần của query key.
 *
 * ⚠ `Set`/`Map` là object ⇒ tạo mới mỗi lần render ⇒ ta cần chuỗi đã sắp xếp
 *   để cache không bị phá khi component render lại.
 */
export function buildFloorScopeSignature(
  scope?: SessionFloorScopeOptions,
): string {
  const floorIds = [...(scope?.floorIds ?? [])].sort((a, b) => a - b)
  const floorNumbers = [...(scope?.floorNumbers ?? [])].sort((a, b) => a - b)
  const numberMap = [...(scope?.floorNumberByFloorId ?? new Map())]
    .sort(([a], [b]) => a - b)
    .map(([id, number]) => `${id}:${number}`)
  return `${floorIds.join(',')}|${floorNumbers.join(',')}|${numberMap.join(',')}`
}

/**
 * Query keys cho Environment History của phiên.
 *
 * ⚠ Tách 2 nhánh `history` / `latest` vì đây là **2 endpoint khác nhau**:
 *   bảng "Dữ liệu cảm biến chi tiết" cần **phân trang server-side**, còn ô
 *   "chỉ số mới nhất" chỉ cần **1 bản ghi**.
 */
export const sessionEnvironmentHistoryKeys = {
  daily: (sessionId: number) => ['session-environment-history', 'daily-averages', sessionId] as const,
  all: ['session-environment-history'] as const,
  /** Lịch sử phân trang — `/api/environment-history/sessions/{id}`. */
  history: () => [...sessionEnvironmentHistoryKeys.all, 'history'] as const,
  historyList: (
    sessionId: number,
    query: SessionEnvironmentHistoryQuery,
  ) => [...sessionEnvironmentHistoryKeys.history(), sessionId, query] as const,
  /** Bản ghi mới nhất — `/api/environment-history/sessions/{id}/latest`. */
  latest: () => [...sessionEnvironmentHistoryKeys.all, 'latest'] as const,
  latestOne: (sessionId: number) =>
    [...sessionEnvironmentHistoryKeys.latest(), sessionId] as const,
  /** Lô bản ghi **mới nhất** (đã lọc theo tầng + sort giảm dần). */
  newest: (sessionId: number) =>
    [...sessionEnvironmentHistoryKeys.all, 'newest', sessionId] as const,
  /** Biểu đồ — gom nhiều trang theo cửa sổ thời gian. */
  chart: (sessionId: number, timeRange: SessionSensorTimeRange) =>
    [...sessionEnvironmentHistoryKeys.history(), 'chart', sessionId, timeRange] as const,
}

export function useSessionDailyAverages(sessionId: number | null, enabled = true) {
  return useQuery({
    queryKey: sessionEnvironmentHistoryKeys.daily(sessionId ?? -1),
    queryFn: ({ signal }) => fetchSessionDailyAverages(sessionId as number, signal),
    enabled: enabled && sessionId != null && Number.isSafeInteger(sessionId) && sessionId > 0,
    staleTime: 60_000,
  })
}

/**
 * Lịch sử môi trường của phiên — **1 trang** (bảng phân trang server-side).
 *
 * @param enabled Chặn gọi API khi tab chưa mở — tránh tải thừa.
 */
export function useSessionEnvironmentHistory(
  sessionId: number | null,
  query: SessionEnvironmentHistoryQuery = {},
  options?: Partial<
    UseQueryOptions<SessionEnvironmentHistoryResult | null, Error>
  >,
) {
  return useQuery<SessionEnvironmentHistoryResult | null, Error>({
    queryKey: sessionEnvironmentHistoryKeys.historyList(
      sessionId ?? -1,
      query,
    ),
    queryFn: () => fetchSessionEnvironmentHistory(sessionId as number, query),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    ...options,
    // ⚠ `enabled` phải đặt **SAU** `...options` để không bị caller ghi đè.
    enabled:
      sessionId !== null &&
      sessionId > 0 &&
      (options?.enabled ?? true),
  })
}

/**
 * Bản ghi môi trường **mới nhất** của phiên — đã **lọc theo tầng của phiên**.
 *
 * ⚠ Trả `null` khi:
 *   - BE trả `{ "data": null }` (chưa có bucket nào được lưu) — **không** lỗi.
 *   - BE trả 404 (phiên không tồn tại / không được phép).
 *   - Bản ghi mới nhất **không** thuộc tầng của phiên (dữ liệu rác).
 *
 * @param scope Phạm vi tầng của phiên — dùng để loại bản ghi của tầng khác.
 * @param floorNumberByFloorId Map `floor_id` → `floor_number` (số tầng thực tế)
 *   — dùng để so sánh theo "đúng tầng" (xem `buildFloorNumberMap`).
 */
export function useLatestSessionEnvironment(
  sessionId: number | null,
  scope?: SessionFloorScopeOptions,
  options?: Partial<
    UseQueryOptions<SessionEnvironmentLatestResult, Error>
  >,
) {
  const { data, ...rest } = useNewestSessionEnvironmentRecords(
    sessionId,
    scope,
    {
      limit: NEWEST_RECORDS_LIMIT,
      ...(options as Partial<
        UseQueryOptions<SessionEnvironmentRecord[], Error>
      >),
    },
  )
  // ⚠ `data` đã sort giảm dần + lọc theo tầng ⇒ `data[0]` là bản ghi mới
  //   nhất **của đúng tầng của phiên**.
  return { data: data?.[0] ?? null, ...rest }
}

/**
 * Bản ghi môi trường **mới nhất** của phiên — đã **lọc + sort giảm dần**.
 *
 * ⚠ **Nguồn dữ liệu duy nhất** cho cả 3 nơi:
 *   1. Hộp "Chỉ số môi trường mới nhất" (`records[0]`).
 *   2. Bảng "Dữ liệu cảm biến chi tiết" (dòng đầu tiên).
 *   3. Mốc neo của biểu đồ (khi phiên đã kết thúc).
 *
 *   ⇒ 3 nơi **luôn khớp nhau** ⇒ không còn hiện tượng hộp "chỉ số mới nhất"
 *   báo Tầng 3 trong khi biểu đồ / bảng đang ở Tầng 2.
 *
 * ⚠ **Vì sao không dùng endpoint `/latest` của BE?**
 *   BE trả bản ghi mới nhất **của mọi tầng** ⇒ có thể là bản ghi rác của
 *   tầng khác (dữ liệu cũ còn sót) ⇒ hiển thị **sai tầng**.
 *   ⇒ Ta lấy **một lô** bản ghi mới nhất → **lọc** theo tầng của phiên →
 *     **sort giảm dần** → `records[0]`.
 *
 * @param scope Phạm vi tầng của phiên.
 * @param floorNumberByFloorId Map `floor_id` → `floor_number`.
 */
export function useNewestSessionEnvironmentRecords(
  sessionId: number | null,
  scope?: SessionFloorScopeOptions,
  options?: Partial<
    UseQueryOptions<SessionEnvironmentRecord[], Error>
  > & { limit?: number },
) {
  const limit = options?.limit ?? NEWEST_RECORDS_LIMIT

  return useQuery<SessionEnvironmentRecord[], Error>({
    // Only inputs sent to the server belong in the network cache key.
    queryKey: [...sessionEnvironmentHistoryKeys.newest(sessionId ?? -1), limit],
    queryFn: async () => {
      const result = await fetchNewestSessionEnvironmentRecords(sessionId as number, { limit })
      return result?.records ?? []
    },
    staleTime: 30_000,
    ...options,
    select: (records) => sortEnvironmentRecordsByTimeDesc(
      filterRecordsBySessionFloorScope(
        records,
        { floorIds: scope?.floorIds ?? new Set<number>(), floorNumbers: scope?.floorNumbers ?? new Set<number>() },
        scope?.floorNumberByFloorId ?? new Map<number, number>(),
      ),
    ),
    enabled: Boolean(sessionId && sessionId > 0) && (options?.enabled ?? true),
  })
}

/**
 * Telemetry cảm biến cho **biểu đồ** — chuẩn hoá về 1 shape chung.
 *
 * ⚠ Query này **không** phụ thuộc phân trang UI ⇒ đổi trang bảng không làm
 *   vẽ lại biểu đồ.
 *
 * ## Vì sao chỉ còn 1 nguồn?
 *
 * ⚠ Nguồn raw (`/iot-history/sensors`) đã bị BE gỡ bỏ ⇒ mọi mốc thời gian
 *   đều dùng `GET /api/environment-history/sessions/{sessionId}` với cửa sổ
 *   `from`/`to` tương ứng ⇒ 1 request (vài trang) phủ trọn cửa sổ, không bị
 *   "co cụm" về vài chút cuối cùng.
 *
 * @param floorLabels Nhãn hiển thị của tầng — tra theo `floor_id` để tooltip
 *   hiện "Tầng 1" thay vì "Tầng #1".
 * @param anchorEnd Mốc **neo** của cửa sổ (epoch ms) — dùng cho **phiên đã
 *   kết thúc** để cửa sổ lùi về cuối phiên thay vì tính từ `now`
 *   (xem `resolveSessionChartAnchor`).
 */
export function useSessionEnvironmentChart(
  sessionId: number | null,
  timeRange: SessionSensorTimeRange = '1h',
  floorLabels: ReadonlyMap<number, string> = new Map(),
  anchorEnd: number | null = null,
  scope?: SessionFloorScopeOptions,
  options?: Partial<Omit<UseQueryOptions<SessionEnvironmentRecord[], Error, SessionClimatePoint[]>, 'queryKey' | 'queryFn' | 'select'>>,
) {
  return useQuery<SessionEnvironmentRecord[], Error, SessionClimatePoint[]>({
    queryKey: [
      ...sessionEnvironmentHistoryKeys.chart(sessionId ?? -1, timeRange),
      anchorEnd ?? 'now',
    ],
    queryFn: () => {
      const window = resolveTimeRangeWindow(timeRange, new Date(), anchorEnd)
      return fetchAllSessionEnvironmentRecords(sessionId as number, { from: window.start, to: window.end })
    },
    // Metadata changes reselect cached records without another HTTP request.
    select: (records) => environmentRecordsToClimatePoints(
      filterRecordsBySessionFloorScope(
        records,
        { floorIds: scope?.floorIds ?? new Set<number>(), floorNumbers: scope?.floorNumbers ?? new Set<number>() },
        scope?.floorNumberByFloorId ?? new Map<number, number>(),
      ),
      floorLabels,
    ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    ...options,
    enabled: Boolean(sessionId && sessionId > 0) && (options?.enabled ?? true),
  })
}
