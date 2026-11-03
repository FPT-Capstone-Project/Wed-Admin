/**
 * Lịch sử IoT theo khay — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PATCH/PUT/DELETE ở đây.
 *
 * Gộp nhiều endpoint GET để dựng lại lịch sử vận hành của một khay:
 *   - `GET /api/farm/sessions?trayId=` → các phiên của khay.
 *   - `GET /api/customer/orders/{orderId}/cultivation-progress` → timeline
 *     giai đoạn sinh trưởng thật của từng mẻ.
 *   - `GET /api/iot/floors` → map tầng ↔ master ↔ node RS485.
 *   - `GET /api/iot/masters` → map `master_id` (BE) → `masterId` (string).
 *   - `GET /api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}/history`
 *     → chuỗi telemetry thật.
 *   - `GET /api/iot/floors/{floorId}/auto-control/logs` → nhật ký vận hành.
 */

import { autoMistingApi, iotApi } from './iot.api'
import { sessionApi } from '../../sessions/api/session.api'
import { customerOrderApi } from '../../orders/api/customer-order.api'
import { cultivationTrayApi } from '../../rooms/api/cultivation-tray.api'
import type { LongTermTelemetryPoint } from '../../../types/iot-history'
import type { IotHistoryReading } from '../../../types/iot'
import {
  buildRentalSession,
  buildStagesTimeline,
  buildStatusLogs,
  buildTelemetryPoints,
  computeAverages,
  mapStageToGrowthStageName,
} from '../utils/tray-history.utils'

/** Số readings tối đa lấy cho mỗi cảm biến (lịch sử dài hạn). */
const HISTORY_LIMIT = 1000

/** Số cảm biến trên mỗi node RS485. */
const SENSORS_PER_NODE = 3

export interface TrayHistoryBundle {
  /** Danh sách mẻ (phiên canh tác) của khay. */
  sessions: ReturnType<typeof buildRentalSession>[]
  /** Telemetry theo `sessionId`. */
  telemetryBySessionId: Record<string, ReturnType<typeof buildTelemetryPoints>>
  /** Chuỗi telemetry dài hạn của tầng (dùng cho tab xu hướng). */
  longTermTelemetry: LongTermTelemetryPoint[]
  /** Nhiệt độ / độ ẩm trung bình của tầng. */
  avgTemp: number
  avgHumidity: number
  /** `floorId` của khay (nếu BE đã gán tầng). */
  floorId: number | null
  /** Tên tầng (để hiển thị). */
  floorName: string | null
}

/**
 * Tải toàn bộ lịch sử IoT của một khay.
 *
 * @param trayId `cultivation_trays.tray_id`
 */
