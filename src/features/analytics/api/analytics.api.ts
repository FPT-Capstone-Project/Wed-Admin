import { cultivationRoomApi } from '../../rooms/api/cultivation-room.api'
import { cultivationTrayApi } from '../../rooms/api/cultivation-tray.api'
import { autoMistingApi, iotApi } from '../../devices/api/iot.api'
import { sessionApi } from '../../sessions/api/session.api'
import { rentalPackageApi } from '../../packages/api/rental-package.api'
import { harvestApi } from '../../harvest/api/harvest.api'
import { fetchDashboardMetrics } from '../../dashboard/api/dashboard.api'
import type { CultivationRoom, CultivationTray } from '../../../types/cultivation'
import type { CultivationFloorMapping, IotMaster } from '../../../types/iot'
import type { RentalPackage } from '../../../types/rental-package'
import type {
  CultivationSession,
  CultivationSessionStatus,
} from '../../sessions/types/session.types'

/**
 * Analytics service — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *
 * ## Vì sao không còn `fetchFarmAnalytics`?
 *
 * Hàm cũ gộp số liệu thống kê bằng **một** `Promise.all` 8 endpoint rồi
 * gọi tiếp `/api/iot/floors/{id}/environment` cho **từng tầng** và
 * `/api/farm/sessions/{id}/spawn-inspections` cho **từng phiên**.
 *
 * Hệ quả:
 *   - **N+1 requests**: số request = 8 + (số tầng) + (số phiên).
 *   - **Cascade failure**: một tầng/phiên lỗi ⇒ `Promise.all` reject ⇒ **toàn
 *     bộ** trang Báo cáo mất dữ liệu, kể cả các phần đã tải thành công.
 *
 * → Nay:
 *   - Số liệu KPI tổng quan lấy từ **một** endpoint `GET /api/analytics/dashboard`
 *     (xem `features/dashboard/api/dashboard.api.ts`).
 *   - Phần còn lại gộp bằng các endpoint **danh sách** (bulk), chạy song song
 *     với `Promise.allSettled` ⇒ một nguồn lỗi **không** làm hỏng cả trang.
 *   - Không còn vòng lặp gọi endpoint theo từng tầng/phiên.
 */

/** Tỷ lệ lấp đầy khay. */
export interface TrayOccupancy {
  total: number
  available: number
  occupied: number
  maintenance: number
  /** 0–100 */
  occupancyRate: number
}

/** Thống kê sức khoẻ thiết bị IoT. */
export interface DeviceHealth {
  total: number
  online: number
  offline: number
  /** Tỷ lệ Master online (0–100). */
  onlineRate: number
}

/** Cơ cấu giống nấm theo số phiên. */
export interface SpeciesBreakdown {
  species: string
  sessionCount: number
  /** Doanh thu ước tính của nhóm giống nấm này. */
  estimatedRevenue: number
}

/** Doanh thu ước tính theo tháng. */
export interface MonthlyRevenue {
  /** Key `YYYY-MM`. */
  month: string
  /** Nhãn tiếng Việt `T01/2026`. */
  label: string
  sessionCount: number
  estimatedRevenue: number
}

/**
 * Tổng hợp số liệu cho trang Báo cáo & Phân tích.
 *
 * ⚠ Không còn `floorEnvironments` / `spawnQuality` — hai nhóm này đòi hỏi
 *   gọi endpoint **theo từng tầng / từng phiên** (N+1). Nay chất lượng thu
 *   hoạch lấy từ endpoint tổng quan của BE, còn biểu đồ môi trường nằm ở
 *   trang Tổng quan (`features/dashboard`).
 */
export interface ReportsAnalytics {
  totalRooms: number
  activeRooms: number
  totalFloors: number
  trays: TrayOccupancy
  devices: DeviceHealth
  /** Tổng số phiên canh tác đã tải. */
  totalSessions: number
  /** Số phiên theo từng giai đoạn. */
  sessionsByStage: Record<CultivationSessionStatus, number>
  /** Cơ cấu giống nấm được thuê nhiều nhất. */
  speciesBreakdown: SpeciesBreakdown[]
  /** Doanh thu ước tính theo tháng (dựa trên `start_date` của phiên). */
  monthlyRevenue: MonthlyRevenue[]
  /**
   * Doanh thu **thật** — tổng `orders.total_amount` của các đơn `PAID`.
   *
   * ⚠ Khác với `monthlyRevenue` (ước tính theo giá gói × số phiên), con số
   *   này là số liệu doanh thu chính thức từ BE.
   */
  totalRevenue: number
  /** Tổng khối lượng thu hoạch (kg) — từ `/api/harvests/admin`. */
  totalHarvestWeightKg: number
  /** Khối lượng thu hoạch đạt chuẩn (kg) — từ `/api/harvests/admin`. */
  usableHarvestWeightKg: number
  /** Khối lượng thu hoạch bị loại (kg) — từ `/api/harvests/admin`. */
  rejectedHarvestWeightKg: number
  /** Tỷ lệ thu hoạch đạt chuẩn (0–100) — từ `/api/analytics/dashboard`. */
  usableRate: number
  /** Tỷ lệ thu hoạch hao hụt (0–100) — từ `/api/analytics/dashboard`. */
  wasteRate: number
  /** Số lượt khay đã sử dụng — từ `/api/analytics/dashboard`. */
  traysUsed: number
}

