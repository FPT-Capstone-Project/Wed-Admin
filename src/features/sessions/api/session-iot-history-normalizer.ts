import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  SessionCommandAction,
  SessionCommandFloor,
  SessionCommandStatus,
  SessionDeviceCommand,
  SessionDeviceType,
  SessionIoTHistoryPagination,
  SessionMappedFloor,
  SessionSensorReading,
} from '../types/session-iot-history.types'

/**
 * Normalizer cho 2 endpoint lịch sử IoT của phiên canh tác.
 *
 * ⚠ **Vì sao cần normalizer riêng?**
 *   Swagger **chưa công khai schema response** cho
 *   `GET /api/cultivation-sessions/admin/{sessionId}/iot-history` và
 *   `.../iot-history/sensors` — chỉ có `description` dạng text. Nghĩa là
 *   tên field thực tế có thể là `snake_case` (chuẩn của BE) **hoặc**
 *   `camelCase`, và có thể thiếu.
 *
 *   → Ở đây ta đọc **nhiều tên field ứng viên** cho mỗi giá trị, ép kiểu an
 *     toàn, và bỏ qua record không nhận diện được thay vì ném lỗi ⇒ UI không
 *     bao giờ crash vì BE đổi shape.
 *
 * ⚠ **Shape thực tế đã verify từ Backend**
 *   (`Backend/src/models/cultivationSession.model.js`):
 *   - `/iot-history` → `data = { session, floors, temperatureReadings,
 *     deviceEvents, pagination }` — key lệnh là **`deviceEvents`**
 *     (không phải `commands`), và mọi field ở đây là **camelCase**.
 *   - `/iot-history/sensors` → `data = { session, readings, pagination }`.
 *
 * ⚠ Các field **không nhận diện được** trả `null` — component hiển thị `—`
 *   thay vì số 0 (0 là giá trị có nghĩa: 0°C / 0%RH).
 */

/** Chuẩn hoá 1 lần đọc cảm biến. */
export function normalizeSensorReading(
  raw: unknown,
): SessionSensorReading {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    reading_id: pickNumber(obj, 'reading_id', 'readingId', 'id'),
    received_at: pickString(
      obj,
      'received_at',
      'receivedAt',
      'timestamp',
      'recorded_at',
    ),
    measured_at: pickString(obj, 'measured_at', 'measuredAt'),
    temperature: pickNumber(obj, 'temperature', 'temp', 'temperature_c'),
    humidity: pickNumber(obj, 'humidity', 'rh', 'humidity_percent'),
    sensor_id: pickNumber(obj, 'sensor_id', 'sensorId', 'sensor_address'),
    node_address: pickNumber(obj, 'node_address', 'nodeAddress', 'node_id', 'nodeId'),
    master_id: pickString(obj, 'master_id', 'masterId'),
    floor_id: pickNumber(obj, 'floor_id', 'floorId'),
    floor_name: pickString(obj, 'floor_name', 'floorName'),
    is_valid: pickBoolean(obj, 'is_valid', 'isValid', 'ok', 'valid'),
    retained: pickBoolean(obj, 'retained', 'isRetained'),
  }
}

/** Chuẩn hoá 1 lệnh điều khiển thiết bị. */
export function normalizeDeviceCommand(
  raw: unknown,
): SessionDeviceCommand {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    command_id: pickString(obj, 'command_id', 'commandId', 'id'),
    action: pickAction(obj.action ?? obj.Action),
    status: pickStatus(obj.status ?? obj.Status),
    channel: pickNumber(obj, 'channel', 'channel_id', 'channelId'),
    master_id: pickString(obj, 'master_id', 'masterId'),
    requested_by: pickNumber(obj, 'requested_by', 'requestedBy', 'user_id'),
    requested_at: pickString(obj, 'requested_at', 'requestedAt', 'created_at'),
    published_at: pickString(obj, 'published_at', 'publishedAt'),
    completed_at: pickString(obj, 'completed_at', 'completedAt'),
    error_message: pickString(obj, 'error_message', 'errorMessage', 'error'),
    floors: normalizeCommandFloors(obj.floors ?? obj.command_floors),
  }
}

/**
 * Chuẩn hoá danh sách tầng mà 1 lệnh áp dụng.
 *
 * ⚠ BE gom dạng **mảng JSON** trong key `floors` của mỗi lệnh
 *   (`jsonb_agg(jsonb_build_object('floorId', …, 'deviceType', …))`).
 *   1 lệnh có thể áp dụng cho nhiều tầng (cùng master + cùng kênh).
 */
export function normalizeCommandFloors(
  raw: unknown,
): SessionCommandFloor[] {
  return toArray<unknown>(raw).map((item) => {
    const obj = ensureObject<Record<string, unknown>>(item) ?? {}
    return {
      floor_id: pickNumber(obj, 'floor_id', 'floorId'),
      floor_name: pickString(obj, 'floor_name', 'floorName'),
      device_type: pickDeviceType(obj.device_type ?? obj.deviceType),
    }
  })
}

