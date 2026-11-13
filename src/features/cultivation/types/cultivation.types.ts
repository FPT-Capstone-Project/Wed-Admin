/**
 * Mẻ canh tác (Cultivation Batch) — model **read-only** dựng từ API thật.
 *
 * ⚠ Thay thế hoàn toàn `types/cultivation.types.ts` cũ (mock `CultivationBatch`).
 *
 * Nguồn dữ liệu:
 *   - `GET /api/farm/sessions` → tiến độ, giai đoạn, khách, gói.
 *   - `GET /api/farm/sessions` → phôi đã cấp / còn lại, tên nấm, khách.
 *   - `GET /api/farm/sessions/{id}/spawn-inspections` → lịch sử kiểm tra phôi
 *     kèm ảnh thực tế trên Cloudinary.
 */

import type { SpawnInspection } from '../../farm/types/farm.types'
import {
  SESSION_STATUS_DICTIONARY,
  type SessionStatusKey,
} from '../../../shared/i18n/status/session'

/**
 * Giai đoạn sinh trưởng — hiển thị thân thiện cho Admin.
 *
 * ⚠ Ánh xạ từ `CultivationSessionStatus` của BE (9 trạng thái).
 *
 * ⚠ **Re-export** từ module trung tâm để không có 2 nguồn sự thật (2.C).
 */
export type GrowthStage = SessionStatusKey

/**
 * Nhãn tiếng Việt cho từng giai đoạn.
 *
 * ⚠ KHÔNG có `defaultProgress` nữa — trước đây mỗi giai đoạn hardcode một tỷ
 *   lệ tiến độ (`CULTIVATING` → 70 %) ⇒ cùng 1 phiên hiển thị khác nhau giữa
 *   các trang. Nay **mọi nơi** dùng chung `calculateSessionProgress()`
 *   (`src/shared/utils/date.ts`) — công thức theo thời gian thực.
 *
 * ⚠ Nguồn sự thật: `src/shared/i18n/status/session.ts` (nhãn chuẩn cho mọi
 *   màn hình) — trước đây file này giữ 1 bảng riêng với nhãn **khác** ("Ủ tơ
 *   / Nuôi sợi" vs "Phôi đang nảy mầm") ⇒ cùng 1 phiên hiển thị 2 nhãn.
 */
export const GROWTH_STAGE_META: Record<
  GrowthStage,
  { label: string; shortLabel: string }
> = Object.fromEntries(
  Object.entries(SESSION_STATUS_DICTIONARY).map(([key, value]) => [
    key,
    { label: value.label, shortLabel: value.shortLabel },
  ]),
) as Record<GrowthStage, { label: string; shortLabel: string }>

/** Sức khỏe phôi — kết luận của lần kiểm tra gần nhất. */
export type SpawnHealthStatus = 'NORMAL' | 'WARNING' | 'ABNORMAL' | 'UNKNOWN'

/** Một mẻ nấm, dựng từ API thật. */
export interface CultivationBatch {
  /** `session_id` của phiên canh tác. */
  id: number
  /** Mã hiển thị — `MCMS-S{orderId}-{sessionId}` hoặc `SES-{sessionId}`. */
  batchCode: string
  /** Mã đơn hàng liên quan (nếu có). */
  orderId: number | null
  /** Tên khách thuê. */
  tenantName: string
  /** Tên gói thuê. */
  packageName: string
  /** Giống nấm. */
  mushroomType: string
  /** Giai đoạn hiện tại (theo trạng thái phiên BE). */
  currentStage: GrowthStage
  /**
   * Giai đoạn WF-03 do Farm OP ghi nhận (`current_stage` / `growth_status`) —
   * `FRUITING_INITIATION` / `PINNING` / `YOUNG_FRUITING` / `MATURATION`.
   *
   * ⚠ Có thể `null` (Farm OP chưa ghi nhận) ⇒ phiên `CULTIVATING` mặc định
   *   hiển thị **"Kéo tơ"** — xem `resolveGrowthPhase`.
   */
  growthStage: string | null
  /** Tiến độ 0–100 (BE trả `progress_percent`). */
  progressPercent: number
  /** Ngày bắt đầu canh tác. */
  startDate: string | null
  /** Ngày dự kiến thu hoạch. */
  estimatedHarvestDate: string | null
  /** Ngày kết thúc (nếu đã đóng). */
  endDate: string | null
  /** Danh sách khay được gán (tên + mã). */
  trays: Array<{ trayId: number | null; code: string; name: string }>
  /** Số lượng phôi đã cấp / còn lại trong kho. */
  spawnIssued: number | null
  spawnRemaining: number | null
  /** Số khay của phiên. */
  trayCount: number | null
  /** Lịch sử kiểm tra phôi (mới nhất trước). */
  inspections: SpawnInspection[]
  /** Tổng số lần kiểm tra. */
  inspectionCount: number
  /** Kết luận sức khỏe của lần kiểm tra gần nhất. */
  healthStatus: SpawnHealthStatus
  /** Tổng ảnh thực tế từ Cloudinary (đã gom từ mọi lần kiểm tra). */
  photoCount: number
}

/** Lọc theo giai đoạn. */
export type GrowthStageFilter = GrowthStage | 'ALL'

/** Lọc theo sức khỏe phôi. */
export type SpawnHealthFilter = SpawnHealthStatus | 'ALL'
