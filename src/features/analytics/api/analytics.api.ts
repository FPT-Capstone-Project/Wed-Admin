import { cultivationRoomApi } from '../../rooms/api/cultivation-room.api'
import { cultivationTrayApi } from '../../rooms/api/cultivation-tray.api'
import { autoMistingApi, iotApi } from '../../devices/api/iot.api'
import { fetchAllAdminCultivationSessionsDetailed } from '../../sessions/api/admin-session.api'
import { toCultivationSession } from '../../sessions/api/admin-session-mapper'
import { buildSpeciesPerformance } from '../utils/species-performance.utils'
import { buildPaidOrderRevenue } from '../utils/paid-order-revenue.utils'
import { harvestApi } from '../../harvest/api/harvest.api'
import { fetchDashboardMetrics } from '../../dashboard/api/dashboard.api'
import { fetchAllAdminOrders } from '../../orders/api/order.api'
import type { CultivationRoom, CultivationTray } from '../../../types/cultivation'
import type { CultivationFloorMapping, IotMaster } from '../../../types/iot'
import type { AdminOrderDto } from '../../orders/types/admin-order.types'
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
  successRate?: number | null
  /** Tổng tiền đơn đã thanh toán của nhóm giống nấm này. */
  revenue: number
}

/** Doanh thu thực thu theo tháng. */
export interface MonthlyRevenue {
  /** Key `YYYY-MM`. */
  month: string
  /** Nhãn tiếng Việt `T01/2026`. */
  label: string
  sessionCount: number
  revenue: number
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
  revenueIncomplete: boolean
  revenueEvents: { date: string; amount: number }[]
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
  /** Doanh thu thực thu theo tháng, dựa trên created_at của đơn PAID. */
  monthlyRevenue: MonthlyRevenue[]
  /**
   * Doanh thu **thật** — tổng `orders.total_amount` của các đơn `PAID`.
   *
   * Cùng nguồn với monthlyRevenue, revenueEvents và speciesBreakdown.
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
  'RECEIVED',
  'INCUBATING',
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
    roomsResult,
    traysResult,
    floorsResult,
    mastersResult,
    harvestsResult,
    metricsResult,
    ordersResult,
  ] = await Promise.allSettled([
    fetchAllAdminCultivationSessionsDetailed({ pageSize: 100, maxPages: 20 }),
    cultivationRoomApi.list({}),
    cultivationTrayApi.list({}),
    autoMistingApi.listFloors(),
    iotApi.listMasters(),
    harvestApi.list({}),
    fetchDashboardMetrics(),
    fetchAllAdminOrders({ pageSize: 100, maxPages: 20, requireComplete: true }),
  ])

  const failed = [sessionsResult, roomsResult, traysResult,
    floorsResult, mastersResult, harvestsResult, metricsResult, ordersResult]
    .find(result => result.status === 'rejected')
  if (failed?.status === 'rejected') throw failed.reason
  if (sessionsResult.status === 'fulfilled' && !sessionsResult.value.complete) {
    throw new Error('Số phiên vượt giới hạn tổng hợp; chưa thể tính đầy đủ hiệu suất theo giống.')
  }

  const sessions =
    sessionsResult.status === 'fulfilled' ? sessionsResult.value.items.map(toCultivationSession) : []
  const orders: AdminOrderDto[] =
    ordersResult.status === 'fulfilled' ? ordersResult.value : []
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

  const result = buildReportsAnalytics({
    rooms,
    trays,
    floors,
    masters,
    sessions,
    harvests: harvests.map((harvest) => ({
      status: harvest.status,
      totalWeightKg: toNumber(harvest.total_weight_kg),
      usableWeightKg: toNumber(harvest.usable_weight_kg),
      rejectedWeightKg: toNumber(harvest.rejected_weight_kg),
    })),
    usableRate: metrics?.harvest_quality.usable_rate ?? 0,
    wasteRate: metrics?.harvest_quality.waste_rate ?? 0,
    traysUsed: metrics?.trays_used ?? 0,
    orders,
  })
  return result
}

// ─── Builder (tách riêng để test được) ─────────────────────────────────

export interface BuildReportsInput {
  rooms: CultivationRoom[]
  trays: CultivationTray[]
  floors: CultivationFloorMapping[]
  masters: IotMaster[]
  sessions: CultivationSession[]
  /** Đợt thu hoạch — chỉ cân nhắc các đợt `COMPLETED`. */
  harvests: Array<{
    status: string
    totalWeightKg: number | null
    usableWeightKg: number | null
    rejectedWeightKg: number | null
  }>
  /** Tỷ lệ đạt (0–100) — từ `/api/analytics/dashboard`. */
  usableRate: number
  /** Tỷ lệ hao hụt (0–100) — từ `/api/analytics/dashboard`. */
  wasteRate: number
  /** Số lượt khay đã sử dụng — từ `/api/analytics/dashboard`. */
  traysUsed: number
  /** Đơn hàng từ GET /api/orders/admin, nguồn doanh thu duy nhất. */
  orders?: AdminOrderDto[]
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

  // Revenue is independent of session count and current package prices.
  const paidRevenue = buildPaidOrderRevenue(input.orders ?? [])
  const speciesBreakdown = buildSpeciesPerformance(paidRevenue.species, input.sessions)
  const monthlyMap = new Map<string, { count: number; revenue: number }>()
  for (const event of paidRevenue.events) {
    const month = resolveMonthKey(event.date) ?? 'UNKNOWN'
    const entry = monthlyMap.get(month) ?? { count: 0, revenue: 0 }
    entry.count += 1
    entry.revenue += event.amount
    monthlyMap.set(month, entry)
  }
  const monthlyRevenue = [...monthlyMap].map(([month, entry]) => ({
    month, label: month === 'UNKNOWN' ? month : formatMonthLabel(month),
    sessionCount: entry.count, revenue: entry.revenue,
  })).sort((a, b) => a.month.localeCompare(b.month))

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
    revenueIncomplete: false,
    totalRooms: input.rooms.length,
    activeRooms: input.rooms.filter((room) => room.status === 'ACTIVE').length,
    totalFloors: input.floors.length,
    trays,
    devices,
    totalSessions: input.sessions.length,
    sessionsByStage,
    speciesBreakdown,
    monthlyRevenue,
    revenueEvents: paidRevenue.events,
    totalRevenue: paidRevenue.total,
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
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1970) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit',
  }).formatToParts(date)
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}`
}

/** Nhãn `T01/2026`. */
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `T${month}/${year}`
}
