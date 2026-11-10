/**
 * Lịch sử môi trường (Environment History) của một phiên canh tác.
 *
 * ⚠ **Nguồn duy nhất** cho telemetry cảm biến của phiên — nhóm endpoint
 *   `Environment History` (tag Swagger `Environment History`):
 *
 *   - `GET /api/environment-history/sessions/{sessionId}`
 *     → **lịch sử phân trang** (trung bình 10 phút/tầng).
 *   - `GET /api/environment-history/sessions/{sessionId}/latest`
 *     → **bản ghi mới nhất** (hoặc `null` khi chưa có bucket nào được lưu).
 *
 * ## Vì sao có "Environment History" riêng?
 *
 * ⚠ Endpoint cũ `/api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *   đã bị **BE gỡ bỏ** (verify: route không còn trong Swagger ⇒ trả 404).
 *   Thay vào đó BE tổng hợp sẵn dữ liệu **theo tầng** mỗi 10 phút vào bảng
 *   `cultivation_environment_history` (job `jobs/environmentHistory.job.js`).
 *
 *   ⇒ Ưu điểm: 1 request phủ trọn cửa sổ (thay vì hàng trăm trang dữ liệu
 *   thô), đã gộp sẵn nhiệt độ/độ ẩm trung bình ⇒ không nghẽn connection pool.
 *
 * ## Shape response (đã verify từ Backend)
 *
 *   `GET /sessions/{sessionId}` →
 *   ```json
 *   {
 *     "data": [
 *       {
 *         "session_id": 1,
 *         "floor_id": 1,
 *         "period_start": "2026-01-01T10:00:00Z",
 *         "period_end": "2026-01-01T10:10:00Z",
 *         "growth_stage": "PINNING",
 *         "temperature_avg": 25,
 *         "humidity_avg": 82
 *       }
 *     ],
 *     "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
 *   }
 *   ```
 *
 *   `GET /sessions/{sessionId}/latest` → `{ "data": { …cùng shape… } }`
 *   (`data` = `null` khi chưa có bucket nào được lưu).
 *
 * ⚠ **Tên field giữ `snake_case`** cho khớp phần còn lại của module
 *   `features/sessions` (`admin-session.types.ts` cũng dùng snake_case).
 */

/** Giai đoạn canh tác — khớp `cultivation_progress.current_stage` của BE. */
export type SessionEnvironmentGrowthStage =
  | 'FRUITING_INITIATION'
  | 'PINNING'
  | 'YOUNG_FRUITING'
  | 'MATURATION'
  /** BE trả `UNKNOWN` khi phiên chưa có bản ghi tiến độ cho bucket đó. */
  | 'UNKNOWN'

/**
 * Một bản ghi lịch sử môi trường — **đã gộp sẵn 10 phút cho 1 tầng**.
 *
 * ⚠ Đây KHÔNG phải bản ghi thô của cảm biến: mỗi dòng là **trung bình**
 *   của các lần đo hợp lệ (không retained) trong khoảng 10 phút, tính theo
 *   tầng ⇒ không có `sensor_id` / `node_address` / `master_id`.
 */
export interface SessionEnvironmentRecord {
  /** `cultivation_environment_history.session_id`. */
  session_id: number | null
  /** `cultivation_environment_history.floor_id` — tầng của bản ghi. */
  floor_id: number | null
  /** Đầu khoảng gom (ISO 8601) — mốc thời gian của bản ghi. */
  period_start: string | null
  /** Cuối khoảng gom (ISO 8601, **exclusive**) — luôn `start + 10 phút`. */
  period_end: string | null
  /** Giai đoạn canh tác tại thời điểm kết thúc khoảng gom. */
  growth_stage: SessionEnvironmentGrowthStage | null
  /** Nhiệt độ trung bình (°C) — `null` = không có dữ liệu hợp lệ. */
  temperature_avg: number | null
  /** Độ ẩm trung bình (%RH) — `null` = không có dữ liệu hợp lệ. */
  humidity_avg: number | null
}

/** Query params của `GET /api/environment-history/sessions/{sessionId}`. */
export interface SessionEnvironmentHistoryQuery {
  /** Đầu khoảng (ISO 8601 **có timezone**) — khoảng là `[from, to)`. */
  from?: string
  /** Cuối khoảng (ISO 8601 **có timezone**) — khoảng là `[from, to)`. */
  to?: string
  /** Trang (BE mặc định 1, tối thiểu 1). */
  page?: number
  /** Số bản ghi mỗi trang — BE tối đa **100** (mặc định 20). */
  pageSize?: number
}

/**
 * Kết quả `GET /api/environment-history/sessions/{sessionId}`.
 *
 * ⚠ `records` đã bóc wrapper `data`; `pagination` đã chuẩn hoá về shape
 *   `{ page, pageSize, total, totalPages }` (BE đã trả đúng shape này).
 */
export interface SessionEnvironmentHistoryResult {
  records: SessionEnvironmentRecord[]
  pagination: SessionEnvironmentPagination
}

/**
 * Phân trang chuẩn hoá — BE trả `{ page, pageSize, total, totalPages }`.
 */
export interface SessionEnvironmentPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Kết quả `GET /api/environment-history/sessions/{sessionId}/latest`.
 *
 * ⚠ `null` khi BE trả `{ "data": null }` (chưa có bucket nào được lưu cho phiên)
 *   — **không** phải lỗi.
 */
export type SessionEnvironmentLatestResult = SessionEnvironmentRecord | null