export async function fetchTrayHistory(
  trayId: number,
): Promise<TrayHistoryBundle> {
  const empty: TrayHistoryBundle = {
    sessions: [],
    telemetryBySessionId: {},
    longTermTelemetry: [],
    avgTemp: 0,
    avgHumidity: 0,
    floorId: null,
    floorName: null,
  }

  if (!trayId || trayId <= 0) return empty

  const [sessionsResult, floors, masters] = await Promise.all([
    sessionApi.list({ trayId }),
    autoMistingApi.listFloors().catch(() => []),
    iotApi.listMasters().catch(() => []),
  ])

  // Tìm tầng chứa khay: ưu tiên `floor_id` từ chính khay, fallback theo tên.
  const trayFloor = await resolveTrayFloor(trayId)
  const floorId = trayFloor?.floorId ?? null
  const floorName = trayFloor?.floorName ?? null

  const floor = floors.find((item) => item.floor_id === floorId)
  const masterId = floor
    ? (masters.find((master) => master.id === floor.master_id)?.masterId ?? null)
    : null
  const nodeId = floor?.node_address ?? null

  // Telemetry thật của tầng (gộp mọi cảm biến trên node).
  const readings = masterId && nodeId
    ? await fetchNodeReadings(masterId, nodeId)
    : []

  const longTermTelemetry: LongTermTelemetryPoint[] = readings
    .filter(
      (reading) =>
        reading.temperature != null &&
        reading.humidity != null &&
        (reading.measuredAt ?? reading.receivedAt),
    )
    .map((reading) => ({
      timestamp: (reading.measuredAt ?? reading.receivedAt) as string,
      temperature: reading.temperature as number,
      humidity: reading.humidity as number,
    }))

  const averages = computeAverages(readings)

  // Nhật ký vận hành của tầng (dùng làm "nhật ký tác động" của mẻ).
  const autoControlLogs = floorId
    ? ((await autoMistingApi
        .getAutoControlLogs(floorId, { limit: 500 })
        .catch(() => null))?.logs ?? [])
    : []

  const sessions = await Promise.all(
    sessionsResult.items.map(async (session) => {
      const progress = session.order_id
        ? await customerOrderApi
            .getCultivationProgress(session.order_id)
            .catch(() => null)
        : null

      const stagesTimeline = buildStagesTimeline(progress?.entries ?? [])
      const startDate = session.start_date ?? new Date().toISOString()
      const endDate =
        session.end_date ??
        session.expected_harvest_date ??
        startDate

      const rentalSession = buildRentalSession({
        session,
        trayCode: trayFloor?.trayCode ?? `Khay #${trayId}`,
        stagesTimeline,
        statusLogs: buildStatusLogs(autoControlLogs, {
          orderId:
            session.order_id != null
              ? `ORD-${session.order_id}`
              : 'Chưa có đơn',
          batchId: `SES-${session.session_id}`,
          trayId: trayFloor?.trayCode ?? `Khay #${trayId}`,
          startDate,
          endDate,
        }),
        avgTemp: averages.avgTemp,
        avgHumidity: averages.avgHumidity,
      })

      const stageName =
        mapStageToGrowthStageName(session.status) ?? 'Ủ tơ / Nuôi sợi'

      const telemetry = buildTelemetryPoints(readings, {
        id: rentalSession.id,
        orderId: rentalSession.orderId,
        batchId: rentalSession.batchId,
        trayId: rentalSession.trayId,
        stageName,
      })

      return { rentalSession, telemetry }
    }),
  )

  const telemetryBySessionId: TrayHistoryBundle['telemetryBySessionId'] = {}
  sessions.forEach(({ rentalSession, telemetry }) => {
    telemetryBySessionId[rentalSession.id] = telemetry
  })

  return {
    sessions: sessions.map((item) => item.rentalSession),
    telemetryBySessionId,
    longTermTelemetry,
    avgTemp: averages.avgTemp,
    avgHumidity: averages.avgHumidity,
    floorId,
    floorName,
  }
}

/**
 * Lấy thông tin tầng + mã khay từ `GET /api/cultivation-trays`.
 *
 * ⚠ BE trả `floor_id` cho khay; tầng tương ứng lấy từ `GET /api/iot/floors`
 * để có `floor_name`.
 */
async function resolveTrayFloor(trayId: number) {
  const tray = await cultivationTrayApi.getById(trayId).catch(() => null)
  if (!tray) return null

  let floorName: string | null = tray.floor_name ?? null
  if (!floorName && tray.floor_id) {
    const floors = await autoMistingApi.listFloors().catch(() => [])
    floorName =
      floors.find((floor) => floor.floor_id === tray.floor_id)?.floor_name ??
      null
  }

  return {
    floorId: tray.floor_id ?? null,
    floorName,
    trayCode: tray.tray_code,
  }
}

/** Gộp readings của mọi cảm biến trên một node RS485. */
async function fetchNodeReadings(
  masterId: string,
  nodeId: number,
): Promise<IotHistoryReading[]> {
  const results = await Promise.all(
    Array.from({ length: SENSORS_PER_NODE }, (_, index) =>
      iotApi
        .getHistory(masterId, nodeId, index + 1, { limit: HISTORY_LIMIT })
        .catch(() => null),
    ),
  )

  return results
    .flatMap((response) => response?.readings ?? [])
    .sort((left, right) => {
      const l = left.measuredAt ?? left.receivedAt ?? ''
      const r = right.measuredAt ?? right.receivedAt ?? ''
      return l.localeCompare(r)
    })
}
