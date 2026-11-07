/**
 * Lịch sử IoT của một phiên canh tác — DTO **read-only** cho Web Admin.
 *
 * Nguồn (2 endpoint GET, tag Swagger `Cultivation Audit`):
 *   - `GET /api/cultivation-sessions/admin/{sessionId}/iot-history`
 *     → nhiệt độ + **lệnh ON/OFF thiết bị** + **tầng đã map** + phân trang.
 *   - `GET /api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *     → **nhiệt độ + độ ẩm raw** theo cảm biến + tầng + phân trang.
 *
 * ## Phân quyền
 *
 * Swagger: *"Admins and Farm Operators can view any session. Customers can
 * view sessions belonging to their account."* ⇒ Web Admin (role 1 = Admin,
 * 2 = Farm Operator) đọc được mọi phiên.
 *
 * ⚠ **Schema response CHƯA được BE công khai** — Swagger chỉ mô tả 200 bằng
 *   `description` dạng text, không có `components.schemas`. Vì vậy:
 *   - Mọi field ở đây đều **nullable** — không giả định BE trả đủ field.
 *   - Tầng API luôn **normalizer defensive** (đọc nhiều tên field) ⇒ BE đổi
 *     tên field không làm vỡ UI (xem `api/session-iot-history-normalizer.ts`).
 *
 * ⚠ Query params chỉ có `page` / `pageSize` (max 100) — **không** có
 *   `startTime`/`endTime`/`limit`: BE tự suy ra khoảng thời gian từ
 *   `start_at`/`end_at` của phiên.
 */

/** Trạng thái lệnh thiết bị — khớp `iot_device_commands.status` của BE. */
export type SessionCommandStatus =
  | 'PENDING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'TIMED_OUT'

/** Hành động lệnh — BE chỉ phát `ON` / `OFF` cho rơ-le. */
export type SessionCommandAction = 'ON' | 'OFF'

/**
 * Một lần đọc cảm biến — nguồn `/iot-history/sensors`.
 *
 * ⚠ Tên field giữ **snake_case** cho khớp với phần còn lại của module
 *   `features/sessions` (`admin-session.types.ts` cũng dùng snake_case).
 */
export interface SessionSensorReading {
  /** `iot_sensor_readings.id` — có thể `null` nếu BE không trả. */
  reading_id: number | null
  /** Thời điểm **nhận** về backend (ISO 8601). */
  received_at: string | null
  /** Thời điểm **đo** tại cảm biến (ISO 8601) — có thể `null`. */
  measured_at: string | null
  /** Nhiệt độ (°C). */
  temperature: number | null
  /** Độ ẩm tương đối (%RH). */
  humidity: number | null
  /** Định danh cảm biến trong node RS485 (1..3). */
  sensor_id: number | null
  /** Địa chỉ node RS485. */
  node_address: number | null
  /** Master chủ sở hữu cảm biến. */
  master_id: string | null
  /** Tầng mà cảm biến được map. */
  floor_id: number | null
  floor_name: string | null
  /** Cảm biến báo lỗi (sai số) hay không. */
  is_valid: boolean | null
  /** Bản ghi được giữ lại (retained) hay không. */
  retained: boolean | null
}

/**
 * Một lệnh điều khiển thiết bị — nguồn `/iot-history`.
 *
 * ⚠ `requested_by` có thể `null` khi lệnh do hệ thống tự phát (auto-control).
 */
export interface SessionDeviceCommand {
  /** UUID của lệnh (`iot_device_commands.id`). */
  command_id: string | null
  /** `ON` = bật rơ-le, `OFF` = tắt. */
  action: SessionCommandAction | null
  /** Trạng thái phát lệnh. */
  status: SessionCommandStatus | null
  /** Kênh rơ-le (1..8). */
  channel: number | null
  /** Master đã phát lệnh. */
  master_id: string | null
  /** Người yêu cầu (`users.user_id`) — `null` nghĩa là hệ thống tự phát. */
  requested_by: number | null
  /** Thời điểm yêu cầu (ISO 8601). */
  requested_at: string | null
  /** Thời điểm broker PUBACK (ISO 8601). */
  published_at: string | null
  /** Thời điểm hoàn tất (ISO 8601). */
  completed_at: string | null
  /** Thông báo lỗi khi phát lệnh thất bại. */
  error_message: string | null
  /**
   * Tầng mà lệnh được phát tới.
   *
   * ⚠ BE trả `floors` dạng **mảng** ⇒ 1 lệnh có thể áp dụng cho nhiều tầng
   *   (cùng master + cùng kênh SSR).
   */
  floors: SessionCommandFloor[]
}

/**
 * Một tầng đã được map sang thiết bị IoT — nguồn `/iot-history`.
 *
 * ⚠ Đây là phần **quan trọng cho audit**: cho biết lệnh/thiết bị nào thực sự
 *   phục vụ phiên này (không suy đoán từ `trays[]` vì BE map theo thiết bị).
 */
