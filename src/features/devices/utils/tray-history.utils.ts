/**
 * Mapping dữ liệu thật → shape lịch sử IoT theo khay.
 *
 * ⚠ Thay thế hoàn toàn `pages/devices/data/iot-history.mock.ts`.
 *
 * Nguồn (100% GET):
 *   - `GET /api/farm/sessions` → phiên canh tác gắn với khay.
 *   - `GET /api/customer/orders/{orderId}/cultivation-progress` → timeline
 *     giai đoạn sinh trưởng thật của mẻ.
 *   - `GET /api/iot/floors/{floorId}/auto-control/logs` → nhật ký sự kiện
 *     vận hành thật (tưới, thông gió, lỗi cảm biến…).
 *   - `GET /api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}/history`
 *     → chuỗi telemetry thật (nhiệt độ / độ ẩm).
 */

import type {
  GrowthStageName,
  OrderStatusLog,
  OrderStatusLogType,
  RentalSession,
  RentalSessionStatus,
  StageTimelineItem,
  TelemetryPoint,
} from '../../../types/iot-history'
import type {
  AutoControlLogEntry,
  IotHistoryReading,
} from '../../../types/iot'
import type { CultivationSession } from '../../sessions/types/session.types'
import type { CustomerCultivationProgressEntry } from '../../orders/types/customer.types'

/** Bảng màu giai đoạn sinh trưởng (dùng cho band trên biểu đồ). */
export const STAGE_COLORS: Record<GrowthStageName, string> = {
  'Ủ tơ / Nuôi sợi': 'rgba(22, 119, 255, 0.12)',
  'Kích nụ / Ra ghim': 'rgba(0, 201, 160, 0.14)',
  'Phát triển thể quả': 'rgba(250, 140, 22, 0.14)',
  'Sẵn sàng thu hoạch': 'rgba(19, 194, 194, 0.16)',
}

/**
 * Ánh xạ giai đoạn của BE → nhãn giai đoạn dùng trong biểu đồ.
 *
 * ⚠ BE trả 8 trạng thái (`CultivationSessionStatus`); biểu đồ lịch sử dùng 4
 * mốc sinh trưởng → gộp các trạng thái tương đương.
 */
export function mapStageToGrowthStageName(
  stage: string | null | undefined,
): GrowthStageName | null {
  switch ((stage ?? '').toUpperCase()) {
    case 'SPAWN_RESTING':
    case 'MYCELIAL_DEVELOPMENT':
    case 'INCUBATION':
      return 'Ủ tơ / Nuôi sợi'
    case 'READY_FOR_CULTIVATION':
    case 'FRUITING':
    case 'PINNING':
      return 'Kích nụ / Ra ghim'
    case 'CULTIVATING':
    case 'FRUIT_DEVELOPMENT':
      return 'Phát triển thể quả'
    case 'HARVESTING':
    case 'COMPLETED':
    case 'HARVEST':
      return 'Sẵn sàng thu hoạch'
    default:
      return null
  }
}

/** Trạng thái phiên BE → trạng thái lịch sử thuê. */
export function mapSessionStatus(
  session: CultivationSession,
): RentalSessionStatus {
  if (session.status === 'COMPLETED') return 'COMPLETED'
  if (session.status === 'CANCELLED') return 'OVERDUE'

  const endDate = session.end_date ?? session.expected_harvest_date
  if (endDate && new Date(endDate).getTime() < Date.now()) return 'OVERDUE'

  return 'ACTIVE'
}

/** Dựng timeline giai đoạn từ các mốc tiến độ thật của đơn. */
export function buildStagesTimeline(
  entries: CustomerCultivationProgressEntry[],
): StageTimelineItem[] {
  const sorted = [...entries]
    .filter((entry) => entry.created_at)
    .sort((left, right) => {
      const l = new Date(left.created_at ?? 0).getTime()
      const r = new Date(right.created_at ?? 0).getTime()
      return l - r
    })

  const items: StageTimelineItem[] = []
  sorted.forEach((entry) => {
    const stageName = mapStageToGrowthStageName(
      entry.current_stage ?? entry.stage,
    )
    if (!stageName) return

    const timestamp = entry.created_at as string
    const last = items[items.length - 1]
    if (last && last.stageName === stageName) {
      // Gộp các mốc liên tiếp cùng giai đoạn.
      last.endTime = timestamp
      return
    }

    items.push({
      id: `stage-${entry.progress_id ?? items.length + 1}`,
      stageName,
      startTime: timestamp,
      endTime: timestamp,
      backgroundColor: STAGE_COLORS[stageName],
    })
  })

  // Mốc cuối cùng chưa có thời điểm kết thúc → dùng thời điểm hiện tại.
  if (items.length > 0) {
    const last = items[items.length - 1]
    if (last.startTime === last.endTime) {
      last.endTime = new Date().toISOString()
    }
  }

  return items
}