/** Chuẩn hoá 1 tầng đã map sang thiết bị IoT. */
export function normalizeMappedFloor(
  raw: unknown,
): SessionMappedFloor {
  const obj = ensureObject<Record<string, unknown>>(raw) ?? {}

  return {
    floor_id: pickNumber(obj, 'floor_id', 'floorId'),
    floor_name: pickString(obj, 'floor_name', 'floorName'),
    floor_number: pickNumber(obj, 'floor_number', 'floorNumber'),
    room_id: pickNumber(obj, 'room_id', 'roomId'),
    room_name: pickString(obj, 'room_name', 'roomName'),
    master_id: pickString(obj, 'master_id', 'masterId'),
    master_identifier: pickString(obj, 'master_identifier', 'masterIdentifier'),
    node_address: pickNumber(obj, 'node_address', 'nodeAddress', 'node_id', 'nodeId'),
    misting_channel: pickNumber(
      obj,
      'misting_ssr_channel',
      'mistingChannel',
      'misting_ssr',
    ),
    light_channel: pickNumber(
      obj,
      'light_ssr_channel',
      'lightChannel',
      'light_ssr',
    ),
  }
}

/**
 * Chuẩn hoá phân trang — BE có thể trả `pagination` ở cấp gốc, trong `meta`,
 * hoặc bên trong wrapper `data`. Trả `null` khi thiếu ⇒ component hiển thị
 * phân trang client-side.
 *
 * ⚠ **Shape phân trang KHÁC NHAU giữa 2 endpoint** (đã verify từ
 *   `Backend/src/services/cultivationSession.service.js`):
 *
 *   - `/iot-history` → `{ page, pageSize, totalTemperatureReadings,
 *     totalTemperaturePages, totalDeviceEvents, totalDeviceEventPages }`
 *     ⇒ **không** có `total` / `totalPages`.
 *   - `/iot-history/sensors` → `{ page, pageSize, total, totalPages }`.
 *
 *   → Vì vậy ta chấp nhận cả `total*` lẫn `totalTemperatureReadings*`,
 *     ưu tiên `total` (chuẩn) trước.
 */
export function normalizePagination(
  raw: unknown,
): SessionIoTHistoryPagination | null {
  const obj = ensureObject<Record<string, unknown>>(raw)
  if (!obj) return null

  const meta = ensureObject<Record<string, unknown>>(obj.meta)
  const nested = ensureObject<Record<string, unknown>>(obj.data)
  const source = {
    ...(meta ?? {}),
    ...(nested ?? {}),
    ...obj,
    ...(ensureObject<Record<string, unknown>>(obj.pagination) ?? {}),
    ...(ensureObject<Record<string, unknown>>(nested?.pagination) ?? {}),
  }

  const page = pickNumber(source, 'page', 'currentPage')
  const total = pickNumber(
    source,
    'total',
    'totalItems',
    'totalTemperatureReadings',
    'totalDeviceEvents',
  )
  if (page === null || total === null) return null

  const pageSize = pickNumber(source, 'pageSize', 'page_size', 'limit') ?? 20
  const totalPages =
    pickNumber(
      source,
      'totalPages',
      'total_pages',
      'totalTemperaturePages',
      'totalDeviceEventPages',
    ) ?? (pageSize > 0 ? Math.ceil(total / pageSize) : 0)

  return { page, pageSize, total, totalPages }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

const COMMAND_ACTIONS: readonly SessionCommandAction[] = ['ON', 'OFF']
const COMMAND_STATUSES: readonly SessionCommandStatus[] = [
  'PENDING',
  'PUBLISHED',
  'FAILED',
  'TIMED_OUT',
]

/** Chỉ nhận `ON` / `OFF` — BE chỉ phát 2 hành động này cho rơ-le. */
function pickAction(value: unknown): SessionCommandAction | null {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return COMMAND_ACTIONS.includes(normalized as SessionCommandAction)
    ? (normalized as SessionCommandAction)
    : null
}

/** Chỉ nhận 4 trạng thái lệnh hợp lệ của BE. */
function pickStatus(value: unknown): SessionCommandStatus | null {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return COMMAND_STATUSES.includes(normalized as SessionCommandStatus)
    ? (normalized as SessionCommandStatus)
    : null
}

/** Chỉ nhận 2 loại thiết bị BE suy ra từ kênh SSR. */
function pickDeviceType(value: unknown): SessionDeviceType | null {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return normalized === 'MISTING' || normalized === 'LIGHT'
    ? (normalized as SessionDeviceType)
    : null
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

function pickBoolean(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return null
}

/** Bọc `ensureArray` để giữ 1 chỗ gọi duy nhất cho cả 2 API. */
export function toArray<T>(value: unknown): T[] {
  return ensureArray<T>(value)
}
