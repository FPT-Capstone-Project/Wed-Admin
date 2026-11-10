/**
 * Thư viện ảnh tổng hợp của 1 phiên canh tác — **read-only**.
 *
 * ⚠ Vì sao cần module này?
 *   BE tách ảnh làm **2 bảng** theo 2 giai đoạn nghiệp vụ:
 *     - Giai đoạn 1 (nghỉ ủ phôi)  → `spawn_inspections` +
 *       `spawn_inspection_images`, đọc qua
 *       `GET /api/farm/sessions/{id}/spawn-inspections`.
 *     - Giai đoạn 2 (trồng trên khay) → `cultivation_inspections` +
 *       `cultivation_inspection_images`, đọc qua
 *       `GET /api/cultivation-sessions/{id}/daily-inspections`.
 *
 *   Nghiệp vụ lại yêu cầu màn Phiên hiển thị **một thư viện ảnh liền mạch**
 *   từ lúc nhận phôi ủ tơ tới khi thu hoạch xong ⇒ FE phải **gộp** 2 nguồn.
 *
 * ⚠ BE chưa có endpoint gộp sẵn ⇒ module này gộp ở tầng FE. Khi BE bổ sung
 *   `GET /api/cultivation-sessions/admin/{sessionId}/gallery`, chỉ cần thay
 *   phần gộp bằng 1 call — shape `SessionGalleryPhoto` giữ nguyên.
 */

/** Giai đoạn vòng đời mà ảnh thuộc về. */
export type SessionGalleryPhase = 'SPAWN' | 'TRAY'

/**
 * 1 ảnh trong thư viện tổng hợp.
 *
 * ⚠ `sourceUrl` là khoá ổn định để React key + phân biệt 2 ảnh trùng URL
 *   từ 2 lần kiểm tra khác nhau.
 */
export interface SessionGalleryPhoto {
  /** Khoá ổn định (unique) cho ảnh. */
  sourceUrl: string
  /** URL ảnh trên Cloudinary. */
  url: string
  /** Chú thích (do nhân viên nhập). */
  caption: string | null
  /** Thời điểm ghi nhận (ISO). */
  takenAt: string | null
  /** Giai đoạn vòng đời. */
  phase: SessionGalleryPhase
  /** Mã lần kiểm tra sinh ra ảnh. */
  inspectionId: number | null
  /** Nhãn khay (giai đoạn 2) — `null` ở giai đoạn 1. */
  trayLabel: string | null
}

/** Thống kê thư viện ảnh. */
export interface SessionGalleryStats {
  /** Tổng số ảnh. */
  total: number
  /** Số ảnh giai đoạn 1 (phôi). */
  spawnCount: number
  /** Số ảnh giai đoạn 2 (khay). */
  trayCount: number
  /** Số lần kiểm tra đã ghi nhận (cả 2 giai đoạn). */
  inspectionCount: number
}