/** Phân loại sự kiện auto-control → loại log hiển thị. */
function mapAutoControlEventToLogType(
  eventType: string,
): OrderStatusLogType {
  switch (eventType) {
    case 'START':
      return 'ORDER_STARTED'
    case 'ON_REQUESTED':
    case 'PULSE_RESERVED':
    case 'OFF_CONFIRMED':
      return 'IRRIGATION'
    case 'FAULT':
    case 'RETRY_WAIT':
    case 'MANUAL_OVERRIDE':
      return 'CLIMATE_ALERT'
    case 'STOP':
      return 'HARVEST_COMPLETED'
    case 'CONFIG_SAVED':
      return 'STAGE_CHANGED'
    default:
      return 'VENTILATION'
  }
}

/** Mức độ log theo loại sự kiện. */
function mapSeverity(type: OrderStatusLogType) {
  if (type === 'CLIMATE_ALERT') return 'WARNING' as const
  if (type === 'HARVEST_COMPLETED' || type === 'IRRIGATION') {
    return 'SUCCESS' as const
  }
  return 'INFO' as const
}

/**
 * Dựng nhật ký tác động từ log auto-control thật của tầng.
 *
 * ⚠ Log auto-control là log **cấp tầng** (không gắn khay cụ thể) → ta chỉ
 * lọc theo mốc thời gian của phiên để các sự kiện hiển thị đúng context.
 */
export function buildStatusLogs(
  logs: AutoControlLogEntry[],
  session: {
    orderId: string
    batchId: string
    trayId: string
    startDate: string
    endDate: string
  },
): OrderStatusLog[] {
  const start = new Date(session.startDate).getTime()
  const end = new Date(session.endDate).getTime()

  return logs
    .filter((log) => {
      if (!log.created_at) return false
      const time = new Date(log.created_at).getTime()
      if (Number.isNaN(time)) return false
      return time >= start && time <= end
    })
    .map((log, index) => {
      const type = mapAutoControlEventToLogType(log.event_type)
      return {
        id: `acl-${log.id ?? index}`,
        orderId: session.orderId,
        batchId: session.batchId,
        trayId: session.trayId,
        timestamp: log.created_at as string,
        type,
        severity: mapSeverity(type),
        title: log.event_type,
        description:
          log.reason ??
          log.safety_blocked_reason ??
          'Sự kiện vận hành được ghi nhận trên tầng.',
        actor: 'Hệ thống IoT tự động',
      }
    })
}

/** Dựng phiên lịch sử thuê từ phiên canh tác thật. */
export function buildRentalSession(input: {
  session: CultivationSession
  trayCode: string
  stagesTimeline: StageTimelineItem[]
  statusLogs: OrderStatusLog[]
  avgTemp: number
  avgHumidity: number
}): RentalSession {
  const { session } = input
  const startDate = session.start_date ?? new Date().toISOString()
  const endDate =
    session.end_date ??
    session.expected_harvest_date ??
    session.start_date ??
    new Date().toISOString()

  return {
    id: String(session.session_id),
    orderId:
      session.order_id != null ? `ORD-${session.order_id}` : 'Chưa có đơn',
    batchId: `SES-${session.session_id}`,
    trayId: input.trayCode,
    tenantId:
      session.user_id != null ? `KH-${session.user_id}` : 'Chưa xác định',
    tenantName: session.customer_name ?? 'Chưa xác định',
    mushroomType: session.mushroom_name ?? 'Chưa xác định',
    startDate,
    endDate,
    harvestedAt: session.status === 'COMPLETED' ? endDate : null,
    status: mapSessionStatus(session),
    avgTemp: input.avgTemp,
    avgHumidity: input.avgHumidity,
    stagesTimeline: input.stagesTimeline,
    statusLogs: input.statusLogs,
  }
}

/** Chuyển readings IoT thật → điểm telemetry của biểu đồ. */
export function buildTelemetryPoints(
  readings: IotHistoryReading[],
  session: {
    id: string
    orderId: string
    batchId: string
    trayId: string
    stageName: GrowthStageName
  },
): TelemetryPoint[] {
  return readings
    .filter(
      (reading) =>
        reading.temperature != null && reading.humidity != null,
    )
    .map((reading) => ({
      rentalSessionId: session.id,
      orderId: session.orderId,
      batchId: session.batchId,
      trayId: session.trayId,
      stageId: session.stageName,
      stageName: session.stageName,
      timestamp: reading.measuredAt ?? reading.receivedAt ?? '',
      temperature: reading.temperature as number,
      humidity: reading.humidity as number,
    }))
    .filter((point) => point.timestamp !== '')
    .sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp),
    )
}

/** Tính nhiệt độ / độ ẩm trung bình từ readings thật. */
export function computeAverages(readings: IotHistoryReading[]) {
  const valid = readings.filter(
    (reading) =>
      reading.temperature != null && reading.humidity != null,
  )
  if (valid.length === 0) return { avgTemp: 0, avgHumidity: 0 }

  const sumTemp = valid.reduce(
    (sum, reading) => sum + (reading.temperature as number),
    0,
  )
  const sumHumidity = valid.reduce(
    (sum, reading) => sum + (reading.humidity as number),
    0,
  )

  return {
    avgTemp: Number((sumTemp / valid.length).toFixed(1)),
    avgHumidity: Number((sumHumidity / valid.length).toFixed(1)),
  }
}

/** Đếm số lần tưới trong nhật ký tác động. */
export function countIrrigationEvents(logs: OrderStatusLog[]): number {
  return logs.filter((log) => log.type === 'IRRIGATION').length
}
