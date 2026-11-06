/**
 * Environment History — DTO khớp `GET /api/analytics/dashboard/environment-history`.
 *
 * ⚠ Đây là nguồn dữ liệu **duy nhất** cho biểu đồ giám sát môi trường
 *   (nhiệt độ / độ ẩm theo tầng) của trang Tổng quan.
 *
 * Trước đây trang này phải **gom dữ liệu từ nhiều nơi**:
 *   - `GET /api/iot/floors` (danh sách tầng)
 *   - `GET /api/iot/masters` (map master)
 *   - `GET /api/iot/floors/{id}/environment` × N tầng (ngưỡng + trạng thái)
 *   - `GET /api/iot/masters/{m}/nodes/{n}/sensors/{s}/history` × (N tầng × 3 cảm biến)
 *     với phân trang `limit/offset` tay → 1 request cho mỗi 1000 bản ghi.
 *
 * Nay **một request** trả sẵn toàn bộ: cửa sổ thời gian, kích thước bucket,
 * nhịp làm mới đề xuất, ngưỡng hiện tại của từng tầng và chuỗi điểm đã gộp.
 *
 * Response thật (Swagger):
 * ```json
 * {
 *   "data": {
 *     "from": 1767225600000,
 *     "to": 1767312000000,
 *     "bucketMs": 900000,
 *     "refreshAfterMs": 300000,
 *     "floors": [
 *       {
 *         "floorId": 1, "floorName": "Tầng 1", "floorNumber": 1, "roomId": 1,
 *         "masterDbId": 3, "masterId": "9f2c…", "nodeId": 1,
 *         "thresholds": { "temperature_min": 20, "temperature_max": 28,
 *                         "humidity_min": 80, "humidity_max": 92 },
 *         "points": [ { "timestamp": 1767225600000, "temperature": 25.3, "humidity": 85.1 } ]
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * Quy ước BE (xem mô tả Swagger):
 *   - Cửa sổ mặc định = 24 giờ kết thúc tại mốc 5 phút gần nhất, gồm 96 bucket
 *     15 phút. Khoảng là `[from, to)` ⇒ `to` là mốc **exclusive**.
 *   - Bucket bắt đầu từ `from`; mỗi metric được trung bình **theo từng cảm biến
 *     rồi trung bình đều giữa các cảm biến** (giống hàm việc của FE cũ).
 *   - Chỉ tính mẫu **hợp lệ, không retained** của cảm biến 1–3.
 *   - Thiếu dữ liệu ⇒ `null` (không phải `0`).
 *   - `thresholds` là cấu hình **hiện tại** của tầng, không phải ngưỡng lịch sử.
 */

/** Ngưỡng hiện tại của một tầng — null nghĩa là chưa có mục tiêu. */
export interface EnvironmentHistoryThresholds {
  temperature_min: number | null
  temperature_max: number | null
  humidity_min: number | null
  humidity_max: number | null
}

/** Một điểm biểu đồ — giá trị đã gộp theo bucket của tầng. */
export interface EnvironmentHistoryPoint {
  /** Đầu bucket (epoch milliseconds). */
  timestamp: number
  /** Nhiệt độ (°C) — `null` = thiếu dữ liệu. */
  temperature: number | null
  /** Độ ẩm tương đối (%RH) — `null` = thiếu dữ liệu. */
  humidity: number | null
}

/** Lịch sử môi trường của một tầng. */
export interface EnvironmentHistoryFloor {
  /** Định danh tầng theo BE (`cultivation_floors.floor_id`). */
  floorId: number
  /** Tên hiển thị trên tiêu đề biểu đồ (vd "Tầng 1"). */
  floorName: string
  floorNumber: number | null
  roomId: number | null
  masterDbId: number | null
  /** Định danh master dạng chuỗi (UUID) — BE đã dùng để join lịch sử. */
  masterId: string | null
  nodeId: number | null
  thresholds: EnvironmentHistoryThresholds | null
  /** Các điểm đã gộp, sắp theo thời gian tăng dần. */
  points: EnvironmentHistoryPoint[]
}

/** Payload `data` của endpoint — shape đã bóc wrapper. */
export interface EnvironmentHistoryData {
  /** Đầu cửa sổ (epoch milliseconds). */
  from: number
  /** Cuối cửa sổ **exclusive** (epoch milliseconds). */
  to: number
  /** Kích thước bucket (ms) — mặc định 15 phút. */
  bucketMs: number
  /** Nhịp làm mới mà BE khuyến nghị (ms) — mặc định 5 phút. */
  refreshAfterMs: number
  /** Tầng theo phòng rồi theo số thứ tự tầng. */
  floors: EnvironmentHistoryFloor[]
}
