import { apiClient } from '../../../shared/api/client'
import { cleanQueryParams } from '../../../shared/api/list-response'
import { ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import {
  normalizeDeviceCommand,
  normalizeMappedFloor,
  normalizePagination,
  normalizeSensorReading,
  toArray,
} from './session-iot-history-normalizer'
import type {
  SessionDeviceCommand,
  SessionEnvironmentFloor,
  SessionEnvironmentHistoryResult,
  SessionEnvironmentThresholds,
  SessionIoTHistoryQuery,
  SessionIoTHistoryResult,
  SessionMappedFloor,
  SessionSensorHistoryResult,
  SessionSensorReading,
} from '../types/session-iot-history.types'

/**
 * Lịch sử IoT của một phiên canh tác — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *
 * Endpoints (tag Swagger `Cultivation Audit`):
 *   - `GET /api/cultivation-sessions/admin/{sessionId}/iot-history`
 *     → nhiệt độ + **lệnh ON/OFF thiết bị** + **tầng đã map** + phân trang.
 *   - `GET /api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *     → **nhiệt độ + độ ẩm raw** theo cảm biến + tầng + phân trang.
 *
 * ## Phân quyền
 *
 * Swagger: *"Admins and Farm Operators can view any session. Customers can
 * view sessions belonging to their account."* ⇒ Web Admin (role 1/2) đọc được
 * mọi phiên.
 *
 * ## Về HTTP 404
 *
 * ⚠ Route **đã được BE implement** (verify từ
 *   `Backend/src/routes/cultivationSession.routes.js`). Tuy nhiên vẫn giữ
 *   fallback 404 → `null` để không vỡ UI nếu BE rollback hoặc deploy chưa kịp.
 *   → Hàm bắt 404 và trả `null` ⇒ component hiển thị empty state có hướng dẫn,
 *     không báo lỗi đỏ.
 */

/** Base endpoint quản trị — roles 1 (Admin) và 2 (Farm Operator). */
export const ADMIN_SESSION_IOT_HISTORY_URL =
  '/api/cultivation-sessions/admin'

/**
 * `pageSize` tối đa mà BE **chắc chắn** chấp nhận.
 *
 * ⚠ BE **giới hạn cứng 100** (`Backend/src/services/cultivationSession.service.js`
 *   → `MAX_PAGE_SIZE = 100`, và `parsePagination` **ném 400** nếu vượt quá).
 *   ⇒ Ta dùng 100 làm mức an toàn; không "thử 500 rồi fallback" vì mỗi lần
 *   thử sai đều tốn 1 round-trip và gây 400 log trên BE.
 */
const SAFE_PAGE_SIZE = 100

/**
 * Số trang tối đa gom lại trong **một lần tải** (áp dụng cho MỌI hàm gom
 * trang: biểu đồ cảm biến lẫn bảng lệnh thiết bị).
 *
 * ⚠ **Vì sao trần này quan trọng?**
 *   Mỗi trang = 1 request HTTP. Trước đây biểu đồ 24h kéo tới **560 trang**
 *   ⇒ làm **nghẽn connection pool** của BE ⇒ mọi API khác (kể cả API chi tiết
 *   phiên) bị chậm ⇒ Drawer bật lên treo skeleton.
 *
 *   ⇒ Trần **5 trang** (500 bản ghi) cho bảng lệnh (phiên chỉ vài trăm lệnh
 *     ⇒ đủ 100%), và **20 trang** cho biểu đồ (xem
 *     `SENSOR_TIME_RANGE_MAX_PAGES`).
 */
const MAX_FETCH_PAGES = 5

/** Số trang fetch **song song** trong mỗi lô (tránh throttle BE). */
const FETCH_PAGE_BATCH_SIZE = 5

/**
 * Trần cứng số trang cho **biểu đồ cảm biến** (≈2.000 bản ghi).
 *
 * ⚠ Xem giải thích ở `fetchAllSessionSensorReadings`.
 */
const MAX_SENSOR_FETCH_PAGES = 20

/**
 * Base endpoint **môi trường theo tầng đã gộp sẵn** của BE.
 *
 * ⚠ Endpoint này **không** thuộc module phiên, nhưng là nguồn dữ liệu duy
 *   nhất cho các mốc thời gian **dài** (6h/12h/24h) của biểu đồ phiên:
 *   - Nhận `from`/`to` (tối đa 24 giờ) ⇒ **1 request** phủ trọn cửa sổ.
 *   - Gộp sẵn trong SQL thành bucket 15 phút ⇒ không cần kéo hàng trăm trang
 *     bản ghi thô.
 *
 *   ⇒ Nhờ vậy biểu đồ không bị "co cụm" về vài chút cuối cùng.
 */
const ENVIRONMENT_HISTORY_URL =
  '/api/analytics/dashboard/environment-history'

/**
 * GET `/api/cultivation-sessions/admin/{sessionId}/iot-history`
 *
 * Lịch sử **lệnh điều khiển thiết bị** (ON/OFF) + **tầng đã map** cho phiên.
 *
 * ⚠ Response 200 **chưa có schema** trong Swagger (chỉ `description` dạng
 *   text) ⇒ ta đọc **nhiều vị trí** ứng viên cho từng collection
 *   (`data.commands` / `data.device_commands` / `data` là mảng …) thay vì
 *   đoán cứng 1 shape.
 *
 * @returns `null` khi BE trả 404 (phiên chưa có lịch sử IoT / route chưa có).
 */
export async function fetchSessionIoTHistory(
  sessionId: number,
  query: SessionIoTHistoryQuery = {},
): Promise<SessionIoTHistoryResult | null> {
  const params = cleanQueryParams({
    page: query.page,
    pageSize: query.pageSize,
  })

  try {
    const response = await apiClient.get<unknown>(
      `${ADMIN_SESSION_IOT_HISTORY_URL}/${sessionId}/iot-history`,
      { params },
    )
    const body = ensureObject<Record<string, unknown>>(response.data)
    if (!body) return null

    const pagination = normalizePagination(body)
    const totalDeviceEvents =
      pickTotal(body, 'totalDeviceEvents') ?? pagination?.total ?? 0

    /*
     * ⚠ Phân trang **riêng cho lệnh thiết bị**.
     *
     * `/iot-history` trả **2** bộ đếm độc lập trong `pagination`:
     * `totalTemperatureReadings` + `totalDeviceEvents`. `normalizePagination`
     * ưu tiên `total` (không có ở endpoint này) rồi rơi về
     * `totalTemperatureReadings` ⇒ **sai** cho phần lệnh.
     *
     * → Ta tự tính `totalPages` của lệnh từ `totalDeviceEvents`.
     */
    const commandTotalPages =
      pickTotal(body, 'totalDeviceEventPages') ??
      (pagination?.pageSize
        ? Math.ceil(totalDeviceEvents / pagination.pageSize)
        : 0)

    return {
      commands: pickCommands(body),
      floors: pickFloors(body),
      pagination: pagination ?? emptyPagination(),
      totalTemperatureReadings:
        pickTotal(body, 'totalTemperatureReadings') ??
        pagination?.total ??
        0,
      totalDeviceEvents,
      totalDeviceEventPages: commandTotalPages,
    }
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

/**
 * GET `/api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *
 * Telemetry **nhiệt độ + độ ẩm raw** theo cảm biến.
 *
 * @returns `null` khi BE trả 404.
 */
export async function fetchSessionSensorHistory(
  sessionId: number,
  query: SessionIoTHistoryQuery = {},
): Promise<SessionSensorHistoryResult | null> {
  const params = cleanQueryParams({
    page: query.page,
    pageSize: query.pageSize,
  })

  try {
    const response = await apiClient.get<unknown>(
      `${ADMIN_SESSION_IOT_HISTORY_URL}/${sessionId}/iot-history/sensors`,
      { params },
    )
    const body = ensureObject<Record<string, unknown>>(response.data)
    if (!body) return null

    return {
      readings: pickReadings(body),
      pagination: normalizePagination(body) ?? emptyPagination(),
    }
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

/**
 * Gộp **toàn bộ** telemetry cảm biến của phiên (dùng cho biểu đồ).
 *
 * ⚠ Biểu đồ cần nhiều điểm, mà BE giới hạn `pageSize` tối đa 100 ⇒ phải lặp
 *   trang. Hàm này tự đọc `pagination.totalPages` rồi gọi tiếp các trang còn
 *   lại (giống pattern `fetchAllAdminCultivationSessions`).
 *
 * ⚠ **Vì sao phải theo khoảng thời gian?**
 *   BE sắp xếp **giảm dần** theo `received_at`. Trước đây hàm này kéo cố định
 *   5 trang (500 bản ghi) ⇒ chỉ ~14 phút dữ liệu gần nhất ⇒ **chọn 6h/12h/24h
 *   không làm biểu đồ thay đổi**.
 *
 *   → Hàm này nhận `startTimestamp` (mốc bắt đầu của khoảng) và kéo trang
 *     **cho tới khi** đã đi qua mốc đó ⇒ mỗi mốc thời gian có dữ liệu riêng.
 *
 * ⚠ Ngân sách trang theo khoảng: xem
 *   `SENSOR_TIME_RANGE_MAX_PAGES` (utils/session-sensor-aggregation.utils.ts).
 *
 * @returns Mảng rỗng khi không có dữ liệu / route chưa tồn tại.
 */
export async function fetchAllSessionSensorReadings(
  sessionId: number,
  options: {
    pageSize?: number
    maxPages?: number
    /** Mốc bắt đầu của khoảng cần lấy (epoch ms) — dừng khi đã quá mốc này. */
    startTimestamp?: number
  } = {},
): Promise<SessionSensorReading[]> {
  const pageSize = Math.min(
    SAFE_PAGE_SIZE,
    Math.max(1, options.pageSize ?? SAFE_PAGE_SIZE),
  )
  /*
   * ⚠ **Trần cứng 20 trang** (≈2.000 bản ghi) cho mọi mốc thời gian.
   *
   * Lý do: 24h kéo tới 560 trang trước đây ⇒ nghẽn connection pool của BE ⇒
   * Drawer bật lên bị treo skeleton. Giờ đây ta gom thô hơn (bucket 5/10/15
   * phút) nên không cần nhiều bản ghi để vẽ đủ điểm.
   */
  const maxPages = Math.min(
    Math.max(1, options.maxPages ?? MAX_SENSOR_FETCH_PAGES),
    MAX_SENSOR_FETCH_PAGES,
  )

  const first = await fetchSessionSensorHistory(sessionId, {
    page: 1,
    pageSize,
  })
  if (!first) return []

  const collected: SessionSensorReading[] = [...first.readings]
  const totalPages = Math.min(first.pagination.totalPages, maxPages)
  if (totalPages <= 1) return collected

  /*
   * ⚠ Lấy trang **tuần tự theo lô** (mỗi lô 5 trang song song) vì:
   *   - BE sắp xếp giảm dần theo thời gian ⇒ trang sau có dữ liệu CŨ hơn ⇒
   *     biết được mốc sớm nhất của lô đã vượt `startTimestamp` chưa ⇒ dừng.
   *   - Tránh kéo hàng trăm request một lượt (sẽ bị throttle).
   */
  for (let page = 2; page <= totalPages; page += FETCH_PAGE_BATCH_SIZE) {
    const batch = Array.from(
      { length: Math.min(FETCH_PAGE_BATCH_SIZE, totalPages - page + 1) },
      (_, index) => page + index,
    )

    const results = await Promise.all(
      batch.map((target) =>
        fetchSessionSensorHistory(sessionId, {
          page: target,
          pageSize,
        }),
      ),
    )

    const batchReadings = results.flatMap((item) => item?.readings ?? [])
    collected.push(...batchReadings)

    /*
     * ⚠ Dừng khi đã lấy đủ dữ liệu về mốc bắt đầu của khoảng.
     *
     * Vì BE sắp xếp giảm dần, bản ghi **cũ nhất** trong lô là mốc để so —
     * nếu nó đã cũ hơn `startTimestamp` ⇒ phần còn lại chỉ có dữ liệu cũ hơn
     * nữa ⇒ dừng, không tải thêm.
     */
    if (
      options.startTimestamp != null &&
      batchReadings.length > 0 &&
      oldestTimestamp(batchReadings) < options.startTimestamp
    ) {
      break
    }
  }

  return collected
}

/** Epoch ms nhỏ nhất trong 1 lô bản ghi (bản ghi cũ nhất). */
function oldestTimestamp(readings: SessionSensorReading[]): number {
  let oldest = Number.POSITIVE_INFINITY
  for (const reading of readings) {
    const timestamp = Date.parse(
      reading.received_at ?? reading.measured_at ?? '',
    )
    if (Number.isFinite(timestamp) && timestamp < oldest) oldest = timestamp
  }
  return oldest
}

/**
 * Lịch sử môi trường **đã gộp sẵn** theo tầng — nguồn cho các mốc dài.
 *
 * Nguồn: `GET /api/analytics/dashboard/environment-history`
 *
 * ⚠ **Vì sao dùng endpoint này cho biểu đồ phiên?**
 *
 *   `/iot-history/sensors` chỉ hỗ trợ `page` & `pageSize` (max 100) và trả
 *   dữ liệu **thô** (3 cảm biến × mỗi 5 giây). ⇒ 24 giờ cần **~519 trang**
 *   ⇒ không khả thi (vừa nghẽn connection pool, vừa làm trục thời gian "co
 *   cụm" về vài chút cuối cùng).
 *
 *   `environment-history` thì:
 *   - Nhận `from`/`to` (ISO 8601, tối đa 24 giờ) ⇒ **1 request** phủ trọn
 *     cửa sổ đã chọn.
 *   - Gộp trong SQL thành bucket 15 phút ⇒ đủ độ phân giải cho 6h/12h/24h.
 *   - Trả sẵn `thresholds` hiện tại của từng tầng.
 *
 * ⚠ Endpoint trả dữ liệu của **mọi tầng ACTIVE** ⇒ FE lọc theo các tầng
 *   thuộc phiên (xem `useSessionSensorChart`).
 *
 * ⚠ Quyền: Admin (1) / Farm Operator (2) — đúng phạm vi Web Admin.
 */
export async function fetchSessionEnvironmentHistory(
  options: { from: number; to: number },
): Promise<SessionEnvironmentHistoryResult | null> {
  const params = cleanQueryParams({
    from: new Date(options.from).toISOString(),
    to: new Date(options.to).toISOString(),
  })

  try {
    const response = await apiClient.get<unknown>(ENVIRONMENT_HISTORY_URL, {
      params,
    })
    const body = ensureObject<Record<string, unknown>>(response.data)
    if (!body) return null

    return {
      from: pickFinite(body.from) ?? options.from,
      to: pickFinite(body.to) ?? options.to,
      bucketMs: pickFinite(body.bucketMs) ?? DEFAULT_ENV_BUCKET_MS,
      floors: Array.isArray(body.floors)
        ? (body.floors as Record<string, unknown>[]).map(normalizeEnvFloor)
        : [],
    }
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

/** Bucket mặc định của BE — 15 phút. */
const DEFAULT_ENV_BUCKET_MS = 15 * 60_000

/** Đọc số hợp lệ từ payload thô. */
function pickFinite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Chuẩn hoá 1 tầng của `environment-history`. */
function normalizeEnvFloor(
  raw: Record<string, unknown>,
): SessionEnvironmentFloor {
  const points = Array.isArray(raw.points)
    ? (raw.points as Record<string, unknown>[])
    : []

  return {
    floorId: pickFinite(raw.floorId) ?? 0,
    floorName:
      typeof raw.floorName === 'string' && raw.floorName.trim()
        ? raw.floorName
        : 'Tầng',
    thresholds: normalizeEnvThresholds(raw.thresholds),
    points: points.map((point) => ({
      timestamp: pickFinite(point.timestamp) ?? 0,
      temperature: pickFinite(point.temperature),
      humidity: pickFinite(point.humidity),
    })),
  }
}

/** Ngưỡng hiện tại của 1 tầng (shape BE) — `null` nếu chưa cấu hình. */
function normalizeEnvThresholds(
  raw: unknown,
): SessionEnvironmentThresholds | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>

  const thresholds: SessionEnvironmentThresholds = {
    temperature_min: pickFinite(obj.temperature_min),
    temperature_max: pickFinite(obj.temperature_max),
    humidity_min: pickFinite(obj.humidity_min),
    humidity_max: pickFinite(obj.humidity_max),
  }

  return Object.values(thresholds).some((value) => value != null)
    ? thresholds
    : null
}

/**
 * Lấy **toàn bộ** lệnh điều khiển thiết bị của phiên (1 lần gọi cho FE).
 *
 * ⚠ **Vì sao cần hàm này?**
 *   Phiên chỉ có vài trăm lệnh ⇒ tải hết về FE một lần rồi **lọc + phân
 *   trang client-side** ⇒ bộ lọc "Loại thiết bị" / "Trạng thái" áp dụng cho
 *   **100% lệnh của phiên**, không chỉ 20 dòng của trang hiện tại.
 *
 * ⚠ BE giới hạn `pageSize` tối đa 100 ⇒ phải lặp trang. Ta dừng khi đã lấy
 *   đủ `totalDeviceEvents` hoặc hết trang.
 *
 * @returns `{ commands, floors }` — `floors` là tầng đã map (BE chỉ trả ở
 *   trang đầu ⇒ lấy từ trang đầu tiên).
 */
export async function fetchAllSessionCommands(
  sessionId: number,
  options: { pageSize?: number; maxPages?: number } = {},
): Promise<{ commands: SessionDeviceCommand[]; floors: SessionMappedFloor[] } | null> {
  const pageSize = Math.min(
    SAFE_PAGE_SIZE,
    Math.max(1, options.pageSize ?? SAFE_PAGE_SIZE),
  )
  /*
   * ⚠ **Trần 5 trang** (500 lệnh).
   *
   * Phiên chỉ có vài trăm lệnh ⇒ 5 trang là dư. Không kéo 50 trang như trước
   * ⇒ không nghẽn connection pool khi mở Drawer.
   */
  const maxPages = Math.min(
    Math.max(1, options.maxPages ?? MAX_FETCH_PAGES),
    MAX_FETCH_PAGES,
  )

  const first = await fetchSessionIoTHistory(sessionId, { page: 1, pageSize })
  if (!first) return null

  const commands = [...first.commands]
  const floors = first.floors
  /*
   * ⚠ Dùng `totalDeviceEventPages` (số trang của **lệnh**), KHÔNG dùng
   *   `pagination.totalPages` — endpoint `/iot-history` có **2** bộ đếm và
   *   `pagination.total` rơi về `totalTemperatureReadings` ⇒ sai cho lệnh.
   */
  const totalPages = Math.min(
    first.totalDeviceEventPages || first.pagination.totalPages,
    maxPages,
  )

  for (let page = 2; page <= totalPages; page += FETCH_PAGE_BATCH_SIZE) {
    const batch = Array.from(
      { length: Math.min(FETCH_PAGE_BATCH_SIZE, totalPages - page + 1) },
      (_, index) => page + index,
    )

    const results = await Promise.all(
      batch.map((target) =>
        fetchSessionIoTHistory(sessionId, { page: target, pageSize }),
      ),
    )

    for (const result of results) {
      commands.push(...(result?.commands ?? []))
    }
  }

  return { commands, floors }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Phân trang rỗng — dùng khi BE không trả metadata phân trang. */
function emptyPagination() {
  return { page: 1, pageSize: 20, total: 0, totalPages: 0 }
}

/**
 * Đọc 1 số tổng (`total*`) ở cấp gốc hoặc trong `pagination`.
 *
 * ⚠ `/iot-history` trả 2 số tổng khác nhau trong `pagination`:
 *   `totalTemperatureReadings` và `totalDeviceEvents`.
 */
function pickTotal(body: Record<string, unknown>, key: string): number | null {
  const direct = body[key]
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct

  const pagination = ensureObject<Record<string, unknown>>(body.pagination)
  const fromPagination = pagination?.[key]
  if (typeof fromPagination === 'number' && Number.isFinite(fromPagination)) {
    return fromPagination
  }
  return null
}

/**
 * Tìm mảng lệnh thiết bị trong response — thử nhiều vị trí ứng viên vì
 * schema 200 chưa được công khai.
 *
 * ⚠ **Key thực tế của BE là `deviceEvents`** (đã verify từ
 *   `Backend/src/models/cultivationSession.model.js` → `findIotHistoryForAdmin`).
 *   Các key còn lại giữ lại để tương thích nếu BE đổi tên.
 *
 * ⚠ Chỉ dùng `body.data` làm fallback khi nó **thực sự là mảng** — nếu
 *   `body.data` là object (`{ deviceEvents: [...], floors: [...] }`) thì phải bóc
 *   từ key bên trong, nếu không ta sẽ nhầm mảng `floors` thành mảng lệnh.
 */
function pickCommands(
  body: Record<string, unknown>,
): SessionDeviceCommand[] {
  const candidates = [
    body.deviceEvents,
    body.device_events,
    body.commands,
    body.device_commands,
    body.deviceCommands,
    body.command_history,
    body.commandHistory,
    nestedValue(body, 'deviceEvents'),
    nestedValue(body, 'device_events'),
    nestedValue(body, 'commands'),
    nestedValue(body, 'device_commands'),
    nestedValue(body, 'deviceCommands'),
    Array.isArray(body.data) ? body.data : null,
  ]

  for (const candidate of candidates) {
    const list = toArray<unknown>(candidate)
    if (list.length > 0) return list.map(normalizeDeviceCommand)
  }
  return []
}

/**
 * Tìm mảng tầng đã map trong response.
 */
function pickFloors(body: Record<string, unknown>): SessionMappedFloor[] {
  const candidates = [
    body.floors,
    body.mapped_floors,
    body.mappedFloors,
    body.floor_mappings,
    body.floorMappings,
    nestedValue(body, 'floors'),
    nestedValue(body, 'mapped_floors'),
    nestedValue(body, 'mappedFloors'),
  ]

  for (const candidate of candidates) {
    const list = toArray<unknown>(candidate)
    if (list.length > 0) return list.map(normalizeMappedFloor)
  }
  return []
}

/**
 * Tìm mảng reading cảm biến trong response.
 */
function pickReadings(
  body: Record<string, unknown>,
): SessionSensorReading[] {
  const candidates = [
    body.readings,
    body.sensors,
    body.sensor_readings,
    body.sensorReadings,
    nestedValue(body, 'readings'),
    nestedValue(body, 'sensors'),
    nestedValue(body, 'sensor_readings'),
    Array.isArray(body.data) ? body.data : null,
  ]

  for (const candidate of candidates) {
    const list = toArray<unknown>(candidate)
    if (list.length > 0) return list.map(normalizeSensorReading)
  }
  return []
}

/**
 * Đọc 1 key bên trong wrapper `data` (khi `data` là object chứa collection).
 */
function nestedValue(
  body: Record<string, unknown>,
  key: string,
): unknown {
  const nested = body.data
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return null
  return (nested as Record<string, unknown>)[key] ?? null
}
