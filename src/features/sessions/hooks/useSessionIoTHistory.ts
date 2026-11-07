import { keepPreviousData, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  fetchAllSessionCommands,
  fetchAllSessionSensorReadings,
  fetchSessionEnvironmentHistory,
  fetchSessionIoTHistory,
  fetchSessionSensorHistory,
} from '../api/session-iot-history.api'
import {
  aggregateReadingsByBucket,
  filterReadingsByTimeRange,
  mergeFloorClimatePoints,
  resolveTimeRangeStart,
  resolveTimeRangeWindow,
  SENSOR_TIME_RANGE_BUCKET_MINUTES,
  SENSOR_TIME_RANGE_MAX_PAGES,
  SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE,
  type FloorClimatePointInput,
  type SessionClimatePoint,
  type SessionSensorTimeRange,
} from '../utils/session-sensor-aggregation.utils'
import type {
  SessionDeviceCommand,
  SessionIoTHistoryQuery,
  SessionIoTHistoryResult,
  SessionMappedFloor,
  SessionSensorHistoryResult,
} from '../types/session-iot-history.types'

/**
 * Hooks lịch sử IoT của một phiên canh tác — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không phát lệnh thiết bị, không
 *   sửa cấu hình cảm biến.
 */

/**
 * Query keys cho lịch sử IoT của phiên.
 *
 * ⚠ Tách 2 nhánh `commands` / `sensors` vì đây là **2 endpoint khác nhau**:
 *   `/iot-history` (lệnh thiết bị + tầng map) và
 *   `/iot-history/sensors` (telemetry nhiệt độ / độ ẩm).
 */
export const sessionIoTHistoryKeys = {
  all: ['admin-session-iot-history'] as const,
  /** Nhánh lệnh thiết bị — `/iot-history`. */
  commands: () => [...sessionIoTHistoryKeys.all, 'commands'] as const,
  commandList: (sessionId: number, query: SessionIoTHistoryQuery) =>
    [...sessionIoTHistoryKeys.commands(), sessionId, query] as const,
  /** Nhánh telemetry cảm biến — `/iot-history/sensors`. */
  sensors: () => [...sessionIoTHistoryKeys.all, 'sensors'] as const,
  sensorList: (sessionId: number, query: SessionIoTHistoryQuery) =>
    [...sessionIoTHistoryKeys.sensors(), sessionId, query] as const,
  /** Biểu đồ — đã gộp nhiều trang, theo khoảng thời gian. */
  sensorChart: (sessionId: number, timeRange: SessionSensorTimeRange) =>
    [...sessionIoTHistoryKeys.sensors(), 'chart', sessionId, timeRange] as const,
  /** Toàn bộ lệnh thiết bị của phiên (gom 1 lần, lọc client-side). */
  allCommands: (sessionId: number) =>
    [...sessionIoTHistoryKeys.commands(), 'all', sessionId] as const,
}

/**
 * Lịch sử **lệnh điều khiển thiết bị** + tầng đã map.
 *
 * Nguồn: `GET /api/cultivation-sessions/admin/{sessionId}/iot-history`
 *
 * ⚠ Trả `null` khi BE trả 404 (route chưa implement / phiên chưa có lịch sử
 *   IoT) ⇒ UI hiện empty state, không phải banner lỗi.
 *
 * @param enabled Chặn gọi API khi tab chưa mở — tránh tải thừa.
 */
export function useSessionIoTHistory(
  sessionId: number | null,
  query: SessionIoTHistoryQuery = {},
  options?: Partial<UseQueryOptions<SessionIoTHistoryResult | null, Error>>,
) {
  return useQuery<SessionIoTHistoryResult | null, Error>({
    queryKey: sessionIoTHistoryKeys.commandList(sessionId ?? -1, query),
    queryFn: () => fetchSessionIoTHistory(sessionId as number, query),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    ...options,
    /*
     * ⚠ `enabled` phải đặt **SAU** `...options` để không bị caller ghi đè.
     *
     * Điều kiện = (sessionId hợp lệ) **AND** (option của caller). Nếu để
     * `...options` sau `enabled`, thì `options.enabled = true` sẽ ghi đè ⇒
     * gọi API với `sessionId = null` ⇒ URL sai (`/admin/null/iot-history`).
     */
    enabled:
      sessionId !== null &&
      sessionId > 0 &&
      (options?.enabled ?? true),
  })
}

