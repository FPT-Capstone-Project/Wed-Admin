/**
 * Customer-facing order views — DTO **read-only** cho Web Admin.
 *
 * Nguồn (toàn bộ đều là GET):
 *   - `GET /api/customer/orders/{orderId}/cultivation-status`
 *   - `GET /api/customer/orders/{orderId}/cultivation-progress`
 *   - `GET /api/customer/orders/{orderId}/spawn-inspections`
 *   - `GET /api/customer/orders/{orderId}/spawn-inspections/{inspectionId}`
 *
 * ⚠ BE cho phép Admin đọc **bất kỳ** đơn nào ("or any order as an admin")
 *   → đây là nguồn để Admin dựng lại danh sách đơn khách đã đặt, vì
 *   `GET /api/orders` chỉ trả đơn của chính user đăng nhập.
 *
 * ⚠ Swagger KHÔNG công khai response schema cho các endpoint này (chỉ mô tả
 *   "Current customer-visible cultivation state" / "Stage timeline").
 *   → Type dưới đây là **best-effort**, mọi field đều optional để không vỡ
 *   khi BE trả shape khác. API layer chuẩn hoá về đúng shape này.
 */

import type { CultivationSessionStatus } from '../../sessions/types/session.types'
import type {
  SpawnInspection,
  SpawnInspectionImage,
} from '../../farm/types/farm.types'

/**
 * Trạng thái canh tác nhìn từ phía khách (`cultivation-status`).
 *
 * Gộp cả "phiên" và "tiến độ" vì BE trả về một payload tổng hợp.
 */
export interface CustomerCultivationStatus {
  order_id?: number | null
  session_id?: number | null
  status?: CultivationSessionStatus | null
  /** Tiến độ 0–100. */
  progress_percent?: number | null
  /** Giai đoạn sinh trưởng (vd: "FRUITING"). */
  growth_stage?: string | null
  start_date?: string | null
  end_date?: string | null
  expected_harvest_date?: string | null
  mushroom_name?: string | null
  package_name?: string | null
  customer_name?: string | null
  customer_email?: string | null
  trays?: unknown[]
}

/** Một mốc trong timeline tiến độ (`cultivation-progress`). */
export interface CustomerCultivationProgressEntry {
  progress_id?: number | null
  session_id?: number | null
  /** Giai đoạn (vd: "PREPARATION" → "HARVEST"). */
  current_stage?: string | null
  /** Cũng có thể BE dùng tên `stage`. */
  stage?: string | null
  progress_percent?: number | null
  description?: string | null
  notes?: string | null
  created_at?: string | null
}

/** Kết quả `GET /api/customer/orders/{orderId}/cultivation-progress`. */
export interface CustomerCultivationProgress {
  order_id?: number | null
  session_id?: number | null
  current_stage?: string | null
  progress_percent?: number | null
  entries: CustomerCultivationProgressEntry[]
}

/** Lịch sử kiểm tra phôi theo đơn (`spawn-inspections`). */
export interface CustomerSpawnInspections {
  order_id?: number | null
  session_id?: number | null
  inspections: SpawnInspection[]
}

/** Chi tiết 1 lần kiểm tra phôi (`spawn-inspections/{inspectionId}`). */
export interface CustomerSpawnInspectionDetail {
  inspection_id: number
  order_id?: number | null
  session_id?: number | null
  total_checked?: number | null
  normal_quantity?: number | null
  warning_quantity?: number | null
  abnormal_quantity?: number | null
  condition?: string | null
  replacement_quantity?: number | null
  notes?: string | null
  next_check_at?: string | null
  images: SpawnInspectionImage[]
  checked_at?: string | null
  created_at?: string | null
}
