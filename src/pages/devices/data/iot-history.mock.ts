import type {
  GrowthStageName,
  LongTermTelemetryPoint,
  OrderStatusLog,
  RentalSession,
  RentalSessionStatus,
  StageTimelineItem,
  TelemetryPoint,
} from '../../../types/iot-history'
import { TIER_IDS, TRAY_POSITIONS } from '../../../types/room.types'

const SAMPLE_INTERVAL_HOURS = 4
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS

const STAGE_DEFINITIONS: ReadonlyArray<{
  stageName: GrowthStageName
  startDay: number
  endDay: number
  backgroundColor: string
}> = [
  {
    stageName: 'Ủ tơ / Nuôi sợi',
    startDay: 0,
    endDay: 2,
    backgroundColor: 'rgba(37, 99, 166, 0.08)',
  },
  {
    stageName: 'Kích nụ / Ra ghim',
    startDay: 2,
    endDay: 4,
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
  },
  {
    stageName: 'Phát triển thể quả',
    startDay: 4,
    endDay: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.09)',
  },
  {
    stageName: 'Sẵn sàng thu hoạch',
    startDay: 6,
    endDay: 7,
    backgroundColor: 'rgba(161, 98, 7, 0.1)',
  },
]

const SESSION_PERIODS: ReadonlyArray<{
  start: string
  end: string
  status?: RentalSessionStatus
}> = [
  { start: '2025-10-04', end: '2025-10-11' },
  { start: '2025-11-15', end: '2025-11-22' },
  { start: '2025-12-10', end: '2025-12-17' },
  { start: '2026-02-08', end: '2026-02-15' },
  { start: '2026-04-14', end: '2026-04-21' },
  { start: '2026-07-06', end: '2026-07-13' },
  { start: '2026-09-10', end: '2026-09-17', status: 'ACTIVE' },
]

const TENANTS = [
  { id: 'TENANT-001', name: 'Nguyễn Minh Anh' },
  { id: 'TENANT-002', name: 'Trần Quốc Bảo' },
  { id: 'TENANT-003', name: 'Lê Thu Hà' },
  { id: 'TENANT-004', name: 'Võ Ngọc Thảo' },
  { id: 'TENANT-005', name: 'Phạm Thanh Tùng' },
  { id: 'TENANT-006', name: 'Đỗ Hoàng Nam' },
  { id: 'TENANT-007', name: 'Bùi Khánh Linh' },
] as const

const MUSHROOM_TYPES = [
  'Nấm bào ngư xám',
  'Nấm bào ngư trắng',
  'Nấm hoàng kim',
  'Nấm sò hồng',
  'Nấm linh chi đỏ',
] as const

function toFarmIsoDate(date: string) {
  return `${date}T00:00:00+07:00`
}

function roundToOneDecimal(value: number) {
  return Number(value.toFixed(1))
}

function toIsoTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString()
}

function createStagesTimeline(
  batchId: string,
  startDate: string,
  endDate: string,
): StageTimelineItem[] {
  const startTimestamp = new Date(startDate).getTime()
  const endTimestamp = new Date(endDate).getTime()
  const duration = Math.max(DAY_IN_MILLISECONDS, endTimestamp - startTimestamp)

  return STAGE_DEFINITIONS.map((definition, index) => ({
    id: `${batchId}-STAGE-${index + 1}`,
    stageName: definition.stageName,
    startTime: toIsoTimestamp(
      startTimestamp + (duration * definition.startDay) / 7,
    ),
    endTime: toIsoTimestamp(
      startTimestamp + (duration * definition.endDay) / 7,
    ),
    backgroundColor: definition.backgroundColor,
  }))
}

