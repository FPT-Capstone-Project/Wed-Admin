/**
 * Rentals (Admin) — DTOs khớp Swagger + response thực tế từ BE.
 * Endpoints: /api/rentals/admin/*
 *
 * Quy ước: giữ nguyên snake_case cho field BE trả về (vd: `rental_id`),
 * request body dùng camelCase (vd: `trayId`) — đúng như các module khác.
 *
 * ⚠ Lưu ý quyền: Tất cả endpoint `/api/rentals/admin/*` yêu cầu role_id 1 (Admin)
 * hoặc 2 (Farm Operator), trừ `/cancel` chỉ cho Admin (role_id 1).
 */

/** Trạng thái vụ thuê — BE trả về đúng 5 giá trị này. */
export type RentalStatus =
  | 'CONFIRMED'
  | 'PREPARING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'

/** Giai đoạn sinh trưởng — chỉ dùng cho tiến độ canh tác. */
export type CultivationStage =
  | 'PREPARATION'
  | 'INCUBATION'
  | 'PINNING'
  | 'FRUITING'
  | 'HARVEST'

/** Trạng thái thanh toán của đơn gốc. */
export type RentalPaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | string

/** Trạng thái chỉ dùng cho PATCH (BE chỉ cho phép CONFIRMED → PREPARING). */
export type RentalPatchStatus = Extract<RentalStatus, 'PREPARING'>

// ─── Rental ────────────────────────────────────────────────────────────────

/**
 * Rental detail/list — BE trả flat, đã join sẵn customer / package /
 * mushroom / tray / room / floor. Các field liên quan có thể `null` khi
 * rental chưa được gán khay hoặc chưa bắt đầu.
 */
export interface Rental {
  rental_id: number
  order_id: number
  user_id: number
  customer_name: string
  customer_email: string
  customer_phone: string | null

  package_id: number
  package_name: string

  mushroom_type_id: number
  mushroom_name: string

  duration_days: number

  tray_id: number | null
  tray_code: string | null
  tray_name: string | null

  room_id: number | null
  room_code: string | null
  room_name: string | null

  floor_id: number | null
  floor_number: number | null
  floor_name: string | null

  start_date: string | null
  end_date: string | null

  status: RentalStatus
  payment_status: RentalPaymentStatus
  created_at: string
  updated_at: string
}

/** Metadata phân trang — BE trả kèm cùng list dưới key `pagination`. */
export interface RentalPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Shape thô của `GET /api/rentals/admin` trước khi unwrap. */
export interface RentalListResponse {
  data: Rental[]
  pagination: RentalPagination
}

// ─── List query ───────────────────────────────────────────────────────────

export interface RentalListQuery {
  status?: RentalStatus
  userId?: number
  packageId?: number
  trayId?: number
  /** ISO date-time, vd: '2026-10-01T00:00:00.000Z' */
  startDateFrom?: string
  /** ISO date-time */
  startDateTo?: string
  /** Mặc định BE = 1 */
  page?: number
  /** Mặc định BE = 20, tối đa 100 */
  pageSize?: number
}

// ─── Requests ─────────────────────────────────────────────────────────────

/** `POST /api/rentals/admin/from-order` — tạo rental thủ công cho đơn đã thanh toán. */
export interface CreateRentalFromOrderRequest {
  orderId: number
}

/**
 * `POST /api/rentals/admin/{rentalId}/cultivation-session` — bắt đầu canh tác.
 * BE tự suy ra mushroom type từ rental order, tạo session + progress
 * PREPARATION đầu tiên, gán khay, đánh dấu khay OCCUPIED.
 */
export interface StartCultivationSessionRequest {
  trayId: number
}

/** `POST /api/rentals/admin/{rentalId}/progress` — ghi nhận tiến độ. */
export interface RecordRentalProgressRequest {
  currentStage: CultivationStage
  /** 0 – 100 */
  progressPercent: number
  /** Tối đa 1000 ký tự */
  description?: string
}

/** `POST /api/rentals/admin/{rentalId}/harvests` — ghi nhận thu hoạch. */
export interface RecordRentalHarvestRequest {
  /** Phải > 0 */
  quantity: number
  /** Tối đa 20 ký tự, vd: 'kg' */
  unit: string
  /** Tối đa 20 ký tự, vd: 'A' */
  qualityGrade?: string
  /** Tối đa 1000 ký tự */
  notes?: string
  /** Định dạng `YYYY-MM-DD`. Mặc định BE = hôm nay. */
  harvestDate?: string
}

/** `POST /api/rentals/admin/{rentalId}/complete` — body là optional. */
export interface CompleteRentalRequest {
  /** Tối đa 1000 ký tự */
  note?: string
}

/** `POST /api/rentals/admin/{rentalId}/cancel` — chỉ Admin (role_id 1). */
export interface CancelRentalRequest {
  /** 3 – 500 ký tự */
  reason: string
}

/**
 * `PATCH /api/rentals/admin/{rentalId}` — duyệt rental hoặc chỉnh sửa.
 * BE chỉ hỗ trợ chuyển trạng thái `CONFIRMED → PREPARING`.
 */
export interface UpdateRentalRequest {
  status?: RentalPatchStatus
  /** Set `null` để gỡ khay đang gán. */
  trayId?: number | null
  /** Tối thiểu 1 */
  durationDays?: number
  /** Set `null` để xoá mốc bắt đầu. */
  startDate?: string | null
  /** Set `null` để xoá mốc kết thúc. */
  endDate?: string | null
}