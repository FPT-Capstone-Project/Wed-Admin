import { climateThresholdsFromConfig } from '../../rooms/utils/farm-climate.utils.ts'
import type { ClimateThresholds } from '../../rooms/utils/tray-climate.utils.ts'
import type { TemperatureBounds } from './temperature-threshold.utils.ts'
import type {
  EnvironmentHistoryData,
  EnvironmentHistoryFloor,
  EnvironmentHistoryPoint,
  EnvironmentHistoryThresholds,
} from '../../../types/environment-history'

/**
 * Helpers thuần cho lịch sử môi trường — không phụ thuộc React/network.
 *
 * ⚠ Tách riêng khỏi `api/environment-history.api.ts` để **test được** bằng
 *   `node --test` (xem `tests/environment-history.test.mjs`): file api import
 *   axios ⇒ không import được trong test runner thuần.
 */

/** Bucket mặc định của BE — 15 phút. */
export const DEFAULT_BUCKET_MS = 15 * 60_000

/** Nhịp làm mới mặc định của BE — 5 phút. */
export const DEFAULT_REFRESH_AFTER_MS = 5 * 60_000

/** Đọc số hợp lệ (chấp nhận chuỗi số) — fallback `null` (= thiếu dữ liệu). */
export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/**
 * Domain trục hoành của biểu đồ — `[đầu, cuối]`.
 *
 * ⚠ **Vì sao không dùng thẳng `from`/`to` của BE?**
 *
 *   BE trả `from` / `to` là cửa sổ **server** đã làm tròn về mốc 5 phút
 *   (`to = floor(Date.now() / 5min) * 5min`). Nhưng dữ liệu trả về có thể
 *   chứa điểm **mới hơn** mốc đó (đọc trễ, cache của BE, đồng hồ server
 *   lệch) ⇒ nếu cứ cắn cứng theo `from`/`to` thì điểm mới sẽ bị **cắt ra
 *   ngoài** trục X ⇒ chart không "kéo dài" dù đã có data mới.
 *
 *   → Domain = hợp nhất của cửa sổ BE và **điểm dữ liệu thực tế**:
 *     - đầu  = `min(from, điểm đầu tiên)`
 *     - cuối = `max(to, điểm cuối cùng + 1 bucket)` ⇒ giữ trọn bucket cuối
 *       (bucket đang ghi dở vẫn hiện đúng bề rộng).
 *
 *   ⇒ Khi BE trả data mới (điểm mới hơn mốc cũ) ⇒ domain **tự kéo dài**,
 *     không cần sửa code.
 */
export function resolveEnvironmentDomain(
  from: number | undefined,
  to: number | undefined,
  bucketMs: number,
  points: readonly EnvironmentHistoryPoint[],
): [number, number] {
  const bucket = bucketMs > 0 ? bucketMs : DEFAULT_BUCKET_MS
  const first = points.length > 0 ? points[0].timestamp : undefined
  const last = points.length > 0 ? points[points.length - 1].timestamp : undefined

  const start =
    from != null && Number.isFinite(from)
      ? first != null
        ? Math.min(from, first)
        : from
      : (first ?? 0)

  const end =
    to != null && Number.isFinite(to)
      ? last != null
        ? Math.max(to, last + bucket)
        : to
      : (last ?? 0) + bucket

  // Cửa sổ rỗng / hỏng ⇒ trả về domain tối thiểu hợp lệ để recharts không vỡ.
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return [start, start + bucket]
  }

  return [start, end]
}

/**
 * Chẩn đoán cửa sổ dữ liệu — dùng để log ra console khi debug.
 *
 * ⚠ `latestPointAt` = thời điểm của **điểm dữ liệu thực tế mới nhất**
 *   (bucket có ít nhất 1 metric khác `null`) — KHÔNG phải bucket cuối trong
 *   mảng (bucket cuối thường trống vì cảm biến chưa gửi / mất mạng).
 */
export interface EnvironmentWindowDiagnostics {
  /** Đầu cửa sổ BE (epoch ms). */
  from: number
  /** Cuối cửa sổ BE — **exclusive** (epoch ms). */
  to: number
  /** Kích thước bucket (ms). */
  bucketMs: number
  /** Nhịp làm mới do BE đề xuất (ms). */
  refreshAfterMs: number
  /** Điểm dữ liệu mới nhất thực sự có số đo (epoch ms) — `null` nếu chưa có. */
  latestPointAt: number | null
  /** Số tầng trả về. */
  floorCount: number
  /** Số tầng có ít nhất 1 số đo. */
  floorsWithData: number
  /** Chi tiết từng tầng. */
  floors: Array<{
    floorName: string
    /** Điểm dữ liệu mới nhất có số đo (epoch ms) — `null` nếu chưa có. */
    latestAt: number | null
    /** Tổng số bucket trả về. */
    pointCount: number
    /** Số bucket **có** số đo. */
    filledPointCount: number
  }>
}

