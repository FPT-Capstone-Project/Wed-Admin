/**
 * Tiến độ sinh trưởng (0–100 %) — **chỉ lấy từ Phiên canh tác (Session)**.
 *
 * ## Nguồn duy nhất
 *
 * Trường `progress_percent` (hoặc `progress`) của **Phiên canh tác** —
 * giá trị do Farm OP cập nhật qua API của phiên
 * (`PATCH /api/cultivation-sessions/admin/{id}/growth`).
 *
 * ## Đã loại bỏ (và KHÔNG được khôi phục)
 *
 * 1. ❌ Công thức "nhẩm" % theo số ngày trôi qua
 *    (`start_date` / `harvest_date` / `duration_days`) — trước đây nằm ở
 *    `calculateSessionProgress()` (`src/shared/utils/date.ts`) và
 *    `calculateTimeBasedProgress()` (file này).
 *    ⇒ Lý do: cùng 1 phiên hiển thị **0 %** ở một trang và **70 %** ở trang
 *    khác ⇒ người dùng mất niềm tin vào số liệu.
 * 2. ❌ `%` lấy từ **báo cáo khay** (tray inspection) —
 *    `growth_progress` của `cultivation_inspections` chỉ là **quan sát tại
 *    thời điểm kiểm tra**, KHÔNG phải tiến độ của phiên.
 *    ⇒ Vì vậy `DailyInspectionList` hiển thị nó dưới dạng
 *    "Tiến độ quan sát" (nhãn riêng), **không** dùng làm tiến độ phiên.
 * 3. ❌ Bảng tiến độ mặc định theo trạng thái (`SESSION_DEFAULT_PROGRESS`).
 *
 * ## Hợp đồng
 *
 * - `resolveSessionProgress()` → **luôn** trả về `number` 0–100.
 *   Khi BE chưa có `progress_percent` ⇒ trả `0` (không bịa giá trị).
 * - `formatSessionProgress()` → chuỗi hiển thị (`'—'` khi chưa có dữ liệu).
 */

/** Kẹp về khoảng 0–100. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/**
 * Format tiến độ đã ghi nhận — **không** tự suy ra giá trị khi thiếu dữ liệu.
 *
 * @param value `progress_percent` / `progress` của Phiên canh tác.
 */
export function formatSessionProgress(
  value: number | string | null | undefined,
): string {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return '—'
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '—'
  return `${clampPercent(parsed)}%`
}

/**
 * Tiến độ cuối cùng của 1 phiên — **nguồn duy nhất: Phiên canh tác**.
 *
 * ⚠ KHÔNG suy ra từ ngày bắt đầu / ngày thu hoạch / số ngày trôi qua.
 *
 * @param progressPercent Tiến độ do BE trả (`progress_percent`), nếu có.
 * @param status Trạng thái phiên — `COMPLETED` ⇒ 100 %, `CANCELLED` ⇒ 0 %.
 *   (2 trường hợp này là **sự thật** về vòng đời, không phải số liệu bịa.)
 */
export function resolveSessionProgress(
  progressPercent: number | string | null | undefined,
  status?: string,
): number {
  // Phiên đã đóng — trạng thái vòng đời là sự thật, không phải "nhẩm".
  if (status === 'COMPLETED') return 100
  if (status === 'CANCELLED') return 0

  if (progressPercent == null) return 0
  const parsed = Number(progressPercent)
  if (!Number.isFinite(parsed)) return 0
  return clampPercent(parsed)
}
