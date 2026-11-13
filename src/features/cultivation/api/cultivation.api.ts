import { farmApi } from '../../farm/api/farm.api'
import { sessionApi } from '../../sessions/api/session.api'
import { resolveSessionProgress } from '../../sessions/utils/session-progress.utils'
import type { CultivationSession, SessionTray } from '../../sessions/types/session.types'
import type { FarmSession, SpawnInspection } from '../../farm/types/farm.types'
import {
  GROWTH_STAGE_META,
  type CultivationBatch,
  type GrowthStage,
  type SpawnHealthStatus,
} from '../types/cultivation.types'

/**
 * Cultivation service — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *
 * Gộp 3 nguồn thật:
 *   1. `GET /api/farm/sessions` — tiến độ + giai đoạn + khách.
 *   2. `GET /api/farm/sessions` — phôi đã cấp / còn lại + tên nấm.
 *   3. `GET /api/farm/sessions/{id}/spawn-inspections` — lịch sử kiểm tra phôi
 *      kèm ảnh Cloudinary.
 */

/** Số phiên lấy từ `/api/farm/sessions` mỗi lần. */


export interface BuildBatchesInput {
  sessions: CultivationSession[]
  farmSessions: FarmSession[]
  /** Lịch sử kiểm tra phôi, key theo `session_id`. */
  inspectionsBySessionId: Map<number, SpawnInspection[]>
}

export interface BuiltBatches {
  batches: CultivationBatch[]
  /** Thống kê nhanh phục vụ KPI trên trang. */
  stats: {
    total: number
    byStage: Record<GrowthStage, number>
    totalPhotos: number
    totalInspections: number
    abnormalCount: number
  }
}

/**
 * Dựng danh sách mẻ canh tác từ dữ liệu thật.
 */
export function buildCultivationBatches(
  input: BuildBatchesInput,
): BuiltBatches {
  const farmBySessionId = new Map<number, FarmSession>()
  for (const farmSession of input.farmSessions) {
    farmBySessionId.set(farmSession.session_id, farmSession)
  }

  const batches: CultivationBatch[] = input.sessions.map((session) => {
    const farmSession = farmBySessionId.get(session.session_id)
    const inspections = input.inspectionsBySessionId.get(session.session_id) ?? []

    const stage = (session.status ?? 'PENDING') as GrowthStage

    /**
     * Tiến độ — **chỉ lấy từ Phiên canh tác** (`progress_percent` do Farm OP
     * cập nhật qua API của phiên).
     *
     * ⚠ Trước đây chỗ này hardcode theo giai đoạn (`CULTIVATING` → 70 %),
     *   còn trang "Phiên canh tác" dùng giá trị khác ⇒ cùng 1 phiên hiển thị
     *   2 con số khác nhau. Nay cả hai cùng đọc **cùng một nguồn**: trường
     *   `progress_percent` của phiên.
     */
    const progressPercent = resolveSessionProgress(
      session.progress_percent,
      session.status,
    )

    const photos = inspections.flatMap((inspection) => inspection.images ?? [])

    return {
      id: session.session_id,
      batchCode: buildBatchCode(session),
      orderId: session.order_id ?? null,
      tenantName:
        session.customer_name ?? farmSession?.customer_name ?? 'Chưa xác định',
      packageName: session.package_name ?? farmSession?.package_name ?? '—',
      mushroomType:
        session.mushroom_name ?? farmSession?.mushroom_name ?? 'Chưa xác định',
      currentStage: stage,
      /*
       * ⚠ Giai đoạn WF-03 do Farm OP ghi nhận (`current_stage` / `growth_status`).
       *   Có thể `null` ⇒ phiên `CULTIVATING` mặc định hiển thị "Kéo tơ".
       */
      growthStage: session.current_stage ?? session.growth_status ?? null,
      progressPercent,
      startDate: session.start_date ?? farmSession?.start_date ?? null,
      estimatedHarvestDate: session.expected_harvest_date ?? null,
      endDate: session.end_date ?? farmSession?.end_date ?? null,
      trays: (session.trays ?? []).map(normalizeTray),
      spawnIssued: farmSession?.spawn_issued ?? null,
      spawnRemaining: farmSession?.spawn_remaining ?? null,
      trayCount: session.tray_count ?? farmSession?.tray_count ?? null,
      inspections,
      inspectionCount: inspections.length,
      healthStatus: resolveHealthStatus(inspections),
      photoCount: photos.length,
    }
  })

  const byStage = Object.fromEntries(
    (Object.keys(GROWTH_STAGE_META) as GrowthStage[]).map((stage) => [
      stage,
      batches.filter((batch) => batch.currentStage === stage).length,
    ]),
  ) as Record<GrowthStage, number>

  return {
    batches,
    stats: {
      total: batches.length,
      byStage,
      totalPhotos: batches.reduce((sum, batch) => sum + batch.photoCount, 0),
      totalInspections: batches.reduce(
        (sum, batch) => sum + batch.inspectionCount,
        0,
      ),
      abnormalCount: batches.filter(
        (batch) => batch.healthStatus === 'ABNORMAL',
      ).length,
    },
  }
}