/** Điểm dữ liệu mới nhất **có** số đo của 1 tầng (epoch ms) — `null` nếu chưa có. */
export function latestMeasuredPointAt(
  points: readonly EnvironmentHistoryPoint[],
): number | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]
    if (point.temperature != null || point.humidity != null) {
      return point.timestamp
    }
  }
  return null
}

/**
 * Gom chẩn đoán cửa sổ dữ liệu từ payload đã chuẩn hoá.
 *
 * ⚠ Dùng cho **log console ở chế độ dev** (xem `useEnvironmentHistory`) để
 *   kiểm tra nhanh: BE dừng ở mốc nào, dữ liệu thực tế mới nhất là mấy giờ.
 */
export function describeEnvironmentWindow(
  data: EnvironmentHistoryData | undefined,
): EnvironmentWindowDiagnostics | null {
  if (!data) return null

  const floors = data.floors.map(floor => {
    let filledPointCount = 0
    for (const point of floor.points) {
      if (point.temperature != null || point.humidity != null) {
        filledPointCount += 1
      }
    }
    return {
      floorName: floor.floorName,
      latestAt: latestMeasuredPointAt(floor.points),
      pointCount: floor.points.length,
      filledPointCount,
    }
  })

  const latestAt = floors
    .map(floor => floor.latestAt)
    .filter((value): value is number => value != null)

  return {
    from: data.from,
    to: data.to,
    bucketMs: data.bucketMs,
    refreshAfterMs: data.refreshAfterMs,
    latestPointAt: latestAt.length > 0 ? Math.max(...latestAt) : null,
    floorCount: floors.length,
    floorsWithData: floors.filter(floor => floor.filledPointCount > 0).length,
    floors,
  }
}

/**
 * Chuẩn hoá payload thô của BE về shape domain.
 *
 * ⚠ Mọi field đều có fallback an toàn — không bao giờ trả `NaN` /
 *   `undefined` ra UI. Thiếu `floors` ⇒ danh sách rỗng (UI hiện "Chưa có dữ
 *   liệu tầng" thay vì vỡ trang).
 */
export function normalizeEnvironmentHistory(
  raw: Record<string, unknown>,
): EnvironmentHistoryData {
  const floors = Array.isArray(raw.floors)
    ? (raw.floors as Record<string, unknown>[])
    : []

  return {
    from: toFiniteNumber(raw.from) ?? 0,
    to: toFiniteNumber(raw.to) ?? 0,
    bucketMs: toFiniteNumber(raw.bucketMs) ?? DEFAULT_BUCKET_MS,
    refreshAfterMs:
      toFiniteNumber(raw.refreshAfterMs) ?? DEFAULT_REFRESH_AFTER_MS,
    floors: floors.map(normalizeFloor),
  }
}

function normalizeFloor(raw: Record<string, unknown>): EnvironmentHistoryFloor {
  const points = Array.isArray(raw.points)
    ? (raw.points as Record<string, unknown>[])
    : []

  return {
    floorId: toFiniteNumber(raw.floorId) ?? 0,
    floorName:
      typeof raw.floorName === 'string' && raw.floorName.trim()
        ? raw.floorName
        : 'Tầng',
    floorNumber: toFiniteNumber(raw.floorNumber),
    roomId: toFiniteNumber(raw.roomId),
    masterDbId: toFiniteNumber(raw.masterDbId),
    masterId:
      typeof raw.masterId === 'string' && raw.masterId.trim() ? raw.masterId : null,
    nodeId: toFiniteNumber(raw.nodeId),
    thresholds: normalizeThresholds(raw.thresholds),
    points: points.map(normalizePoint),
  }
}

function normalizeThresholds(
  raw: unknown,
): EnvironmentHistoryThresholds | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>

  const thresholds: EnvironmentHistoryThresholds = {
    temperature_min: toFiniteNumber(obj.temperature_min),
    temperature_max: toFiniteNumber(obj.temperature_max),
    humidity_min: toFiniteNumber(obj.humidity_min),
    humidity_max: toFiniteNumber(obj.humidity_max),
  }

  // Không có ngưỡng nào ⇒ coi như chưa cấu hình (null) thay vì object toàn
  // null ⇒ UI hiển thị "Chưa có ngưỡng" thay vì "≥ —, ≤ —".
  const hasAny = Object.values(thresholds).some(value => value != null)
  return hasAny ? thresholds : null
}

