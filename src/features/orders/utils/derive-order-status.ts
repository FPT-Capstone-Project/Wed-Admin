import type { AdminCultivationSessionDto } from '../../sessions/types/admin-session.types'
import type { CultivationSessionStatus } from '../../sessions/types/session.types'
import type { AdminOrderStatus } from '../types/admin-order.types'

/**
 * Trạng thái dẫn xuất của đơn hàng — dựng từ **trạng thái phiên canh tác**.
 *
 * ## Vì sao cần?
 *
 * ⚠ **Lỗi BE** — có 2 luồng kết thúc phiên nhưng chỉ 1 luồng cập nhật
 *   `orders.status`:
 *
 *   1. `Backend/src/models/cultivationSession.model.js` → `completeForAdmin()`
 *      ⇒ set `cultivation_sessions.status = 'COMPLETED'` **và** update
 *        `orders.status = 'COMPLETED'` (khi không còn phiên nào active) ✅
 *
 *   2. `Backend/src/models/harvestRequest.model.js` → `complete()`
 *      (bàn giao thu hoạch) ⇒ set `cultivation_sessions.status = 'COMPLETED'`
 *        nhưng **KHÔNG** update `orders.status` ❌
 *
 *   ⇒ Đơn đã thu hoạch xong vẫn hiện **"Đang xử lý"** (`PROCESSING`) vĩnh viễn.
 *
 * ⚠ **Vì sao sửa ở FE mà không sửa BE?**
 *   Đây là trang **giám sát read-only** của Web Admin. Sửa FE giúp hiển thị
 *   đúng ngay ⇒ đồng thời còn đúng khi BE đã được vá (trạng thái dẫn xuất sẽ
 *   khớp với `orders.status` ⇒ không còn hiệu lực).
 *
 * ⚠ **Nguyên tắc an toàn** — chỉ suy ra khi **chắc chắn**:
 *   - Đơn phải có ít nhất 1 phiên.
 *   - Phải nắm **đủ** danh sách phiên của đơn (nếu danh sách bị cắt cụt thì
 *     không được kết luận "tất cả đã hoàn tất").
 *   - Trạng thái kết thúc của BE (`COMPLETED` / `CANCELLED`) luôn thắng.
 */

/** Thứ tự tiến trình của 1 phiên — dùng để chọn phiên "đại diện". */
const SESSION_PROGRESS_ORDER: readonly CultivationSessionStatus[] = [
  'PENDING',
  'SPAWN_RESTING',
  'MYCELIAL_DEVELOPMENT',
  'READY_FOR_CULTIVATION',
  'CULTIVATING',
  'HARVEST_READY',
  'HARVESTING',
  'COMPLETED',
]

/** Vị trí của 1 trạng thái phiên trong dãy tiến trình (cao = tiến xa hơn). */
function sessionProgress(status: CultivationSessionStatus): number {
  const index = SESSION_PROGRESS_ORDER.indexOf(status)
  return index === -1 ? 0 : index
}

/**
 * Phiên **đại diện** cho 1 đơn (1 đơn có thể sinh nhiều phiên).
 *
 * ⚒ Ưu tiên phiên **đang chạy** và tiến trình **xa nhất** — vì đó là thông tin
 *   user quan tâm nhất ("đơn này đang ở đâu").
 *
 * @returns `null` khi đơn không có phiên nào.
 */
export function pickRepresentativeSession(
  sessions: readonly AdminCultivationSessionDto[],
): AdminCultivationSessionDto | null {
  if (sessions.length === 0) return null

  // 1) Phiên đang chạy (chưa đóng, chưa huỷ) — lấy phiên tiến xa nhất.
  const running = sessions.filter(
    session => session.status !== 'COMPLETED' && session.status !== 'CANCELLED',
  )
  if (running.length > 0) {
    return running.reduce((best, session) =>
      sessionProgress(session.status) > sessionProgress(best.status)
        ? session
        : best,
    )
  }

  // 2) Tất cả đã đóng ⇒ ưu tiên phiên `COMPLETED` (đã thu hoạch xong).
  return (
    sessions.find(session => session.status === 'COMPLETED') ?? sessions[0]
  )
}

/**
 * Trạng thái phiên **đại diện** cho 1 đơn — dùng cho cột "Phiên canh tác".
 *
 * @returns `null` khi đơn không có phiên nào.
 */
export function deriveSessionStatus(
  sessions: readonly AdminCultivationSessionDto[],
): CultivationSessionStatus | null {
  return pickRepresentativeSession(sessions)?.status ?? null
}

/**
 * Trạng thái đơn **dẫn xuất** — sửa lỗi đơn kẹt "Đang xử lý".
 *
 * @param orderStatus Trạng thái đơn từ BE (`orders.status`).
 * @param sessions **Tất cả** phiên của đơn đó.
 * @param sessionsComplete `true` khi đã nắm **đủ** phiên của đơn. Nếu `false`
 *   ⇒ không được kết luận "tất cả đã hoàn tất" (có thể còn phiên chưa tải).
 *
 * @returns Trạng thái hiển thị cho đơn.
 */
export function deriveOrderStatus(
  orderStatus: AdminOrderStatus,
  sessions: readonly AdminCultivationSessionDto[],
  sessionsComplete: boolean,
): AdminOrderStatus {
  // BE đã kết thúc đơn ⇒ giữ nguyên, không cần suy ra.
  if (orderStatus === 'COMPLETED' || orderStatus === 'CANCELLED') {
    return orderStatus
  }

  if (sessions.length === 0) return orderStatus

  // ⚠ Chỉ kết luận "hoàn tất" khi nắm **đủ** danh sách phiên của đơn.
  if (!sessionsComplete) return orderStatus

  const allCompleted = sessions.every(
    session => session.status === 'COMPLETED',
  )
  if (allCompleted) return 'COMPLETED'

  const allCancelled = sessions.every(
    session => session.status === 'CANCELLED',
  )
  if (allCancelled) return 'CANCELLED'

  // Còn phiên đang chạy ⇒ giữ trạng thái của BE (CONFIRMED / PROCESSING).
  return orderStatus
}