/**
 * Telemetry cảm biến — **1 trang** (dùng cho bảng phân trang server-side).
 *
 * Nguồn: `GET /api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 */
export function useSessionSensorHistory(
  sessionId: number | null,
  query: SessionIoTHistoryQuery = {},
  options?: Partial<UseQueryOptions<SessionSensorHistoryResult | null, Error>>,
) {
  return useQuery<SessionSensorHistoryResult | null, Error>({
    queryKey: sessionIoTHistoryKeys.sensorList(sessionId ?? -1, query),
    queryFn: () => fetchSessionSensorHistory(sessionId as number, query),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    ...options,
    // ⚠ Xem giải thích ở `useSessionIoTHistory` — `enabled` phải sau spread.
    enabled:
      sessionId !== null &&
      sessionId > 0 &&
      (options?.enabled ?? true),
  })
}

/**
 * Toàn bộ lệnh điều khiển thiết bị của phiên — gom **1 lần** rồi lọc/phân
 * trang client-side.
 *
 * ⚠ Phiên chỉ có vài trăm lệnh ⇒ tải hết rồi lọc ở FE ⇒ bộ lọc "Loại thiết bị"
 *   / "Trạng thái" áp dụng cho **100% lệnh**, không chỉ 20 dòng của trang hiện
 *   tại.
 */
