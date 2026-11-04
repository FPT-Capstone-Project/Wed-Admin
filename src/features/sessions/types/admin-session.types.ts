/**
 * Phiên canh tác cho Web Admin — **read-only**, nguồn endpoint quản trị.
 *
 * Nguồn: `GET /api/cultivation-sessions/admin`
 *   (roles 1 = Admin, 2 = Farm Operator — Customer không được gọi).
 *
 * ⚠ Vì sao cần type riêng (không dùng `CultivationSession` của
 *   `session.types.ts`)?
 *
 *   `GET /api/farm/sessions` là luồng **farm spawn** — BE join theo luồng
 *   nhân viên và **không** phân trang server-side, không trả `trays[]`,
 *   không trả tiến độ/giai đoạn sinh trưởng đầy đủ.
 *
 *   → Endpoint quản trị trả **mọi phiên của mọi khách hàng**, có phân trang
 *     server-side, kèm khay được gán, giai đoạn sinh trưởng, tiến độ %
 *     và trạng thái thu hoạch ⇒ dùng làm nguồn chính cho trang "Phiên canh tác".
 */

import type { CultivationSessionStatus } from './session.types'

/**
 * Giai đoạn sinh trưởng — **4 giai đoạn** của BE (WF-03).
 *
 * Nguồn: Swagger `PATCH /api/cultivation-sessions/admin/{sessionId}/growth`
 * → `growthStatus.enum`.
 */
export type SessionGrowthStage =
  | 'FRUITING_INITIATION'
  | 'PINNING'
  | 'YOUNG_FRUITING'
  | 'MATURATION'

/** Danh sách đầy đủ 4 giai đoạn — dùng cho nhãn & bộ lọc. */
export const SESSION_GROWTH_STAGES: readonly SessionGrowthStage[] = [
  'FRUITING_INITIATION',
  'PINNING',
  'YOUNG_FRUITING',
  'MATURATION',
]

/**
 * Trạng thái thu hoạch — BE chỉ dùng 2 giá trị.
 *
 * Nguồn: `cultivation_sessions.harvest_status` (`NOT_READY` | `HARVEST_READY`).
 */
export type SessionHarvestStatus = 'NOT_READY' | 'HARVEST_READY'

/** Khay được gán cho phiên (shape của `cultivation_session_trays`). */
export interface AdminSessionTray {
  session_tray_id: number | null
  tray_id: number | null
  tray_code: string | null
  tray_name: string | null
  room_id: number | null
  room_name: string | null
  floor_id: number | null
  floor_name: string | null
  /** Số tầng (vd: 2) — fallback khi `floor_name` trống. */
  floor_number: number | null
  /** Trạng thái gán (ACTIVE / RELEASED / …). */
  assignment_status: string | null
  assigned_at: string | null
}

/**
 * Payload 1 phiên từ `GET /api/cultivation-sessions/admin`.
 *
 * ⚠ BE join sẵn `users` / `mushroom_types` / `rental_packages` / `orders` ⇒
 *   record đã phẳng, không cần gọi thêm endpoint khác để dựng bảng.
 */
export interface AdminCultivationSessionDto {
  session_id: number
  order_item_id: number | null
  /** `orders.order_id` (đơn sinh ra phiên này). */
  order_id: number | null
  /** `orders.user_id` — chủ phiên. */
  user_id: number | null
  customer_name: string | null
  customer_email: string | null
  mushroom_type_id: number | null
  mushroom_name: string | null
  package_id: number | null
  package_name: string | null
  /** Số khay của phiên (`order_items.quantity`). */
  tray_quantity: number | null
  /** Số đơn vị phôi (= `tray_quantity * 3`). */
  spawn_quantity: number | null
  /** Ngày bắt đầu canh tác (ISO). */
  start_at: string | null
  end_at: string | null
  duration_days: number | null
  /**
   * Ngày tạo phiên (ISO) — dùng để sắp xếp nhóm "Chờ xử lý" theo mới nhất.
   */
  created_at: string | null
  updated_at: string | null
  /** Ngày thu hoạch dự kiến (ISO). */
  harvest_date: string | null
  status: CultivationSessionStatus
  /** Trạng thái thu hoạch (NOT_READY / HARVEST_READY). */
  harvest_status: SessionHarvestStatus | null
  /** Giai đoạn sinh trưởng hiện tại. */
  current_stage: SessionGrowthStage | null
  /** Alias của `current_stage` (BE trả cả 2). */
  growth_status: SessionGrowthStage | null
  /** Tiến độ 0–100 từ record progress mới nhất. */
  progress_percent: number | null
  /** Sức khoẻ phôi quan sát (NORMAL / WARNING / ABNORMAL). */
  condition: string | null
  /** Ghi chú của lần quan sát gần nhất. */
  notes: string | null
  /** Phiên đã sẵn sàng thu hoạch hay chưa. */
  harvest_ready: boolean
  harvest_ready_at: string | null
  /** Thời điểm cập nhật tiến độ gần nhất. */
  progress_updated_at: string | null
  /** Khay được gán cho phiên. */
  trays: AdminSessionTray[]
}

/** Metadata phân trang server-side (BE trả kèm `data`). */
export interface AdminSessionPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Kết quả `GET /api/cultivation-sessions/admin`. */
export interface AdminCultivationSessionResult {
  items: AdminCultivationSessionDto[]
  pagination: AdminSessionPagination
}
