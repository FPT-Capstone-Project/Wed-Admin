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