function normalizePoint(raw: Record<string, unknown>): EnvironmentHistoryPoint {
  return {
    timestamp: toFiniteNumber(raw.timestamp) ?? 0,
    temperature: toFiniteNumber(raw.temperature),
    humidity: toFiniteNumber(raw.humidity),
  }
}

/** Một tầng đã sẵn sàng để vẽ biểu đồ. */
export interface EnvironmentChartFloor {
  /** Định danh tầng theo BE (`cultivation_floors.floor_id`). */
  floorId: number
  /** Tên hiển thị trên tiêu đề biểu đồ (vd "Tầng 1"). */
  floorName: string
  /** Ngưỡng hiện tại của tầng — `null` khi chưa có cấu hình. */
  thresholds: ClimateThresholds | null
  /** Các điểm đã gộp, sắp theo thời gian tăng dần. */
  points: EnvironmentHistoryPoint[]
}

/**
 * Chuẩn hoá payload của BE về shape dùng cho biểu đồ.
 *
 * - Bỏ các tầng không có điểm nào ⇒ không dựng card rỗng.
 * - Chuyển `thresholds` (shape BE) → `ClimateThresholds` (shape domain) qua
 *   `climateThresholdsFromConfig` — hàm dùng chung với trang Quản lý thiết bị
 *   để hai nơi không lệch cách hiểu ngưỡng.
 * - `fallbackTemperatureBounds` bổ sung ngưỡng nhiệt độ khi BE trả `null`
 *   (cấu hình tầng không bật làm mát) ⇒ tooltip vẫn báo vượt/thấp ngưỡng
 *   nhiệt độ. Ngưỡng độ ẩm **không** bổ sung (BE luôn có).
 */
export function toChartFloors(
  data: EnvironmentHistoryData | undefined,
  fallbackTemperatureBounds?: ReadonlyMap<number, TemperatureBounds>,
): EnvironmentChartFloor[] {
  return (data?.floors ?? [])
    .map(floor => {
      const thresholds = climateThresholdsFromConfig(floor.thresholds)
      const fallback = fallbackTemperatureBounds?.get(floor.floorId)

      // Chỉ bổ sung phần **còn thiếu** — ngưỡng BE luôn được ưu tiên.
      const merged =
        thresholds == null
          ? fallback
            ? {
                tempMin: fallback.tempMin,
                tempMax: fallback.tempMax,
                humidityMin: null,
                humidityMax: null,
              }
            : null
          : thresholds.tempMin == null && thresholds.tempMax == null && fallback
            ? { ...thresholds, ...fallback }
            : thresholds

      return {
        floorId: floor.floorId,
        floorName: floor.floorName,
        thresholds: merged,
        points: floor.points,
      }
    })
    .filter(floor => floor.points.length > 0)
}

/**
 * Giá trị mới nhất của một tầng — dùng cho thẻ chỉ số tổng quan.
 */
export interface FloorLatestEnvironment {
  floorName: string
  temperature: number | null
  humidity: number | null
  thresholds: ClimateThresholds | null
}

/**
 * Giá trị mới nhất của từng tầng — dùng cho thẻ "Nhiệt độ / Độ ẩm trung bình".
 *
 * ⚠ Lấy **điểm non-null mới nhất** chứ không phải bucket cuối cùng: bucket
 *   cuối có thể trống (cảm biến tắt hoặc mất mạng) ⇒ coi như chưa có dữ liệu
 *   sẽ làm thẻ chỉ số nhảy giá trị bất thường.
 */
export function toLatestEnvironment(
  floors: readonly EnvironmentChartFloor[],
): FloorLatestEnvironment[] {
  return floors.map(floor => ({
    floorName: floor.floorName,
    temperature: lastFiniteValue(floor.points, 'temperature'),
    humidity: lastFiniteValue(floor.points, 'humidity'),
    thresholds: floor.thresholds,
  }))
}

/** Giá trị non-null mới nhất của một metric trong chuỗi điểm. */
function lastFiniteValue(
  points: readonly EnvironmentHistoryPoint[],
  metric: 'temperature' | 'humidity',
): number | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const value = points[index][metric]
    if (value != null && Number.isFinite(value)) return value
  }
  return null
}