function createStatusLogs(
  session: Pick<
    RentalSession,
    'orderId' | 'batchId' | 'trayId' | 'status' | 'stagesTimeline'
  >,
): OrderStatusLog[] {
  const firstStage = session.stagesTimeline[0]
  const logs: OrderStatusLog[] = [
    {
      id: `${session.batchId}-LOG-START`,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      timestamp: firstStage.startTime,
      type: 'ORDER_STARTED',
      severity: 'INFO',
      title: 'Bắt đầu Order / Mẻ trồng',
      description: `Đã gắn ${session.trayId} vào ${session.orderId} và bắt đầu thu thập telemetry.`,
      actor: 'Hệ thống MCMS',
    },
    ...session.stagesTimeline.slice(1).map((stage, index) => ({
      id: `${session.batchId}-LOG-STAGE-${index + 2}`,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      timestamp: stage.startTime,
      type: 'STAGE_CHANGED' as const,
      severity: 'INFO' as const,
      title: `Chuyển giai đoạn: ${stage.stageName}`,
      description: 'Mốc sinh trưởng được ghi nhận trên biểu đồ lifecycle.',
      actor: 'Quy trình tự động',
    })),
    {
      id: `${session.batchId}-LOG-IRRIGATION`,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      timestamp: toIsoTimestamp(
        new Date(session.stagesTimeline[1].startTime).getTime() +
          8 * HOUR_IN_MILLISECONDS,
      ),
      type: 'IRRIGATION',
      severity: 'SUCCESS',
      title: 'Tưới ẩm tự động',
      description: 'Van tưới bật theo ngưỡng độ ẩm của profile mẻ trồng.',
      actor: 'Relay AUTO',
    },
    {
      id: `${session.batchId}-LOG-VENTILATION`,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      timestamp: toIsoTimestamp(
        new Date(session.stagesTimeline[2].startTime).getTime() +
          12 * HOUR_IN_MILLISECONDS,
      ),
      type: 'VENTILATION',
      severity: 'SUCCESS',
      title: 'Thông gió điều hòa khí hậu',
      description: 'Quạt tầng được kích hoạt để ổn định nhiệt độ và độ ẩm.',
      actor: 'Relay AUTO',
    },
  ]

  const finalStage = session.stagesTimeline.at(-1)
  if (!finalStage) {
    return logs
  }

  if (session.status === 'COMPLETED') {
    logs.push({
      id: `${session.batchId}-LOG-HARVEST`,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      timestamp: finalStage.endTime,
      type: 'HARVEST_COMPLETED',
      severity: 'SUCCESS',
      title: 'Hoàn tất thu hoạch',
      description: 'Đã chốt vòng đời telemetry và bàn giao sản lượng của mẻ.',
      actor: 'Nhân viên vận hành',
    })
  }

  if (session.status === 'OVERDUE') {
    logs.push({
      id: `${session.batchId}-LOG-OVERDUE`,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      timestamp: finalStage.endTime,
      type: 'ORDER_OVERDUE',
      severity: 'WARNING',
      title: 'Mẻ quá hạn thu hoạch',
      description: 'Order chưa được chốt tại thời điểm kết thúc chu kỳ dự kiến.',
      actor: 'Hệ thống cảnh báo',
    })
  }

  return logs.sort(
    (left, right) =>
      new Date(left.timestamp).getTime() -
      new Date(right.timestamp).getTime(),
  )
}

function findStageAtTimestamp(
  stages: StageTimelineItem[],
  timestamp: number,
) {
  return (
    stages.find((stage, index) => {
      const isLastStage = index === stages.length - 1
      const start = new Date(stage.startTime).getTime()
      const end = new Date(stage.endTime).getTime()

      return timestamp >= start && (timestamp < end || (isLastStage && timestamp <= end))
    }) ?? stages.at(-1)
  )
}

