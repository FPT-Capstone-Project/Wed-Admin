import type {
  SessionEnvironmentRecord,
} from '../types/session-environment-history.types'

/**
 * Chuẩn hoá bản ghi **Environment History** thành điểm biểu đồ.
 *
 * ⚠ **Nguồn duy nhất** cho biểu đồ cảm biến của phiên canh tác:
 *   `GET /api/environment-history/sessions/{sessionId}` — đã gộp sẵn **10
 *   phút/tầng** bởi BE.
 *
 * ## Vì sao không còn nguồn "raw" nữa?
 *
 * ⚠ Endpoint cũ `/api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *   đã bị BE **gỡ bỏ** (404) ⇒ không còn dữ liệu thô theo cảm biến.
 *   Nguồn mới là **duy nhất** và đã là dạng tổng hợp ⇒ không cần gom lại ở FE.
 *
 * ## Vì sao vẫn cần `mergeFloorClimatePoints`?
 *
 * ⚠ BE trả **một bản ghi cho mỗi (tầng × bucket 10 phút)** ⇒ cùng 1 mốc
 *   thời gian có N dòng (N = số tầng của phiên). Ta gộp theo mốc thời gian
 *   để ra **1 đường trung bình của phiên** — giống hành vi cũ khi nguồn raw
 *   gộp 3 cảm biến của mọi tầng.
 */

/** Một điểm chuẩn hoá cho biểu đồ — shape chung. */
export interface SessionClimatePoint {
  /** Đầu nhóm thời gian (epoch ms) — dùng làm mốc trục hoành. */
  timestamp: number
  /** Nhãn mốc theo định dạng `HH:mm DD/MM`. */
  label: string
  /** Nhiệt độ trung bình trong nhóm (đã làm tròn 1 chữ số thập phân). */
  temperature: number | null
  /** Độ ẩm trung bình trong nhóm (đã làm tròn 1 chữ số thập phân). */
  humidity: number | null
  /** Các tầng có dữ liệu trong nhóm này (không trùng lặp). */
  floorIds: number[]
  /** Nhãn hiển thị của các tầng (không trùng lặp). */
  floorLabels: string[]
  /** Số mẫu đã gộp (ở nguồn này = số tầng góp mẫu). */
  sampleCount: number
  /**
   * `true` = điểm đã được **BE** gộp sẵn.
   *
   * ⚠ Với nguồn này "số lần đo" không xác định ⇒ tooltip hiển thị nhãn khác.
   */
  serverAggregated: boolean
}

/** Làm tròn 1 chữ số thập phân — tránh hiển thị dài dòng số thừa. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Định dạng mốc `HH:mm DD/MM` (giờ địa phương). */
export function formatMinuteBucketLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  return `${hh}:${mm} ${dd}/${mo}`
}

/** Một điểm thô của 1 tầng (nguồn BE đã gộp sẵn). */
export interface FloorClimatePointInput {
  timestamp: number
  temperature: number | null
  humidity: number | null
  floorId: number | null
  floorLabel: string | null
}

/**
 * Gộp các chuỗi điểm **của nhiều tầng** thành 1 chuỗi điểm duy nhất.
 *
 * ⚠ Dùng cho nguồn `environment-history`: BE trả **một bản ghi cho mỗi
 *   (tầng × bucket)** ⇒ ta gộp theo mốc thời gian để ra đường trung bình
 *   của phiên (đúng như hành vi của nguồn raw cũ).
 *
 * ⚠ Trung bình **riêng cho từng chỉ số** — tầng thiếu nhiệt độ không làm hỏng
 *   giá trị độ ẩm.
 */
export function mergeFloorClimatePoints(
  series: readonly FloorClimatePointInput[],
): SessionClimatePoint[] {
  interface Accumulator {
    timestamp: number
    temperatureSum: number
    temperatureCount: number
    humiditySum: number
    humidityCount: number
    floorIds: Set<number>
    floorLabels: Set<string>
  }

  const buckets = new Map<number, Accumulator>()

  for (const point of series) {
    let bucket = buckets.get(point.timestamp)
    if (!bucket) {
      bucket = {
        timestamp: point.timestamp,
        temperatureSum: 0,
        temperatureCount: 0,
        humiditySum: 0,
        humidityCount: 0,
        floorIds: new Set<number>(),
        floorLabels: new Set<string>(),
      }
      buckets.set(point.timestamp, bucket)
    }

    if (typeof point.temperature === 'number') {
      bucket.temperatureSum += point.temperature
      bucket.temperatureCount += 1
    }
    if (typeof point.humidity === 'number') {
      bucket.humiditySum += point.humidity
      bucket.humidityCount += 1
    }

    if (point.floorId != null) bucket.floorIds.add(point.floorId)
    if (point.floorLabel) bucket.floorLabels.add(point.floorLabel)
  }

  return [...buckets.values()]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((bucket) => ({
      timestamp: bucket.timestamp,
      label: formatMinuteBucketLabel(bucket.timestamp),
      temperature:
        bucket.temperatureCount > 0
          ? round1(bucket.temperatureSum / bucket.temperatureCount)
          : null,
      humidity:
        bucket.humidityCount > 0
          ? round1(bucket.humiditySum / bucket.humidityCount)
          : null,
      floorIds: [...bucket.floorIds],
      floorLabels: [...bucket.floorLabels],
      // ⚠ Không biết số lần đo thực tế (BE đã gộp) ⇒ đếm số tầng góp mẫu.
      sampleCount: Math.max(bucket.temperatureCount, bucket.humidityCount),
      serverAggregated: true,
    }))
}

/**
 * Chuyển bản ghi **Environment History** thành điểm biểu đồ.
 *
 * ⚠ Mốc thời gian = **`period_start`** (đầu bucket 10 phút) — đây là mốc
 *   mà BE dùng để căn bucket (`date_bin`), nên các điểm rơi đúng vào mốc
 *   tròn (:00, :10, :20, …) ⇒ khớp với nhãn trục hoành.
 *
 * ⚠ `period_end` là mốc **exclusive** ⇒ không dùng làm mốc điểm.
 *
 * @param floorLabels Nhãn hiển thị của tầng — tra theo `floor_id`.
 */
export function environmentRecordsToClimatePoints(
  records: readonly SessionEnvironmentRecord[],
  floorLabels: ReadonlyMap<number, string> = new Map(),
): SessionClimatePoint[] {
  const series: FloorClimatePointInput[] = []

  for (const record of records) {
    const timestamp = Date.parse(record.period_start ?? '')
    if (!Number.isFinite(timestamp)) continue

    const floorId = record.floor_id
    const floorLabel =
      floorId != null ? (floorLabels.get(floorId) ?? `Tầng ${floorId}`) : null

    series.push({
      timestamp,
      temperature: record.temperature_avg,
      humidity: record.humidity_avg,
      floorId,
      floorLabel,
    })
  }

  return mergeFloorClimatePoints(series)
}

/**
 * Lọc bản ghi theo cửa sổ thời gian `[start, end]`.
 *
 * ⚠ Dùng `period_start` làm mốc — khớp với cách BE lọc (`period_start >= from
 *   AND period_start < to`).
 */
export function filterEnvironmentRecordsByWindow(
  records: readonly SessionEnvironmentRecord[],
  start: number,
  end: number,
): SessionEnvironmentRecord[] {
  return records.filter((record) => {
    const timestamp = Date.parse(record.period_start ?? '')
    if (!Number.isFinite(timestamp)) return false
    return timestamp >= start && timestamp <= end
  })
}