export interface SessionMappedFloor {
  floor_id: number | null
  floor_name: string | null
  /** Số thứ tự tầng trong phòng. */
  floor_number: number | null
  room_id: number | null
  room_name: string | null
  /** Master điều khiển tầng. */
  master_id: string | null
  /** Mã định danh master (vd `master01`). */
  master_identifier: string | null
  /** Node RS485 của tầng. */
  node_address: number | null
  /** Kênh SSR van tưới phun của tầng. */
  misting_channel: number | null
  /** Kênh SSR đèn của tầng. */
  light_channel: number | null
}

/**
 * Loại thiết bị mà 1 lệnh điều khiển — BE suy ra từ kênh SSR.
 *
 * ⚠ BE chỉ map **2** kênh cho phiên: kênh tưới phun + kênh đèn.
 */
export type SessionDeviceType = 'MISTING' | 'LIGHT'

/**
 * Tầng mà 1 lệnh được phát tới — BE gom dạng mảng JSON trong cùng 1 lệnh.
 *
 * ⚠ 1 lệnh có thể áp dụng cho **nhiều tầng** (cùng master + cùng kênh).
 */
export interface SessionCommandFloor {
  floor_id: number | null
  floor_name: string | null
  /** `MISTING` = van tưới, `LIGHT` = đèn. */
  device_type: SessionDeviceType | null
}

/**
 * Metadata phân trang server-side.
 *
 * ⚠ **Cả 2 API dùng shape phân trang KHÁC NHAU** (đã verify từ
 *   `Backend/src/services/cultivationSession.service.js`):
 *
 *   - `/iot-history` → `{ page, pageSize, totalTemperatureReadings,
 *     totalTemperaturePages, totalDeviceEvents, totalDeviceEventPages }`
 *     ⇒ **không** có `total` / `totalPages`.
 *   - `/iot-history/sensors` → `{ page, pageSize, total, totalPages }`.
 *
 *   → `total` / `totalPages` ở đây là **giá trị đã chuẩn hoá** theo loại
 *     collection mà endpoint đó quản lý (xem `normalizePagination`).
 */
export interface SessionIoTHistoryPagination {
  page: number
  pageSize: number
  /** Tổng số bản ghi của collection chính của endpoint. */
  total: number
  /** Tổng số trang của collection chính của endpoint. */
  totalPages: number
}

/** Kết quả `/iot-history` — lệnh thiết bị + tầng đã map. */
export interface SessionIoTHistoryResult {
  /** Các lệnh điều khiển thiết bị (BE trả ở key `deviceEvents`). */
  commands: SessionDeviceCommand[]
  /** Các tầng đã map sang thiết bị IoT (BE trả ở key `floors`). */
  floors: SessionMappedFloor[]
  pagination: SessionIoTHistoryPagination
  /** Tổng số lần đo nhiệt độ trong phiên (`totalTemperatureReadings`). */
  totalTemperatureReadings: number
  /** Tổng số lệnh thiết bị trong phiên (`totalDeviceEvents`). */
  totalDeviceEvents: number
  /** Tổng số trang của **lệnh thiết bị** (`totalDeviceEventPages`). */
  totalDeviceEventPages: number
}

/** Kết quả `/iot-history/sensors` — telemetry cảm biến. */
export interface SessionSensorHistoryResult {
  readings: SessionSensorReading[]
  pagination: SessionIoTHistoryPagination
}

/** Query params chung của cả 2 API. */
export interface SessionIoTHistoryQuery {
  /** Trang (BE mặc định 1). */
  page?: number
  /** Số bản ghi mỗi trang — BE tối đa **100**. */
  pageSize?: number
}

/**
 * Ngưỡng hiện tại của 1 tầng — shape BE của `environment-history`.
 *
 * ⚠ Đây là cấu hình **hiện tại**, không phải ngưỡng lịch sử.
 */
export interface SessionEnvironmentThresholds {
  temperature_min: number | null
  temperature_max: number | null
  humidity_min: number | null
  humidity_max: number | null
}

/** Một điểm đã gộp sẵn của 1 tầng. */
export interface SessionEnvironmentPoint {
  /** Đầu bucket (epoch ms). */
  timestamp: number
  /** Nhiệt độ (°C) — `null` = thiếu dữ liệu. */
  temperature: number | null
  /** Độ ẩm (%RH) — `null` = thiếu dữ liệu. */
  humidity: number | null
}

/** Lịch sử môi trường của 1 tầng (đã gộp sẵn). */
export interface SessionEnvironmentFloor {
  floorId: number
  floorName: string
  thresholds: SessionEnvironmentThresholds | null
  points: SessionEnvironmentPoint[]
}

/** Payload của `environment-history` (đã bóc wrapper `data`). */
export interface SessionEnvironmentHistoryResult {
  /** Đầu cửa sổ (epoch ms). */
  from: number
  /** Cuối cửa sổ **exclusive** (epoch ms). */
  to: number
  /** Kích thước bucket (ms) — mặc định 15 phút. */
  bucketMs: number
  /** Các tầng đã gộp sẵn. */
  floors: SessionEnvironmentFloor[]
}