function createRentalSessions() {
  const countersByYear: Record<number, number> = { 2025: 1, 2026: 1 }
  const sessions: RentalSession[] = []

  for (const tierId of TIER_IDS) {
    for (const trayPosition of TRAY_POSITIONS) {
      const trayId = `T${tierId}-K${trayPosition}`

      SESSION_PERIODS.forEach((period, periodIndex) => {
        const year = Number(period.start.slice(0, 4))
        const month = Number(period.start.slice(5, 7))
        const batchNumber = countersByYear[year]
        countersByYear[year] += 1
        const tenant = TENANTS[(tierId + trayPosition + periodIndex) % TENANTS.length]
        const seasonalTemperature = Math.sin(((month - 1) / 12) * Math.PI * 2)
        const status: RentalSessionStatus =
          period.status ??
          (periodIndex === 5 && (tierId + trayPosition) % 4 === 0
            ? 'OVERDUE'
            : 'COMPLETED')
        const batchId = `BATCH-${year}-${String(batchNumber).padStart(3, '0')}`
        const orderId = `ORDER-${year}-${String(batchNumber).padStart(3, '0')}`
        const startDate = toFarmIsoDate(period.start)
        const endDate = toFarmIsoDate(period.end)
        const stagesTimeline = createStagesTimeline(
          batchId,
          startDate,
          endDate,
        )
        const sessionBase = {
          id: batchId,
          orderId,
          batchId,
          trayId,
          tenantId: tenant.id,
          tenantName: tenant.name,
          mushroomType:
            MUSHROOM_TYPES[(tierId * 2 + trayPosition + periodIndex) % MUSHROOM_TYPES.length],
          startDate,
          endDate,
          harvestedAt: status === 'COMPLETED' ? endDate : null,
          status,
          avgTemp: roundToOneDecimal(
            24.2 + seasonalTemperature * 1.8 + tierId * 0.22,
          ),
          avgHumidity: roundToOneDecimal(
            86.5 - seasonalTemperature * 3.4 - trayPosition * 0.35,
          ),
          stagesTimeline,
        }

        sessions.push({
          ...sessionBase,
          statusLogs: createStatusLogs(sessionBase),
        })
      })
    }
  }

  // ── SSOT: Đồng bộ session ACTIVE với cultivation.store / room.store ──────────────────────────
  // Ghi đè tenant + mushroomType + batchId + period chính xác theo từng khay.
  // Thứ tự ngày tính từ ngày hôm nay (16/09/2026):
  //   T1-K1: 13/09→19/09 (Ngày 4/7 - PINNING)
  //   T2-K1: 11/09→17/09 (Ngày 6/7 - FRUITING)
  //   T3-K1: 10/09→16/09 (Ngày 7/7 - READY_TO_HARVEST)
  //   T1-K2: 30/08→05/09 (Ngày 18/7 - FRUITING, QUÁ HẠN 11 ngày → ORDER_OVERDUE)
  //   T1-K3: 30/07→12/09 (Ngày 49/7 - FRUITING + WARNING_CONTAMINATED)
  const SSOT_ACTIVE_SESSION: Record<
    string,
    {
      tenantId: string
      tenantName: string
      mushroomType: string
      batchId: string
      orderId: string
      startDate: string
      endDate: string
    }
  > = {
    'T1-K1': {
      tenantId: 'TENANT-001',
      tenantName: 'Nguyễn Minh Anh',
      mushroomType: 'Nấm bào ngư xám',
      batchId: 'MCMS-2608-A01',
      orderId: 'ORDER-2026-MCMS-A01',
      startDate: toFarmIsoDate('2026-09-13'),
      endDate: toFarmIsoDate('2026-09-19'),
    },
    'T2-K1': {
      tenantId: 'TENANT-002',
      tenantName: 'Trần Quốc Bảo',
      mushroomType: 'Nấm linh chi đỏ',
      batchId: 'MCMS-2607-L02',
      orderId: 'ORDER-2026-MCMS-L02',
      startDate: toFarmIsoDate('2026-09-11'),
      endDate: toFarmIsoDate('2026-09-17'),
    },
    'T3-K1': {
      tenantId: 'TENANT-004',
      tenantName: 'Võ Ngọc Thảo',
      mushroomType: 'Nấm bào ngư trắng',
      batchId: 'MCMS-2606-B03',
      orderId: 'ORDER-2026-MCMS-B03',
      startDate: toFarmIsoDate('2026-09-10'),
      endDate: toFarmIsoDate('2026-09-16'),
    },
    // T1-K2: Hoàng Kim quá hạn — đưa endDate = 05/09 đúng chu kỳ để telemetry vẫn render
    'T1-K2': {
      tenantId: 'TENANT-005',
      tenantName: 'Phạm Thanh Tùng',
      mushroomType: 'Nấm hoàng kim',
      batchId: 'FLOOR-1-HOANG-KIM',
      orderId: 'ORDER-2026-FLOOR-HOANG-KIM',
      startDate: toFarmIsoDate('2026-08-30'),
      endDate: toFarmIsoDate('2026-09-05'),
    },
    // T1-K3: Bào Ngư Xám có cảnh báo nhiễm bệnh
    'T1-K3': {
      tenantId: 'TENANT-003',
      tenantName: 'Lê Thu Hà',
      mushroomType: 'Nấm bào ngư xám',
      batchId: 'MCMS-2607-W06',
      orderId: 'ORDER-2026-MCMS-W06',
      startDate: toFarmIsoDate('2026-07-30'),
      endDate: toFarmIsoDate('2026-09-12'),
    },
  }

  return sessions
    .map((session) => {
      if (session.status !== 'ACTIVE') {
        return session
      }

      const override = SSOT_ACTIVE_SESSION[session.trayId]
      if (!override) {
        return session
      }

      const stagesTimeline = createStagesTimeline(
        override.batchId,
        override.startDate,
        override.endDate,
      )
      const sessionBase = {
        ...session,
        id: override.batchId,
        orderId: override.orderId,
        batchId: override.batchId,
        tenantId: override.tenantId,
        tenantName: override.tenantName,
        mushroomType: override.mushroomType,
        startDate: override.startDate,
        endDate: override.endDate,
        stagesTimeline,
      }

      return {
        ...sessionBase,
        statusLogs: createStatusLogs(sessionBase),
      }
    })
    .sort(
      (left, right) =>
        new Date(right.startDate).getTime() -
        new Date(left.startDate).getTime(),
    )
}

