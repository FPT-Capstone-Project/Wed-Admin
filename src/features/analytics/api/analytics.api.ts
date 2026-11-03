import { cultivationRoomApi } from '../../rooms/api/cultivation-room.api'
import { cultivationTrayApi } from '../../rooms/api/cultivation-tray.api'
import { autoMistingApi, iotApi } from '../../devices/api/iot.api'
import { sessionApi } from '../../sessions/api/session.api'
import { rentalPackageApi } from '../../packages/api/rental-package.api'
import { notificationApi } from '../../notifications/api/notification.api'
import { farmApi } from '../../farm/api/farm.api'
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
 * Gộp số liệu thống kê thật từ:
 *   - `GET /api/cultivation-rooms` — tổng số phòng.
 *   - `GET /api/iot/floors` — tổng số tầng.
 *   - `GET /api/cultivation-trays` — tỷ lệ lấp đầy khay.
 *   - `GET /api/cultivation-sessions/admin` — phiên theo giai đoạn, giống nấm.
 *   - `GET /api/rental-packages` — giá gói thuê (để ước tính doanh thu).
 *   - `GET /api/iot/masters` — sức khoẻ thiết bị Master.
 *   - `GET /api/iot/floors/{id}/environment` — trạng thái cảm biến tầng.
 *   - `GET /api/notifications` — số cảnh báo chưa đọc.
 */

/** Số phiên lấy từ `/api/cultivation-sessions/admin` cho thống kê. */
const SESSION_PAGE_SIZE = 100

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
  /** Tầng đang báo lỗi cảm biến. */
  unhealthyFloors: number
  /** Tầng có dữ liệu cảm biến hợp lệ. */
  healthyFloors: number
  /** Tổng số tầng đã đọc được môi trường. */
  floorsWithData: number
  /** Nhiệt độ trung bình toàn trang trại (null khi không có dữ liệu). */
  averageTemperature: number | null
  /** Độ ẩm trung bình toàn trang trại (null khi không có dữ liệu). */
  averageHumidity: number | null
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

/** Tổng hợp số liệu toàn trang trại. */
export interface FarmAnalytics {
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
  /** Doanh thu ước tính toàn bộ. */
  estimatedRevenue: number
  /** Doanh thu ước tính theo tháng (dựa trên `start_date` của phiên). */
  monthlyRevenue: MonthlyRevenue[]
  /** Số thông báo chưa đọc. */
  unreadNotifications: number
  /** Tổng số cảnh báo vận hành (chưa đọc). */
  activeAlerts: number
  /** Môi trường từng tầng — dùng để vẽ biểu đồ. */
  floorEnvironments: FloorEnvironmentSnapshot[]
  /** Chỉ số chất lượng phôi — từ lịch sử kiểm tra phôi. */
  spawnQuality: SpawnQualityMetrics
}

/**
 * Chỉ số chất lượng phôi — từ `GET /api/farm/sessions/{id}/spawn-inspections`.
 *
 * ⚠ Đây là đơn vị **phôi** (không phải kg) vì BE không trả sản lượng cân nặng.
 */
export interface SpawnQualityMetrics {
  /** Tổng số phôi đã kiểm tra. */
  totalChecked: number
  /** Số phôi bình thường. */
  normalQuantity: number
  /** Số phôi cảnh báo. */
  warningQuantity: number
  /** Số phôi bất thường. */
  abnormalQuantity: number
  /** Tỷ lệ phôi đạt chuẩn (0–100). */
  successRate: number
  /** Tỷ lệ phôi bất thường / hỏng (0–100). */
  spoilageRate: number
}

/** Môi trường 1 tầng (đã gộp với tên tầng). */
export interface FloorEnvironmentSnapshot {
  floorId: number
  floorName: string
  temperature: number | null
  humidity: number | null
  healthy: boolean | null
}

/**
 * Tải & tổng hợp toàn bộ số liệu thống kê thật.
 */
