/**
 * Kiểm tra khay hằng ngày (Daily Tray Inspection) — DTO **read-only**.
 *
 * Nguồn:
 *   - `GET /api/cultivation-sessions/{sessionId}/daily-inspections`
 *   - `GET /api/cultivation-sessions/{sessionId}/trays/{sessionTrayId}/daily-inspections`
 *   (bản admin tương ứng có tiền tố `/admin`)
 *
 * ⚠ Phân biệt 2 bảng trong DB:
 *   - `spawn_inspections` + `spawn_inspection_images` → **giai đoạn 1**
 *     (nghỉ ủ phôi), xem `features/farm/types/farm.types.ts`.
 *   - `cultivation_inspections` + `cultivation_inspection_images` → **giai đoạn 2**
 *     (trồng trên khay), xem file này.
 *
 * ⚠ Web Admin chỉ GIÁM SÁT — endpoint ghi là
 *   `POST /api/cultivation-sessions/admin/session-trays/{sessionTrayId}/inspections`
 *   (do nhân viên thực hiện trên app) ⇒ module này **không** có hàm ghi.
 *
 * Quy ước: BE trả `camelCase` (đã alias trong SQL) → giữ nguyên `camelCase`
 * ở type, nhưng normalizer chấp nhận **cả** `snake_case` để an toàn.
 */

/** Ảnh của 1 lần kiểm tra khay (lưu trên Cloudinary). */
export interface DailyInspectionImage {
  /** `cultivation_inspection_images.image_id`. */
  image_id: number | null
  /** URL ảnh trên Cloudinary. */
  image_url: string | null
  /** Chú thích do nhân viên nhập kèm ảnh. */
  caption: string | null
  /** Thời điểm upload (ISO). */
  uploaded_at: string | null
}

/**
 * 1 lần kiểm tra khay hằng ngày — `cultivation_inspections`.
 *
 * ⚠ `session_tray_id` là khoá **gán khay trong phiên**
 *   (`cultivation_session_trays.session_tray_id`), KHÔNG phải `tray_id`
 *   vật lý — endpoint theo khay dùng đúng khoá này.
 */
export interface DailyInspection {
  inspection_id: number
  /** Khoá gán khay trong phiên — dùng cho endpoint theo khay. */
  session_tray_id: number | null
  /** `cultivation_trays.tray_id` (khi endpoint cấp session trả về). */
  tray_id: number | null
  tray_code: string | null
  tray_name: string | null
  /** Trạng thái gán khay tại thời điểm đọc (ACTIVE / RELEASED). */
  assignment_status: string | null
  /** Thời điểm kiểm tra (ISO). */
  inspection_date: string | null
  /** Giai đoạn sinh trưởng quan sát được. */
  growth_stage: string | null
  /** Tiến độ sinh trưởng 0–100 (theo khay — khác `cultivation_progress` vốn theo phiên). */
  growth_progress: number | null
  /** Tình trạng khay. */
  tray_condition: string | null
  /** Tình trạng nấm. */
  mushroom_condition: string | null
  /** Ghi chú của nhân viên. */
  notes: string | null
  /** Người thực hiện kiểm tra (`users.user_id`). */
  inspected_by: number | null
  inspected_by_name: string | null
  /** Ảnh kèm theo — có thể rỗng. */
  images: DailyInspectionImage[]
}

/** Metadata phân trang server-side (BE trả kèm `data`). */
export interface DailyInspectionPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Thông tin phiên đi kèm response cấp **session**. */
export interface DailyInspectionSessionInfo {
  session_id: number | null
  start_at: string | null
  end_at: string | null
  status: string | null
}

/** Thông tin gán khay đi kèm response cấp **khay**. */
export interface DailyInspectionTrayInfo {
  session_tray_id: number | null
  session_id: number | null
  tray_id: number | null
  assignment_status: string | null
  tray_code: string | null
  tray_name: string | null
}

/** Kết quả `GET .../{sessionId}/daily-inspections` (toàn bộ khay của phiên). */
export interface SessionDailyInspectionResult {
  session: DailyInspectionSessionInfo | null
  inspections: DailyInspection[]
  pagination: DailyInspectionPagination
}

/** Kết quả `GET .../{sessionId}/trays/{sessionTrayId}/daily-inspections`. */
export interface TrayDailyInspectionResult {
  tray: DailyInspectionTrayInfo | null
  inspections: DailyInspection[]
  pagination: DailyInspectionPagination
}

/** Bộ lọc phân trang của endpoint kiểm tra khay. */
export interface DailyInspectionQuery {
  page?: number
  pageSize?: number
}