function createSessionTelemetry(session: RentalSession): TelemetryPoint[] {
  const startTimestamp = new Date(session.startDate).getTime()
  const endTimestamp = new Date(session.endDate).getTime()
  const pointCount =
    Math.floor(
      (endTimestamp - startTimestamp) /
        (SAMPLE_INTERVAL_HOURS * HOUR_IN_MILLISECONDS),
    ) + 1

  return Array.from({ length: pointCount }, (_, index) => {
    const dailyPhase = (index % 6) / 6
    const slowPhase = index / Math.max(1, pointCount - 1)
    const temperature =
      session.avgTemp +
      Math.sin(dailyPhase * Math.PI * 2 - Math.PI / 2) * 1.6 +
      Math.sin(slowPhase * Math.PI * 3) * 0.35
    const humidity =
      session.avgHumidity -
      Math.sin(dailyPhase * Math.PI * 2 - Math.PI / 2) * 4.5 +
      Math.cos(slowPhase * Math.PI * 4) * 1.2
    const irrigationCycle = index % 12
    const timestamp =
      startTimestamp + index * SAMPLE_INTERVAL_HOURS * HOUR_IN_MILLISECONDS
    const stage = findStageAtTimestamp(session.stagesTimeline, timestamp)

    return {
      rentalSessionId: session.id,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      stageId: stage?.id ?? session.stagesTimeline[0].id,
      stageName: stage?.stageName ?? session.stagesTimeline[0].stageName,
      timestamp: toIsoTimestamp(timestamp),
      temperature: roundToOneDecimal(temperature),
      humidity: roundToOneDecimal(humidity),
      irrigationActive: irrigationCycle === 2 || irrigationCycle === 3,
      fanActive: temperature > session.avgTemp + 0.8,
    }
  })
}

function createLongTermTelemetry(trayId: string): LongTermTelemetryPoint[] {
  const tierId = Number(trayId.match(/^T(\d)-/)?.[1] ?? 1)
  const trayPosition = Number(trayId.match(/-K(\d)$/)?.[1] ?? 1)
  const startDate = new Date('2025-01-06T00:00:00+07:00')
  const endDate = new Date('2026-09-14T00:00:00+07:00')
  const numberOfWeeks = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (7 * DAY_IN_MILLISECONDS),
  )

  return Array.from({ length: numberOfWeeks + 1 }, (_, index) => {
    const timestamp = new Date(
      startDate.getTime() + index * 7 * DAY_IN_MILLISECONDS,
    )
    const month = timestamp.getMonth()
    const seasonalPhase = (month / 12) * Math.PI * 2
    const annualAdjustment = timestamp.getFullYear() === 2026 ? 0.45 : 0

    return {
      timestamp: timestamp.toISOString(),
      temperature: roundToOneDecimal(
        24.1 +
          Math.sin(seasonalPhase - Math.PI / 2) * 2.1 +
          tierId * 0.18 +
          annualAdjustment +
          Math.sin(index * 0.73) * 0.35,
      ),
      humidity: roundToOneDecimal(
        86.8 -
          Math.sin(seasonalPhase - Math.PI / 2) * 4.2 -
          trayPosition * 0.3 -
          annualAdjustment * 0.8 +
          Math.cos(index * 0.49) * 0.8,
      ),
    }
  })
}

export const MOCK_RENTAL_SESSIONS = createRentalSessions()

export const MOCK_TELEMETRY_BY_SESSION = Object.fromEntries(
  MOCK_RENTAL_SESSIONS.map((session) => [
    session.id,
    createSessionTelemetry(session),
  ]),
) as Record<string, TelemetryPoint[]>

const ALL_TRAY_IDS = TIER_IDS.flatMap((tierId) =>
  TRAY_POSITIONS.map((position) => `T${tierId}-K${position}`),
)

const MOCK_LONG_TERM_BY_TRAY = Object.fromEntries(
  ALL_TRAY_IDS.map((trayId) => [trayId, createLongTermTelemetry(trayId)]),
) as Record<string, LongTermTelemetryPoint[]>

export function getRentalSessionsForTray(trayId: string) {
  return MOCK_RENTAL_SESSIONS.filter((session) => session.trayId === trayId)
}

export function getTelemetryForSession(sessionId: string) {
  return MOCK_TELEMETRY_BY_SESSION[sessionId] ?? []
}

export function getLongTermTelemetryForTray(trayId: string) {
  return MOCK_LONG_TERM_BY_TRAY[trayId] ?? []
}

export function countIrrigationEvents(points: TelemetryPoint[]) {
  return points.reduce((count, point, index) => {
    const wasActive = index > 0 && points[index - 1].irrigationActive
    return point.irrigationActive && !wasActive ? count + 1 : count
  }, 0)
}
