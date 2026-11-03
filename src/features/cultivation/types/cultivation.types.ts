/**
 * Mẻ canh tác (Cultivation Batch) — model **read-only** dựng từ API thật.
 *
 * ⚠ Thay thế hoàn toàn `types/cultivation.types.ts` cũ (mock `CultivationBatch`).
 *
 * Nguồn dữ liệu:
 *   - `GET /api/cultivation-sessions/admin` → tiến độ, giai đoạn, khách, gói.
 *   - `GET /api/farm/sessions` → phôi đã cấp / còn lại, tên nấm, khách.
 *   - `GET /api/farm/sessions/{id}/spawn-inspections` → lịch sử kiểm tra phôi
 *     kèm ảnh thực tế trên Cloudinary.
 */

import type { SpawnInspection } from '../../farm/types/farm.types'

/**
 * Giai đoạn sinh trưởng — hiển thị thân thiện cho Admin.
 *
 * ⚠ Ánh xạ từ `CultivationSessionStatus` của BE (8 trạng thái).
 */
export type GrowthStage =
  | 'PENDING'
  | 'SPAWN_RESTING'
  | 'MYCELIAL_DEVELOPMENT'
  | 'READY_FOR_CULTIVATION'
  | 'CULTIVATING'
  | 'HARVESTING'
  | 'COMPLETED'
  | 'CANCELLED'

/** Nhãn tiếng Việt + tỷ lệ tiến độ mặc định của từng giai đoạn. */
export const GROWTH_STAGE_META: Record<
  GrowthStage,
  { label: string; shortLabel: string; defaultProgress: number }
> = {
  PENDING: { label: 'Chờ xử lý', shortLabel: 'Chờ xử lý', defaultProgress: 5 },
  SPAWN_RESTING: {
    label: 'Ủ tơ / Nuôi sợi',
    shortLabel: 'Ủ tơ',
    defaultProgress: 20,
  },
  MYCELIAL_DEVELOPMENT: {
    label: 'Phát triển tơ (Nuôi sợi)',
    shortLabel: 'Nuôi sợi',
    defaultProgress: 35,
  },
  READY_FOR_CULTIVATION: {
    label: 'Sẵn sàng canh tác',
    shortLabel: 'Sẵn sàng',
    defaultProgress: 50,
  },
  CULTIVATING: {
    label: 'Đang canh tác',
    shortLabel: 'Đang canh tác',
    defaultProgress: 70,
  },
  HARVESTING: {
    label: 'Thu hoạch',
    shortLabel: 'Thu hoạch',
    defaultProgress: 90,
  },
  COMPLETED: { label: 'Đã thu hoạch', shortLabel: 'Hoàn tất', defaultProgress: 100 },
  CANCELLED: { label: 'Đã huỷ', shortLabel: 'Đã huỷ', defaultProgress: 0 },
}

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
