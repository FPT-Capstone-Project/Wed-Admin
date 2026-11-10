import { keepPreviousData, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  fetchAllSessionEnvironmentRecords,
  fetchLatestSessionEnvironment,
  fetchSessionEnvironmentHistory,
} from '../api/session-environment-history.api'
import {
  environmentRecordsToClimatePoints,
  type SessionClimatePoint,
} from '../utils/session-environment-aggregation.utils'
import {
  resolveTimeRangeWindow,
  type SessionSensorTimeRange,
} from '../utils/session-sensor-aggregation.utils'
import type {
  SessionEnvironmentHistoryQuery,
  SessionEnvironmentHistoryResult,
  SessionEnvironmentLatestResult,
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
 * Query keys cho Environment History của phiên.
 *
 * ⚠ Tách 2 nhánh `history` / `latest` vì đây là **2 endpoint khác nhau**:
 *   bảng "Dữ liệu cảm biến chi tiết" cần **phân trang server-side**, còn ô
 *   "chỉ số mới nhất" chỉ cần **1 bản ghi**.
 */
export const sessionEnvironmentHistoryKeys = {
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
  /** Biểu đồ — gom nhiều trang theo cửa sổ thời gian. */
  chart: (sessionId: number, timeRange: SessionSensorTimeRange) =>
    [...sessionEnvironmentHistoryKeys.history(), 'chart', sessionId, timeRange] as const,
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
 * Bản ghi môi trường **mới nhất** của phiên.
 *
 * ⚠ Trả `null` khi:
 *   - BE trả `{ "data": null }` (chưa có bucket nào được lưu) — **không** lỗi.
 *   - BE trả 404 (phiên không tồn tại / không được phép).
 */
export function useLatestSessionEnvironment(
  sessionId: number | null,
  options?: Partial<
    UseQueryOptions<SessionEnvironmentLatestResult, Error>
  >,
) {
  return useQuery<SessionEnvironmentLatestResult, Error>({
    queryKey: sessionEnvironmentHistoryKeys.latestOne(sessionId ?? -1),
    queryFn: () => fetchLatestSessionEnvironment(sessionId as number),
    staleTime: 30_000,
    ...options,
    // ⚠ `enabled` phải đặt **SAU** `...options` để không bị caller ghi đè.
    enabled:
      sessionId !== null &&
      sessionId > 0 &&
      (options?.enabled ?? true),
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
  options?: Partial<UseQueryOptions<SessionClimatePoint[], Error>>,
) {
  /*
   * ⚠ **Chữ ký nội dung map tầng** — dùng làm phần của query key.
   *
   *   `Map` là object ⇒ tạo mới mỗi lần render. Ta dùng chuỗi đã sắp xếp làm
   *   key ⇒ ổn định, và cache không bị phá khi component render lại.
   */
  const floorSignature = useMemo(
    () =>
      [...floorLabels.entries()]
        .sort(([left], [right]) => left - right)
        .map(([id, label]) => `${id}:${label}`)
        .join(','),
    [floorLabels],
  )

  return useQuery<SessionClimatePoint[], Error>({
    queryKey: [
      ...sessionEnvironmentHistoryKeys.chart(sessionId ?? -1, timeRange),
      floorSignature,
      /*
       * ⚠ Mốc neo là **phần của query key** ⇒ đổi mốc neo (phiên đóng ⇒
       *   cuối phiên) sẽ kích hoạt fetch lại với cửa sổ mới.
       */
      anchorEnd ?? 'now',
    ],
    queryFn: async () => {
      const window = resolveTimeRangeWindow(timeRange, new Date(), anchorEnd)
      const records = await fetchAllSessionEnvironmentRecords(
        sessionId as number,
        { from: window.start, to: window.end },
      )
      if (records.length === 0) return []

      return environmentRecordsToClimatePoints(records, floorLabels)
    },
    /*
     * ⚠ **`keepPreviousData`** — giữ dữ liệu của mốc cũ trong lúc tải mốc mới.
     *
     *   Vì sao KHÔNG dùng `placeholderData: () => []`?
     *   → Xóa sạch dữ liệu khiến biểu đồ nhấp nháy / trống trơn, và mất
     *     ngữ cảnh xu hướng trong lúc chờ ⇒ trải nghiệm tệ hơn.
     *
     *   → Thay vào đó: giữ đường cũ + hiển thị trạng thái mờ (opacity) và
     *     spinner ở góc biểu đồ (xem prop `loading` của `SessionSensorChart`),
     *     rồi **mượt chuyển** sang trục thời gian mới khi fetch xong.
     */
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    ...options,
    // ⚠ `enabled` phải đặt **SAU** `...options` để không bị caller ghi đè.
    enabled:
      sessionId !== null &&
      sessionId > 0 &&
      (options?.enabled ?? true),
  })
}