/**
 * Tải toàn bộ dữ liệu canh tác thật.
 *
 * ⚠ Chỉ gọi các endpoint GET.
 */
export async function fetchCultivationBatches(): Promise<BuiltBatches> {
  const sessionResult = await sessionApi.list()
  const farmSessions: FarmSession[] = sessionResult.items

  // Chỉ lấy lịch sử kiểm tra phôi của các phiên đang có trong danh sách.
  const inspectionsBySessionId = new Map<number, SpawnInspection[]>()
  await Promise.all(
    sessionResult.items.map(async (session) => {
      const history = await farmApi.getSpawnInspections(session.session_id)
      if (history) inspectionsBySessionId.set(session.session_id, history.inspections ?? [])
    }),
  )

  return buildCultivationBatches({
    sessions: sessionResult.items,
    farmSessions,
    inspectionsBySessionId,
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function buildBatchCode(session: CultivationSession): string {
  if (session.order_id) {
    return `MCMS-D${session.order_id}-S${session.session_id}`
  }
  return `SES-${session.session_id}`
}

function normalizeTray(tray: SessionTray) {
  return {
    trayId: tray.tray_id ?? null,
    code: tray.tray_code ?? `Khay ${tray.tray_id ?? '?'}`,
    name: tray.tray_name ?? tray.floor_name ?? tray.room_name ?? '—',
  }
}

/**
 * Sức khỏe phôi = kết luận của lần kiểm tra **gần nhất**.
 *
 * ⚠ Lịch sử kiểm tra được BE trả theo thứ tự mới nhất trước (đã xác nhận ở
 *   `features/farm/api/farm.api.ts`), nhưng để chắc chắn ta tự sắp xếp theo
 *   `checked_at` / `created_at`.
 */
function resolveHealthStatus(
  inspections: SpawnInspection[],
): SpawnHealthStatus {
  if (inspections.length === 0) return 'UNKNOWN'

  const sorted = [...inspections].sort((left, right) => {
    const leftTime = new Date(
      left.checked_at ?? left.created_at ?? 0,
    ).getTime()
    const rightTime = new Date(
      right.checked_at ?? right.created_at ?? 0,
    ).getTime()
    return rightTime - leftTime
  })

  const condition = sorted[0]?.condition
  if (condition === 'NORMAL' || condition === 'WARNING' || condition === 'ABNORMAL') {
    return condition
  }

  // BE không trả `condition` → suy ra từ số lượng bất thường.
  const abnormal = sorted[0]?.abnormal_quantity ?? 0
  const warning = sorted[0]?.warning_quantity ?? 0
  if (abnormal > 0) return 'ABNORMAL'
  if (warning > 0) return 'WARNING'
  return 'NORMAL'
}