export async function fetchFarmAnalytics(): Promise<FarmAnalytics> {
  const [rooms, trays, floors, masters, sessionResult, packages, notificationResult] =
    await Promise.all([
      cultivationRoomApi.list({}).catch(() => [] as CultivationRoom[]),
      cultivationTrayApi.list({}).catch(() => [] as CultivationTray[]),
      autoMistingApi.listFloors().catch(() => [] as CultivationFloorMapping[]),
      iotApi.listMasters().catch(() => [] as IotMaster[]),
      sessionApi
        .list({ page: 1, pageSize: SESSION_PAGE_SIZE })
        .catch(() => ({ items: [] as CultivationSession[], pagination: null })),
      rentalPackageApi.list({}).catch(() => [] as RentalPackage[]),
      notificationApi.list({ page: 1, pageSize: 1 }).catch(() => null),
    ])

  // Môi trường từng tầng — đọc song song, lỗi tầng nào bỏ qua tầng đó.
  const floorIds = floors
    .map((floor) => floor.floor_id)
    .filter((id): id is number => typeof id === 'number' && id > 0)

  const environments = await Promise.all(
    floorIds.map(async (floorId) => {
      try {
        return await autoMistingApi.getEnvironment(floorId)
      } catch {
        return null
      }
    }),
  )

  // Lịch sử kiểm tra phôi của từng phiên — chất lượng mẻ nấm.
  const inspections = await Promise.all(
    sessionResult.items.map(async (session) => {
      try {
        return await farmApi.getSpawnInspections(session.session_id)
      } catch {
        return null
      }
    }),
  )

  const spawnTotals = inspections.reduce(
    (acc, history) => {
      for (const inspection of history?.inspections ?? []) {
        acc.totalChecked += inspection.total_checked ?? 0
        acc.normal += inspection.normal_quantity ?? 0
        acc.warning += inspection.warning_quantity ?? 0
        acc.abnormal += inspection.abnormal_quantity ?? 0
      }
      return acc
    },
    { totalChecked: 0, normal: 0, warning: 0, abnormal: 0 },
  )

  return buildFarmAnalytics({
    rooms,
    trays,
    floors,
    masters,
    sessions: sessionResult.items,
    packages,
    environments: environments.map((env, index) => ({
      floorId: floorIds[index],
      floorName: resolveFloorName(floors, floorIds[index]),
      avgTemperature: env?.avgTemperature ?? null,
      avgHumidity: env?.avgHumidity ?? null,
      healthy: env?.healthy ?? null,
      sensors: env?.sensors ?? [],
    })),
    unreadNotifications: notificationResult?.unreadCount ?? 0,
    activeAlerts: notificationResult?.items.filter((item) => !item.is_read).length ?? 0,
    spawnTotalChecked: spawnTotals.totalChecked,
    spawnNormalQuantity: spawnTotals.normal,
    spawnWarningQuantity: spawnTotals.warning,
    spawnAbnormalQuantity: spawnTotals.abnormal,
  })
}

// ─── Builder (tách riêng để test được) ─────────────────────────────────

export interface BuildAnalyticsInput {
  rooms: CultivationRoom[]
  trays: CultivationTray[]
  floors: CultivationFloorMapping[]
  masters: IotMaster[]
  sessions: CultivationSession[]
  packages: RentalPackage[]
  environments: Array<{
    floorId: number
    floorName: string
    avgTemperature: number | null
    avgHumidity: number | null
    healthy: boolean | null
    sensors: Array<{ valid: boolean }>
  }>
  unreadNotifications: number
  activeAlerts: number
  /** Tổng số phôi đã kiểm tra (từ lịch sử kiểm tra phôi). */
  spawnTotalChecked: number
  spawnNormalQuantity: number
  spawnWarningQuantity: number
  spawnAbnormalQuantity: number
}

const ALL_SESSION_STATUSES: CultivationSessionStatus[] = [
  'PENDING',
  'SPAWN_RESTING',
  'MYCELIAL_DEVELOPMENT',
  'READY_FOR_CULTIVATION',
  'CULTIVATING',
  'HARVESTING',
  'COMPLETED',
  'CANCELLED',
]

