/**
 * Farm Spawn Workflow — DTO **read-only** cho Web Admin.
 *
 * Nguồn: `GET /api/farm/sessions`, `GET /api/farm/sessions/{id}` và
 *        `GET /api/farm/sessions/{id}/spawn-inspections`.
 *
 * ⚠ Web Admin chỉ GIÁM SÁT. Các endpoint ghi của luồng này
 *   (`POST /api/farm/sessions/{id}/spawn-inspections`,
 *   `PATCH /api/farm/sessions/{id}/stage`,
 *   `POST /api/farm/spawn-inspections/{id}/images`,
 *   `POST /api/farm/spawn-inspections/{id}/replacements`)
 *   do **nhân viên (staff)** thực hiện → module này KHÔNG có hàm ghi nào.
 */

import type { CultivationSessionStatus } from '../../sessions/types/session.types'

/** Trạng thái sức khoẻ phôi khi kiểm tra — đúng 3 giá trị BE chấp nhận. */
export type SpawnInspectionCondition = 'NORMAL' | 'WARNING' | 'ABNORMAL'

/**
 * Phiên canh tác trong luồng Farm Spawn Workflow.
 *
 * ⚠ BE (`GET /api/farm/sessions`) trả **flat** và có các field mà
 *   `GET /api/farm/sessions` không có:
 *   - `order_id`, `customer_name`, `customer_email` — để Admin dựng lại
 *     danh sách đơn khách đã đặt (vì `GET /api/orders` chỉ trả đơn của
 *     chính user đăng nhập).
 *   - `package_name`, `mushroom_name`.
 *   - `spawn_issued` — số đơn vị phôi đã cấp.
 */
export interface FarmSession {
  harvest_status?: string | null
  expected_harvest_date?: string | null
  last_inspected_at?: string | null
  order_item_id?: number | null
  session_id: number
  order_id?: number | null
  user_id?: number | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  package_name?: string | null
  mushroom_name?: string | null
  mushroom_type_id?: number | null
  status: CultivationSessionStatus
  /** Trạng thái thanh toán của đơn (`orders.payment_status`). */
  payment_status?: string | null
  /** Số đơn vị phôi đã cấp cho phiên. */
  spawn_issued?: number | null
  /** Số lượng phôi còn lại trong kho. */
  spawn_remaining?: number | null
  /** Tổng số khay của phiên. */
  tray_count?: number | null
  /** Số lượng phôi yêu cầu ban đầu. */
  spawn_quantity?: number | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** Ảnh kiểm tra phôi lưu trên Cloudinary. */
export interface SpawnInspectionImage {
  image_id?: number | null
  /** URL ảnh trên Cloudinary. */
  url?: string | null
  secure_url?: string | null
  public_id?: string | null
  caption?: string | null
  created_at?: string | null
}

/** Một lần kiểm tra phôi. */
export interface SpawnInspection {
  inspection_id: number
  session_id?: number | null
  /** Tổng số đơn vị phôi đã kiểm tra (≥ 1). */
  total_checked?: number | null
  /** Số đơn vị bình thường. */
  normal_quantity?: number | null
  /** Số đơn vị cảnh báo. */
  warning_quantity?: number | null
  /** Số đơn vị bất thường. */
  abnormal_quantity?: number | null
  /** Kết luận sức khoẻ phôi. */
  condition?: SpawnInspectionCondition | null
  /** Số lượng phôi thay thế đã cấp. */
  replacement_quantity?: number | null
  /** Ghi chú kỹ thuật. */
  notes?: string | null
  /** Mốc kiểm tra tiếp theo (ISO). */
  next_check_at?: string | null
  /** Danh sách ảnh Cloudinary kèm theo lần kiểm tra. */
  images?: SpawnInspectionImage[]
  checked_at?: string | null
  created_at?: string | null
}

/** Kết quả `GET /api/farm/sessions/{id}/spawn-inspections`. */
export interface SpawnInspectionHistory {
  session_id?: number | null
  inspections: SpawnInspection[]
  total_checked?: number | null
  normal_quantity?: number | null
  warning_quantity?: number | null
  abnormal_quantity?: number | null
  replacement_quantity?: number | null
}
