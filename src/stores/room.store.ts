import { create } from 'zustand'
import type {
  CloseTraySessionInput,
  HarvestStatus,
  Tier,
  TierId,
  TierTelemetry,
  Tray,
  TrayCode,
  TrayClosureRecord,
  TrayRental,
  TrayPosition,
  TrayStatus,
} from '../types/room.types'
import { DEFAULT_DAILY_OVERDUE_FEE } from '../features/rooms/utils/tray-rental.utils'

interface TraySeed {
  position: TrayPosition
  status?: TrayStatus
  customerId?: string
  batchId?: string
  rental?: TrayRental
}

interface RentalSeed
  extends Omit<
    TrayRental,
    | 'startDate'
    | 'expectedHarvestDate'
    | 'packageEndDate'
    | 'dailyOverdueFee'
    | 'customerContactStatus'
    | 'careLogs'
  > {
  startOffsetDays: number
  harvestOffsetDays: number
  packageEndOffsetDays: number
  dailyOverdueFee?: number
}



function getDateOffsetFromToday(offsetDays: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createMockRental(seed: RentalSeed): TrayRental {
  const {
    startOffsetDays,
    harvestOffsetDays,
    packageEndOffsetDays,
    dailyOverdueFee = DEFAULT_DAILY_OVERDUE_FEE,
    ...rental
  } = seed

  return {
    ...rental,
    startDate: getDateOffsetFromToday(startOffsetDays),
    expectedHarvestDate: getDateOffsetFromToday(harvestOffsetDays),
    packageEndDate: getDateOffsetFromToday(packageEndOffsetDays),
    dailyOverdueFee,
    customerContactStatus: 'NOT_CONTACTED',
    careLogs: [],
  }
}

function createTray(tierId: TierId, seed: TraySeed): Tray {
  const code = `T${tierId}-K${seed.position}` as TrayCode

  return {
    id: code,
    code,
    tierId,
    status: seed.status ?? 'empty',
    customerId: seed.customerId ?? null,
    batchId: seed.batchId ?? null,
    rental: seed.rental ?? null,
  }
}

function createTier(
  tierId: TierId,
  telemetry: Omit<TierTelemetry, 'updatedAt'>,
  traySeeds: TraySeed[],
): Tier {
  return {
    tierId,
    name: `Tầng ${tierId}`,
    nodeId: `node-stm32-0${tierId}`,
    trays: traySeeds.map((seed) => createTray(tierId, seed)),
    telemetry: {
      ...telemetry,
      updatedAt: '2026-09-12T09:30:00+07:00',
    },
  }
}

export const MOCK_TIERS: Tier[] = [
  createTier(
    1,
    { temperature: 25.2, humidity: 88 },
    [
      {
        position: 1,
        status: 'rented',
        customerId: 'TENANT-001',
        batchId: 'MCMS-2608-A01',
        rental: createMockRental({
          tenantName: 'Nguyễn Minh Anh',
          tenantPhone: '0901234567',
          tenantAddress: '18 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
          mushroomType: 'Nấm Bào Ngư Xám',
          mushroomVariety: 'Giống PN-01',
          weeks: 1,
          startOffsetDays: -3,
          harvestOffsetDays: 3,
          packageEndOffsetDays: 4,
          basePrice: 150_000,
          harvestStatus: 'GROWING',
        }),
      },
      {
        position: 2,
        status: 'rented',
        customerId: 'TENANT-005',
        batchId: 'FLOOR-1-HOANG-KIM',
        rental: createMockRental({
          tenantName: 'Phạm Thanh Tùng',
          tenantPhone: '0938123456',
          tenantAddress: '71 Cách Mạng Tháng 8, Quận 3, TP.HCM',
          mushroomType: 'Nấm Hoàng Kim',
          mushroomVariety: 'Giống HK-02',
          weeks: 1,
          startOffsetDays: -17,
          harvestOffsetDays: -11,
          packageEndOffsetDays: -10,
          basePrice: 175_000,
          harvestStatus: 'GROWING',
        }),
      },
      {
        position: 3,
        status: 'rented',
        customerId: 'TENANT-003',
        batchId: 'FLOOR-1-MOI-DEN',
        rental: createMockRental({
          tenantName: 'Lê Thu Hà',
          tenantPhone: '0987654321',
          tenantAddress: '27 Trần Phú, Hải Châu, Đà Nẵng',
          mushroomType: 'Nấm Mối Đen',
          mushroomVariety: 'Giống MD-03',
          weeks: 1,
          startOffsetDays: 0,
          harvestOffsetDays: 6,
          packageEndOffsetDays: 7,
          basePrice: 190_000,
          harvestStatus: 'GROWING',
        }),
      },
    ],
  ),
  createTier(
    2,
    { temperature: 26.4, humidity: 82 },
    [
      {
        position: 1,
        status: 'rented',
        customerId: 'TENANT-002',
        batchId: 'MCMS-2607-L02',
        rental: createMockRental({
          tenantName: 'Trần Quốc Bảo',
          tenantPhone: '0912345678',
          tenantAddress: '52 Lê Lợi, Ninh Kiều, Cần Thơ',
          mushroomType: 'Nấm Linh Chi',
          mushroomVariety: 'Giống LG-04',
          weeks: 1,
          startOffsetDays: -5,
          harvestOffsetDays: 1,
          packageEndOffsetDays: 2,
          basePrice: 175_000,
          harvestStatus: 'GROWING',
        }),
      },
      { position: 2 },
      { position: 3 },
    ],
  ),
  createTier(
    3,
    { temperature: 24.8, humidity: 90 },
    [
      {
        position: 1,
        status: 'harvesting',
        customerId: 'TENANT-004',
        batchId: 'MCMS-2606-B03',
        rental: createMockRental({
          tenantName: 'Võ Ngọc Thảo',
          tenantPhone: '0977123456',
          tenantAddress: '106 Phan Xích Long, Phú Nhuận, TP.HCM',
          mushroomType: 'Nấm Bào Ngư Trắng',
          mushroomVariety: 'Giống BT-05',
          weeks: 1,
          startOffsetDays: -6,
          harvestOffsetDays: 0,
          packageEndOffsetDays: 1,
          basePrice: 150_000,
          harvestStatus: 'READY_TO_HARVEST',
        }),
      },
      { position: 2 },
      { position: 3 },
    ],
  ),
  createTier(
    4,
    { temperature: 25.9, humidity: 85 },
    [
      { position: 1 },
      { position: 2 },
      { position: 3, status: 'maintenance' },
    ],
  ),
]

interface RoomState {
  tiers: Tier[]
  closureRecords: TrayClosureRecord[]
  updateTrayHarvestStatus: (
    trayId: string,
    harvestStatus: HarvestStatus,
  ) => void
  confirmTrayCustomerContact: (trayId: string) => void
  addTrayCareLog: (trayId: string, note: string) => void
  closeTraySession: (input: CloseTraySessionInput) => TrayClosureRecord
}

export function getAllTrays(tiers: Tier[]) {
  return tiers.flatMap((tier) => tier.trays)
}

export function findTray(tiers: Tier[], trayId: string) {
  return getAllTrays(tiers).find((tray) => tray.id === trayId)
}

export const useRoomStore = create<RoomState>((set, get) => ({
  tiers: MOCK_TIERS,
  closureRecords: [],

  updateTrayHarvestStatus: (trayId, harvestStatus) =>
    set((state) => ({
      tiers: state.tiers.map((tier) => ({
        ...tier,
        trays: tier.trays.map((tray) =>
          tray.id === trayId && tray.rental
            ? {
                ...tray,
                status:
                  harvestStatus === 'GROWING' ? 'rented' : 'harvesting',
                rental: { ...tray.rental, harvestStatus },
              }
            : tray,
        ),
      })),
    })),

  confirmTrayCustomerContact: (trayId) =>
    set((state) => ({
      tiers: state.tiers.map((tier) => ({
        ...tier,
        trays: tier.trays.map((tray) =>
          tray.id === trayId && tray.rental
            ? {
                ...tray,
                rental: {
                  ...tray.rental,
                  customerContactStatus: 'DELIVERY_CONFIRMED',
                },
              }
            : tray,
        ),
      })),
    })),

  addTrayCareLog: (trayId, note) =>
    set((state) => ({
      tiers: state.tiers.map((tier) => ({
        ...tier,
        trays: tier.trays.map((tray) =>
          tray.id === trayId && tray.rental
            ? {
                ...tray,
                rental: {
                  ...tray.rental,
                  careLogs: [
                    {
                      id: `CARE-${tray.id}-${Date.now()}`,
                      note,
                      createdAt: new Date().toISOString(),
                    },
                    ...tray.rental.careLogs,
                  ],
                },
              }
            : tray,
        ),
      })),
    })),

  closeTraySession: (input) => {
    const tray = findTray(get().tiers, input.trayId)

    if (!tray?.rental || !tray.batchId) {
      throw new Error('Khay không có mẻ trồng đang hoạt động để kết thúc.')
    }

    const record: TrayClosureRecord = {
      id: `CLOSE-${tray.batchId}-${Date.now()}`,
      trayId: tray.id,
      batchId: tray.batchId,
      tenantId: tray.customerId,
      tenantName: tray.rental.tenantName,
      outcome: input.outcome,
      reason: input.reason,
      actualHarvestWeightKg: input.actualHarvestWeightKg ?? null,
      basePrice: tray.rental.basePrice,
      overdueFee: input.overdueFee ?? 0,
      totalAmount: input.totalAmount ?? 0,
      closedAt: new Date().toISOString(),
    }

    set((state) => ({
      closureRecords: [record, ...state.closureRecords],
      tiers: state.tiers.map((tier) => ({
        ...tier,
        trays: tier.trays.map((item) =>
          item.id === input.trayId
            ? {
                ...item,
                status: 'empty',
                customerId: null,
                batchId: null,
                rental: null,
              }
            : item,
        ),
      })),
    }))

    return record
  },
}))
