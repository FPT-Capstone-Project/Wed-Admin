export const TIER_IDS = [1, 2, 3, 4] as const
export type TierId = (typeof TIER_IDS)[number]

export const TRAY_POSITIONS = [1, 2, 3] as const
export type TrayPosition = (typeof TRAY_POSITIONS)[number]

export type TrayCode = `T${TierId}-K${TrayPosition}`
export type NodeId = `node-stm32-0${TierId}`
export type TrayStatus =
  | 'empty'
  | 'rented'
  | 'harvesting'
  | 'maintenance'

export type HarvestStatus =
  | 'GROWING'
  | 'READY_TO_HARVEST'
  | 'OVERDUE'
  | 'AUTO_HARVESTED'

export type CustomerContactStatus =
  | 'NOT_CONTACTED'
  | 'DELIVERY_CONFIRMED'

export interface TrayCareLog {
  id: string
  note: string
  createdAt: string
}

export type TrayClosureOutcome =
  | 'EARLY_HARVEST'
  | 'ON_TIME_HARVEST'
  | 'OVERDUE_HARVEST'
  | 'FORCED_CANCEL'
  | 'OVERDUE_DESTROY'

export interface TrayClosureRecord {
  id: string
  trayId: string
  batchId: string
  tenantId: string | null
  tenantName: string
  outcome: TrayClosureOutcome
  reason: string
  actualHarvestWeightKg: number | null
  basePrice: number
  overdueFee: number
  totalAmount: number
  closedAt: string
}

export interface CloseTraySessionInput {
  trayId: string
  outcome: TrayClosureOutcome
  reason: string
  actualHarvestWeightKg?: number
  overdueFee?: number
  totalAmount?: number
}

export interface TrayRental {
  tenantName: string
  tenantPhone: string
  tenantAddress: string
  mushroomType: string
  mushroomVariety: string
  /** Số tuần gói của lượt thuê này */
  weeks: number
  startDate: string | Date
  expectedHarvestDate: string | Date
  packageEndDate: string | Date
  basePrice: number
  dailyOverdueFee: number
  harvestStatus: HarvestStatus
  customerContactStatus: CustomerContactStatus
  careLogs: TrayCareLog[]
}

export interface Tray {
  id: string
  code: TrayCode
  tierId: TierId
  status: TrayStatus
  customerId: string | null
  batchId: string | null
  rental: TrayRental | null
}

export interface TierTelemetry {
  temperature: number
  humidity: number
  /** null khi BE chưa expose CO₂ sensor. */
  co2: number | null
  updatedAt: string
}

export interface Tier {
  tierId: TierId
  name: string
  /** Mã phòng từ BE (vd: "ROOM-A"). Dùng để hiển thị tên chuẩn hoá. */
  roomCode?: string | null
  nodeId: NodeId
  trays: Tray[]
  telemetry: TierTelemetry
}

export function getTrayPosition(code: TrayCode): TrayPosition {
  return Number(code.at(-1)) as TrayPosition
}
