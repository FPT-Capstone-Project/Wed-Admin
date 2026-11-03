/**
 * Phiên canh tác (Cultivation Session) — DTO **read-only** cho Web Admin.
 *
 * Nguồn: `GET /api/farm/sessions` và
 *        `GET /api/farm/sessions/{sessionId}`.
 *
 * ⚠ Web Admin chỉ GIÁM SÁT. Mọi hành động ghi (tạo tiến độ, ghi nhận
 *   kiểm tra, nhập thu hoạch, chuyển giai đoạn, huỷ, gửi thông báo) do
 *   **nhân viên (staff)** thực hiện trên app — xem `features/auth/permissions.ts`.
 *   Vì vậy module này **không** có bất kỳ hàm POST/PATCH/PUT/DELETE nào.
 *
 * Quy ước: BE trả `snake_case` → giữ nguyên `snake_case` trong type.
 * Mọi field không chắc chắn đều `optional` + `null` vì BE chưa công khai
 * schema chi tiết (Swagger chỉ mô tả query params + response 200 rỗng).
 */

/**
 * Trạng thái phiên canh tác — **8 trạng thái** của BE.
 *
 * Nguồn: Swagger `GET /api/farm/sessions` → `status.enum`.
 * Thứ tự là thứ tự vòng đời thật:
 *   PENDING → SPAWN_RESTING → MYCELIAL_DEVELOPMENT → READY_FOR_CULTIVATION
 *   → CULTIVATING → HARVESTING → COMPLETED | CANCELLED
 */
export type CultivationSessionStatus =
  | 'PENDING'
  | 'SPAWN_RESTING'
  | 'MYCELIAL_DEVELOPMENT'
  | 'READY_FOR_CULTIVATION'
  | 'CULTIVATING'
  | 'HARVEST_READY'
  | 'HARVESTING'
  | 'COMPLETED'
  | 'CANCELLED'

/** Danh sách đầy đủ 8 trạng thái — dùng cho bộ lọc & thống kê. */
export const CULTIVATION_SESSION_STATUSES: readonly CultivationSessionStatus[] =
  [
    'PENDING',
    'SPAWN_RESTING',
    'MYCELIAL_DEVELOPMENT',
    'READY_FOR_CULTIVATION',
    'CULTIVATING',
    'HARVEST_READY',
    'HARVESTING',
    'COMPLETED',
    'CANCELLED',
  ]

/**
 * Trạng thái phiên được coi là "đang chạy" (chưa đóng, chưa huỷ).
 * Dùng để gắn khay ↔ phiên trên ô khay (Room/Rack).
 */
export const ACTIVE_SESSION_STATUSES: ReadonlySet<CultivationSessionStatus> =
  new Set<CultivationSessionStatus>([
    'PENDING',
    'SPAWN_RESTING',
    'MYCELIAL_DEVELOPMENT',
    'READY_FOR_CULTIVATION',
    'CULTIVATING',
    'HARVEST_READY',
    'HARVESTING',
  ])

/** Phiên đã kết thúc (không còn thao tác vận hành). */
export const CLOSED_SESSION_STATUSES: ReadonlySet<CultivationSessionStatus> =
  new Set<CultivationSessionStatus>(['COMPLETED', 'CANCELLED'])

/** Khay được gán cho phiên. */
export interface SessionTray {
  /** `cultivation_session_trays.id` — dùng cho endpoint kiểm tra theo khay. */
  session_tray_id?: number | null
  /** `cultivation_trays.tray_id`. */
  tray_id?: number | null
  tray_code?: string | null
  tray_name?: string | null
  room_id?: number | null
  room_code?: string | null
  room_name?: string | null
  floor_id?: number | null
  floor_number?: number | null
  floor_name?: string | null
  /** Số lượng phôi cấp cho khay (nếu BE trả). */
  spawn_quantity?: number | null
  status?: string | null
}

/** Phiên canh tác — BE trả flat, đã join customer / package / mushroom. */
export interface CultivationSession {
  harvest_status?: string | null
  order_item_id?: number | null
  spawn_quantity?: number | null
  last_inspected_at?: string | null
  session_id: number
  order_id?: number | null
  user_id?: number | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  package_id?: number | null
  package_name?: string | null
  mushroom_type_id?: number | null
  mushroom_name?: string | null
  status: CultivationSessionStatus
  /** Tiến độ 0–100 (BE có thể trả ở record progress mới nhất). */
  progress_percent?: number | null
  /** Ngày bắt đầu canh tác (ISO). */
  start_date?: string | null
  /** Ngày kết thúc dự kiến / thực tế (ISO). */
  end_date?: string | null
  expected_harvest_date?: string | null
  /** Số khay được gán. */
  tray_count?: number | null
  /** Danh sách khay được gán (BE có thể chỉ trả ở endpoint chi tiết). */
  trays: SessionTray[]
  payment_status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** Metadata phân trang được tính tại frontend từ danh sách farm. */
export interface SessionPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Bộ lọc UI: chỉ status gửi lên API; các trường còn lại xử lý tại frontend. */
export interface SessionListQuery {
  /** Đọc quan hệ khay từ trạng thái canh tác của đơn hàng. */
  includeTrays?: boolean
  status?: CultivationSessionStatus
  userId?: number
  trayId?: number
  mushroomTypeId?: number
  /** ISO date-time, vd: '2026-10-01T00:00:00.000Z' */
  startDateFrom?: string
  /** ISO date-time */
  startDateTo?: string
  /** Trang UI, mặc định 1 */
  page?: number
  /** Kích thước trang UI; bỏ trống để lấy đủ danh sách */
  pageSize?: number
}

/** Contract returned by GET /api/farm/sessions (no server pagination). */
export interface FarmSessionListDto {
  session_id: number
  status: CultivationSessionStatus
  harvest_status: string
  start_at: string | null
  harvest_date: string | null
  order_item_id: number
  tray_quantity: number
  spawn_quantity: number
  mushroom_name: string
  order_id: number
  customer_name: string
  last_inspected_at: string | null
}
export interface FarmSessionListResponse { data: FarmSessionListDto[] }