/** Danh sách 8 trạng thái phiên — thứ tự vòng đời thật. */
const ALL_SESSION_STATUSES: CultivationSessionStatus[] = [
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
 * Tải & tổng hợp số liệu cho trang Báo cáo.
 *
 * ⚠ **Không** có vòng lặp gọi endpoint theo từng tầng/phiên.
 * ⚠ Dùng `Promise.allSettled` ⇒ một nguồn lỗi chỉ làm mất thông tin của
 *   chính nguồn đó, không làm hỏng cả trang (không còn cascade failure).
 */
export async function fetchReportsAnalytics(): Promise<ReportsAnalytics> {
  const [
    sessionsResult,
    packagesResult,
    roomsResult,
    traysResult,
    floorsResult,
    mastersResult,
    harvestsResult,
    metricsResult,
  ] = await Promise.allSettled([
    sessionApi.list(),
    rentalPackageApi.list({}),
    cultivationRoomApi.list({}),
    cultivationTrayApi.list({}),
    autoMistingApi.listFloors(),
    iotApi.listMasters(),
    harvestApi.list({}),
    fetchDashboardMetrics(),
  ])

  const sessions =
    sessionsResult.status === 'fulfilled' ? sessionsResult.value.items : []
  const packages =
    packagesResult.status === 'fulfilled' ? packagesResult.value : []
  const rooms: CultivationRoom[] =
    roomsResult.status === 'fulfilled' ? roomsResult.value : []
  const trays: CultivationTray[] =
    traysResult.status === 'fulfilled' ? traysResult.value : []
  const floors: CultivationFloorMapping[] =
    floorsResult.status === 'fulfilled' ? floorsResult.value : []
  const masters: IotMaster[] =
    mastersResult.status === 'fulfilled' ? mastersResult.value : []
  const harvests =
    harvestsResult.status === 'fulfilled' ? (harvestsResult.value.data ?? []) : []
  const metrics =
    metricsResult.status === 'fulfilled' ? metricsResult.value : null

  return buildReportsAnalytics({
    rooms,
    trays,
    floors,
    masters,
    sessions,
    packages,
    harvests: harvests.map((harvest) => ({
      status: harvest.status,
      totalWeightKg: toNumber(harvest.total_weight_kg),
      usableWeightKg: toNumber(harvest.usable_weight_kg),
      rejectedWeightKg: toNumber(harvest.rejected_weight_kg),
    })),
    totalRevenue: metrics?.revenue.value ?? 0,
    usableRate: metrics?.harvest_quality.usable_rate ?? 0,
    wasteRate: metrics?.harvest_quality.waste_rate ?? 0,
    traysUsed: metrics?.trays_used ?? 0,
  })
}

// ─── Builder (tách riêng để test được) ─────────────────────────────────

export interface BuildReportsInput {
  rooms: CultivationRoom[]
  trays: CultivationTray[]
  floors: CultivationFloorMapping[]
  masters: IotMaster[]
  sessions: CultivationSession[]
  packages: RentalPackage[]
  /** Đợt thu hoạch — chỉ cân nhắc các đợt `COMPLETED`. */
  harvests: Array<{
    status: string
    totalWeightKg: number | null
    usableWeightKg: number | null
    rejectedWeightKg: number | null
  }>
  /** Doanh thu thật — từ `/api/analytics/dashboard`. */
  totalRevenue: number
  /** Tỷ lệ đạt (0–100) — từ `/api/analytics/dashboard`. */
  usableRate: number
  /** Tỷ lệ hao hụt (0–100) — từ `/api/analytics/dashboard`. */
  wasteRate: number
  /** Số lượt khay đã sử dụng — từ `/api/analytics/dashboard`. */
  traysUsed: number
}

export function buildReportsAnalytics(
  input: BuildReportsInput,
): ReportsAnalytics {
  // ── Khay ──────────────────────────────────────────────────────────────
  const available = input.trays.filter(
    (tray) => tray.status === 'AVAILABLE',
  ).length
  const occupied = input.trays.filter(
    (tray) => tray.status === 'OCCUPIED',
  ).length
  const maintenance = input.trays.filter(
    (tray) => tray.status === 'MAINTENANCE',
  ).length
  const totalTrays = input.trays.length

  const trays: TrayOccupancy = {
    total: totalTrays,
    available,
    occupied,
    maintenance,
    occupancyRate:
      totalTrays > 0 ? Math.round((occupied / totalTrays) * 1000) / 10 : 0,
  }

  // ── Thiết bị IoT ──────────────────────────────────────────────────────
  const online = input.masters.filter(
    (master) => master.reportedStatus === 'online',
  ).length
  const offline = input.masters.filter(
    (master) => master.reportedStatus === 'offline',
  ).length

  const devices: DeviceHealth = {
    total: input.masters.length,
    online,
    offline,
    onlineRate:
      input.masters.length > 0
        ? Math.round((online / input.masters.length) * 1000) / 10
        : 0,
  }

  // ── Phiên canh tác ────────────────────────────────────────────────────
  const sessionsByStage = Object.fromEntries(
    ALL_SESSION_STATUSES.map((status) => [
      status,
      input.sessions.filter((session) => session.status === status).length,
    ]),
  ) as Record<CultivationSessionStatus, number>

  // ── Doanh thu ước tính theo tháng / theo giống nấm ─────────────────────
  // price = giá gói thuê (`rental-packages`) × số phiên dùng gói đó.
  const priceByPackageId = new Map<number, number>()
  for (const pkg of input.packages) {
    if (typeof pkg.price === 'number' && Number.isFinite(pkg.price)) {
      priceByPackageId.set(pkg.package_id, pkg.price)
    }
  }

  const speciesMap = new Map<string, { count: number; revenue: number }>()
  const monthlyMap = new Map<string, { count: number; revenue: number }>()

  for (const session of input.sessions) {
    const price = session.package_id
      ? (priceByPackageId.get(session.package_id) ?? 0)
      : 0

    const species = session.mushroom_name ?? 'Chưa xác định'
    const speciesEntry = speciesMap.get(species) ?? { count: 0, revenue: 0 }
    speciesEntry.count += 1
    speciesEntry.revenue += price
    speciesMap.set(species, speciesEntry)

    const monthKey = resolveMonthKey(session.start_date ?? session.created_at)
    if (monthKey) {
      const monthEntry = monthlyMap.get(monthKey) ?? { count: 0, revenue: 0 }
      monthEntry.count += 1
      monthEntry.revenue += price
      monthlyMap.set(monthKey, monthEntry)
    }
  }

  const speciesBreakdown: SpeciesBreakdown[] = [...speciesMap.entries()]
    .map(([species, entry]) => ({
      species,
      sessionCount: entry.count,
      estimatedRevenue: entry.revenue,
    }))
    .sort((left, right) => right.sessionCount - left.sessionCount)

  const monthlyRevenue: MonthlyRevenue[] = [...monthlyMap.entries()]
    .map(([month, entry]) => ({
      month,
      label: formatMonthLabel(month),
      sessionCount: entry.count,
      estimatedRevenue: entry.revenue,
    }))
    .sort((left, right) => left.month.localeCompare(right.month))

  // ── Khối lượng thu hoạch ──────────────────────────────────────────────
  let totalHarvestWeightKg = 0
  let usableHarvestWeightKg = 0
  let rejectedHarvestWeightKg = 0

  for (const harvest of input.harvests) {
    if (harvest.status !== 'COMPLETED') continue
    totalHarvestWeightKg += harvest.totalWeightKg ?? 0
    usableHarvestWeightKg += harvest.usableWeightKg ?? 0
    rejectedHarvestWeightKg += harvest.rejectedWeightKg ?? 0
  }

  return {
    totalRooms: input.rooms.length,
    activeRooms: input.rooms.filter((room) => room.status === 'ACTIVE').length,
    totalFloors: input.floors.length,
    trays,
    devices,
    totalSessions: input.sessions.length,
    sessionsByStage,
    speciesBreakdown,
    monthlyRevenue,
    totalRevenue: input.totalRevenue,
    totalHarvestWeightKg,
    usableHarvestWeightKg,
    rejectedHarvestWeightKg,
    usableRate: input.usableRate,
    wasteRate: input.wasteRate,
    traysUsed: input.traysUsed,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Đọc số hợp lệ từ giá trị có thể là số hoặc chuỗi — `null` khi không hợp lệ. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Key tháng `YYYY-MM` từ chuỗi ISO. */
function resolveMonthKey(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Nhãn `T01/2026`. */
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `T${month}/${year}`
}