export function useSessionAllCommands(
  sessionId: number | null,
  options?: Partial<
    UseQueryOptions<
      { commands: SessionDeviceCommand[]; floors: SessionMappedFloor[] } | null,
      Error
    >
  >,
) {
  return useQuery<
    { commands: SessionDeviceCommand[]; floors: SessionMappedFloor[] } | null,
    Error
  >({
    queryKey: sessionIoTHistoryKeys.allCommands(sessionId ?? -1),
    queryFn: () => fetchAllSessionCommands(sessionId as number),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    ...options,
    // ⚠ Xem giải thích ở `useSessionIoTHistory` — `enabled` phải sau spread.
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
 * ## Vì sao có 2 nguồn?
 *
 * | Mốc         | Nguồn                                    | Số request |
 * |-------------|------------------------------------------|------------|
 * | `1h`        | `/iot-history/sensors` (raw, gom tại FE)  | 3          |
 * | `6h/12h/24h`| `/analytics/.../environment-history`      | 1          |
 *
 *   - `1h` cần độ phân giải **1 phút/điểm** ⇒ nguồn gộp sẵn 15 phút của BE
 *     quá thô ⇒ giữ nguồn raw, chỉ kéo **3 trang** (mở Drawer tức thì).
 *   - `6h/12h/24h` cần phủ trọn cửa sổ. Nguồn raw chỉ hỗ trợ `page`/`pageSize`
 *     ⇒ 24 giờ cần ~519 trang ⇒ **không khả thi**. Nguồn gộp sẵn phủ trọn
 *     cửa sổ bằng **1 request** ⇒ trục thời gian không còn "co cụm".
 *
 * ⚠ Cả 2 nguồn đều được chuẩn hoá về `SessionClimatePoint` ⇒ component biểu
 *   đồ không cần biết dữ liệu đến từ đâu.
 */
export function useSessionSensorChart(
  sessionId: number | null,
  timeRange: SessionSensorTimeRange = '1h',
  floorIds: readonly number[] = [],
  options?: Partial<UseQueryOptions<SessionClimatePoint[], Error>>,
) {
  const usesServerAggregate = SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE[timeRange]

  /*
   * ⚠ **Chữ ký danh sách tầng** — dùng làm phần của query key.
   *
   *   Danh sách tầng là mảng ⇒ tạo mới mỗi lần render. Ta dùng chuỗi đã
   *   sắp xếp làm key ⇒ ổn định, và cache không bị phá khi component render
   *   lại (chỉ đổi khi tập tầng thực sự thay đổi).
   */
  const floorSignature = useMemo(
    () => [...new Set(floorIds)].sort((a, b) => a - b).join(','),
    [floorIds],
  )

  return useQuery<SessionClimatePoint[], Error>({
    queryKey: [
      ...sessionIoTHistoryKeys.sensorChart(sessionId ?? -1, timeRange),
      floorSignature,
    ],
    queryFn: async () => {
      if (usesServerAggregate) {
        const window = resolveTimeRangeWindow(timeRange)
        const result = await fetchSessionEnvironmentHistory({
          from: window.start,
          to: window.end,
        })
        if (!result) return []

        /*
         * ⚠ Endpoint trả dữ liệu của **mọi tầng ACTIVE** ⇒ chỉ giữ lại các
         *   tầng **thuộc phiên**.
         *
         *   Nguồn thô (`/iot-history/sensors`) cũng chỉ trả tầng của phiên
         *   (BE join `cultivation_session_trays`) ⇒ 2 nguồn nhất quán.
         */
        const allowedFloorIds = new Set(
          floorSignature.split(',').filter(Boolean).map(Number),
        )
        const relevantFloors = result.floors.filter((floor) =>
          allowedFloorIds.has(floor.floorId),
        )

        const series: FloorClimatePointInput[] = []
        relevantFloors.forEach((floor) => {
          floor.points.forEach((point) => {
            series.push({
              timestamp: point.timestamp,
              temperature: point.temperature,
              humidity: point.humidity,
              floorId: floor.floorId,
              floorLabel: floor.floorName,
            })
          })
        })

        const merged = mergeFloorClimatePoints(series)
        if (merged.length > 0) return merged

        /*
         * ⚠ **Fallback** sang nguồn raw.
         *
         *   `environment-history` chỉ trả tầng `status='ACTIVE'` ⇒ nếu tầng của
         *   phiên đã bị chuyển sang `INACTIVE` (phiên cũ, tầng ngưng hoạt động)
         *   thì endpoint trả về **không có tầng nào** của phiên.
         *
         *   → Quay về nguồn raw (`/iot-history/sensors`) để vẫn có dữ liệu
         *     (dù chỉ phủ phần đầu cửa sổ) thay vì trống trơn.
         */
        return aggregateReadingsByBucket(
          filterReadingsByTimeRange(
            await fetchAllSessionSensorReadings(sessionId as number, {
              maxPages: SENSOR_TIME_RANGE_MAX_PAGES[timeRange],
              startTimestamp: resolveTimeRangeStart(timeRange) ?? undefined,
            }),
            timeRange,
          ),
          SENSOR_TIME_RANGE_BUCKET_MINUTES[timeRange],
        )
      }

      const readings = await fetchAllSessionSensorReadings(sessionId as number, {
        maxPages: SENSOR_TIME_RANGE_MAX_PAGES[timeRange],
        startTimestamp: resolveTimeRangeStart(timeRange) ?? undefined,
      })
      /*
       * ⚠ Lọc theo cửa sổ đã chọn — nguồn raw trả bản ghi **mới nhất** trước
       *   nên về lý thuyết đã nằm trong cửa sổ, nhưng lọc lại để chắc chắn
       *   (và để điểm đầu tiên không vượt mép phải).
       */
      return aggregateReadingsByBucket(
        filterReadingsByTimeRange(readings, timeRange),
        SENSOR_TIME_RANGE_BUCKET_MINUTES[timeRange],
      )
    },
    /*
     * ⚠ **`keepPreviousData`** — giữ dữ liệu của mốc cũ trong lúc tải mốc mới.
     *
     * Vì sao KHÔNG dùng `placeholderData: () => []`?
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
    // ⚠ Xem giải thích ở `useSessionIoTHistory` — `enabled` phải sau spread.
    enabled:
      sessionId !== null &&
      sessionId > 0 &&
      (options?.enabled ?? true),
  })
}