export function buildFarmAnalytics(input: BuildAnalyticsInput): FarmAnalytics {
  // ── Khay ──────────────────────────────────────────────────────────────
  const available = input.trays.filter((tray) => tray.status === 'AVAILABLE').length
  const occupied = input.trays.filter((tray) => tray.status === 'OCCUPIED').length
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

  const temperatures = input.environments
    .map((env) => env.avgTemperature)
    .filter((value): value is number => typeof value === 'number')
  const humidities = input.environments
    .map((env) => env.avgHumidity)
    .filter((value): value is number => typeof value === 'number')

  const healthyFloors = input.environments.filter(
    (env) => env.healthy === true,
  ).length
  const unhealthyFloors = input.environments.filter(
    (env) => env.healthy === false,
  ).length

  const devices: DeviceHealth = {
    total: input.masters.length,
    online,
    offline,
    onlineRate:
      input.masters.length > 0
        ? Math.round((online / input.masters.length) * 1000) / 10
        : 0,
    healthyFloors,
    unhealthyFloors,
    floorsWithData: input.environments.length,
    averageTemperature:
      temperatures.length > 0
        ? Math.round(
            (temperatures.reduce((sum, v) => sum + v, 0) / temperatures.length) *
              10,
          ) / 10
        : null,
    averageHumidity:
      humidities.length > 0
        ? Math.round(
            (humidities.reduce((sum, v) => sum + v, 0) / humidities.length) * 10,
          ) / 10
        : null,
  }

  // ── Phiên canh tác ────────────────────────────────────────────────────
  const sessionsByStage = Object.fromEntries(
    ALL_SESSION_STATUSES.map((status) => [
      status,
      input.sessions.filter((session) => session.status === status).length,
    ]),
  ) as Record<CultivationSessionStatus, number>

  // ── Doanh thu ước tính ────────────────────────────────────────────────
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
    const revenue = price

    const species = session.mushroom_name ?? 'Chưa xác định'
    const speciesEntry = speciesMap.get(species) ?? { count: 0, revenue: 0 }
    speciesEntry.count += 1
    speciesEntry.revenue += revenue
    speciesMap.set(species, speciesEntry)

    const monthKey = resolveMonthKey(session.start_date ?? session.created_at)
    if (monthKey) {
      const monthEntry = monthlyMap.get(monthKey) ?? { count: 0, revenue: 0 }
      monthEntry.count += 1
      monthEntry.revenue += revenue
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

  const estimatedRevenue = speciesBreakdown.reduce(
    (sum, entry) => sum + entry.estimatedRevenue,
    0,
  )

  // ── Chất lượng phôi ───────────────────────────────────────────────────
  const totalChecked = input.spawnTotalChecked
  const normalQuantity = input.spawnNormalQuantity
  const warningQuantity = input.spawnWarningQuantity
  const abnormalQuantity = input.spawnAbnormalQuantity

  const spawnQuality: SpawnQualityMetrics = {
    totalChecked,
    normalQuantity,
    warningQuantity,
    abnormalQuantity,
    successRate:
      totalChecked > 0
        ? Math.round((normalQuantity / totalChecked) * 1000) / 10
        : 0,
    spoilageRate:
      totalChecked > 0
        ? Math.round((abnormalQuantity / totalChecked) * 1000) / 10
        : 0,
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
    estimatedRevenue,
    monthlyRevenue,
    unreadNotifications: input.unreadNotifications,
    activeAlerts: input.activeAlerts,
    floorEnvironments: input.environments.map((env) => ({
      floorId: env.floorId,
      floorName: env.floorName,
      temperature: env.avgTemperature,
      humidity: env.avgHumidity,
      healthy: env.healthy,
    })),
    spawnQuality,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

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

/** Tên hiển thị của tầng — ưu tiên `floor_name` của BE. */
function resolveFloorName(
  floors: CultivationFloorMapping[],
  floorId: number,
): string {
  const floor = floors.find((item) => item.floor_id === floorId)
  if (!floor) return `Tầng ${floorId}`
  return floor.floor_name || `Tầng ${floor.floor_number ?? floorId}`
}
