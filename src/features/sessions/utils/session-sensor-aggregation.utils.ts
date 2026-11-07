import type { SessionSensorReading } from '../types/session-iot-history.types'

/**
 * Xử lý dữ liệu cảm biến cho biểu đồ lịch sử phiên canh tác.
 *
 * ## Hai nguồn dữ liệu, một shape chung
 *
 * ⚠ Biểu đồ cần **2** mức chi tiết khác nhau, không thể dùng chung 1 nguồn:
 *
 * | Mốc      | Nguồn                                   | Vì sao                          |
 * |----------|-----------------------------------------|---------------------------------|
 * | `1h`     | `/iot-history/sensors` (gom tại FE)      | Cần độ phân giải **1 phút/điểm** |
 * | `6h/12h/24h` | `/analytics/dashboard/environment-history` | BE gom sẵn 15 phút/điểm — 1 request |
 *
 *   Lý do: `/iot-history/sensors` **chỉ** hỗ trợ `page` & `pageSize` (max 100)
 *   ⇒ 24 giờ dữ liệu thô (3 cảm biến × mỗi 5 giây) cần **~519 trang** ⇒
 *   không thể vừa nhanh vừa đủ dữ liệu.
 *
 *   → `environment-history` nhận `from`/`to` (tối đa 24 giờ) và **gộp sẵn
 *     trong SQL** ⇒ 1 request, đủ dữ liệu, không nghẽn connection pool.
 *
 * ⚠ Cả 2 nguồn đều được chuẩn hoá về `SessionClimatePoint` ⇒ biểu đồ không
 *   cần biết dữ liệu đến từ đâu.
 */

/** Khoảng thời gian có thể chọn cho biểu đồ. */
export type SessionSensorTimeRange = '1h' | '6h' | '12h' | '24h'

export interface SessionSensorTimeRangeOption {
  value: SessionSensorTimeRange
  label: string
}

/** Các lựa chọn khoảng thời gian (hiển thị trên thanh chọn của biểu đồ). */
export const SENSOR_TIME_RANGE_OPTIONS: SessionSensorTimeRangeOption[] = [
  { value: '1h', label: '1 giờ' },
  { value: '6h', label: '6 giờ' },
  { value: '12h', label: '12 giờ' },
  { value: '24h', label: '24 giờ' },
]

/** Số giờ của từng khoảng. */
const RANGE_HOURS: Record<SessionSensorTimeRange, number> = {
  '1h': 1,
  '6h': 6,
  '12h': 12,
  '24h': 24,
}

/**
 * Kích thước nhóm gom trung bình (phút) cho từng mốc thời gian.
 *
 * ⚠ **Vì sao gom thô hơn ở cửa sổ dài?**
 *   Số điểm trên biểu đồ càng nhiều càng dễ "răng cưa" và càng tốn công render.
 *   Ta chọn số điểm **~60–100** cho mọi mốc:
 *     - 1h  → 1 phút/điểm   ⇒ ~60 điểm
 *     - 6h  → 5 phút/điểm   ⇒ ~72 điểm
 *     - 12h → 10 phút/điểm  ⇒ ~72 điểm
 *     - 24h → 15 phút/điểm  ⇒ ~96 điểm
 */
export const SENSOR_TIME_RANGE_BUCKET_MINUTES: Record<
  SessionSensorTimeRange,
  number
> = {
  '1h': 1,
  '6h': 5,
  '12h': 10,
  '24h': 15,
}

/**
 * Mốc dùng nguồn dữ liệu **đã gộp sẵn** của BE (`environment-history`).
 *
 * ⚠ Chỉ các mốc **dài** mới dùng nguồn này:
 *   - `1h` cần độ phân giải 1 phút/điểm ⇒ BE (gộp 15 phút) quá thô ⇒ giữ
 *     nguồn raw `/iot-history/sensors` với **3 trang** (tải nhanh, đủ dùng).
 *   - `6h/12h/24h` cần phủ trọn cửa sổ ⇒ nguồn raw bất khả thi (hàng trăm
 *     trang) ⇒ dùng nguồn gộp sẵn (1 request).
 */
export const SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE: Record<
  SessionSensorTimeRange,
  boolean
> = {
  '1h': false,
  '6h': true,
  '12h': true,
  '24h': true,
}

/**
 * Số trang API tối đa được kéo khi dùng nguồn raw (`/iot-history/sensors`).
 *
 * ⚠ Chỉ áp dụng cho mốc `1h`:
 *   - 3 trang × 100 bản ghi = 300 bản ghi ≈ **8 phút** dữ liệu thô — nhưng
 *     sau khi gom 1 phút/điểm thì vẫn đủ ~60 điểm cho cửa sổ 1 giờ, và mở
 *     Drawer **tức thì** (3 request, không nghẽn connection pool).
 *   - Các mốc dài **không** dùng nguồn raw nên ngân sách này không áp dụng.
 */
export const SENSOR_TIME_RANGE_MAX_PAGES: Record<
  SessionSensorTimeRange,
  number
> = {
  '1h': 3,
  '6h': 3,
  '12h': 3,
  '24h': 3,
}

/** Cửa sổ thời gian cố định của biểu đồ (epoch ms). */
export interface SessionTimeWindow {
  /** Đầu cửa sổ = `now - số giờ`. */
  start: number
  /** Cuối cửa sổ = `now`. */
  end: number
}

/**
 * Mốc **căn** cho cửa sổ — 15 phút.
 *
 * ⚠ Vì sao căn 15 phút (không phải "đúng now")?
 *   1. **BE giới hạn 24 giờ**: `environment-history` ném 400 nếu
 *      `to - from > 24h` ⇒ với mốc `24h`, cửa sổ phải **đúng** 24 giờ.
 *      Căn `end` về mốc 15 phút ⇒ `start = end - 24h` ⇒ chính xác 24 giờ.
 *   2. **Bucket của BE bắt đầu từ `from`** ⇒ căn `from` theo 15 phút ⇒ các
 *      bucket rơi đúng vào mốc tròn (:00, :15, :30, :45) ⇒ điểm dữ liệu khớp
 *      với nhãn trục hoành.
 *
 *   Đánh đổi: mép phải của biểu đồ lùi tối đa 15 phút so với "hiện tại" —
 *   không đáng kể với cửa sổ 1–24 giờ, và khớp với cách BE tự căn mốc cắt.
 */
const WINDOW_ALIGN_MS = 15 * 60_000

/**
 * Tính **cửa sổ thời gian cố định** của biểu đồ.
 *
 * ⚠ Trục hoành **luôn** trải đúng cửa sổ này, **không** co theo min/max của
 *   dữ liệu — nếu không, biểu đồ sẽ "co cụm" về vài chút cuối cùng (đúng lỗi
 *   đã gặp: chọn 6 giờ nhưng trục chỉ hiện 21:30–22:00).
 */
export function resolveTimeRangeWindow(
  range: SessionSensorTimeRange,
  now: Date = new Date(),
): SessionTimeWindow {
  const hours = RANGE_HOURS[range] ?? 1
  const end = Math.floor(now.getTime() / WINDOW_ALIGN_MS) * WINDOW_ALIGN_MS
  return { start: end - hours * 60 * 60 * 1000, end }
}

/**
 * Mốc bắt đầu (epoch ms) của khoảng thời gian (tính từ `now`).
 *
 * ⚠ Dùng cho **điều kiện dừng sớm** khi gom trang (xem
 *   `fetchAllSessionSensorReadings`).
 */
export function resolveTimeRangeStart(
  range: SessionSensorTimeRange,
  now: Date = new Date(),
): number | null {
  const hours = RANGE_HOURS[range]
  if (hours == null) return null
  return now.getTime() - hours * 60 * 60 * 1000
}

/**
 * Các mốc chia trục hoành — **trải đều** suốt cửa sổ.
 *
 * ⚠ 5 mốc cho mọi khoảng (`start`, `start + 1/4`, …, `end`):
 *   - Mốc 6 giờ lúc 22:00 ⇒ 16:00 · 17:30 · 19:00 · 20:30 · 22:00.
 *   - Trục **không** phụ thuộc dữ liệu thực có ⇒ vẫn đúng số mốc khi dữ liệu
 *     đang được nạp thêm.
 */
export function buildAxisTicks(
  range: SessionSensorTimeRange,
  now: Date = new Date(),
): number[] {
  const { start, end } = resolveTimeRangeWindow(range, now)
  const step = (end - start) / 4
  return Array.from({ length: 5 }, (_, index) => Math.round(start + step * index))
}

/**
 * Padding mép trục hoành (ms) — giữ điểm nằm **đúng** trên mép domain.
 *
 * ⚠ Bucket của BE bắt đầu ở mốc `:00`/`:15`/`:30`/`:45` ⇒ điểm đầu tiên
 *   rơi **đúng** vào `window.start` ⇒ nếu domain không nới, Recharts cắt mất
 *   một nửa điểm đó (và mép phải tương tự) ⇒ trục "mất" dữ liệu ở hai đầu.
 */
export const AXIS_DOMAIN_PADDING_MS = 60_000

/**
 * **Domain cố định** của trục hoành cho biểu đồ.
 *
 * ⚠ Luôn trả về `[now - range, now]` (có padding) **độc lập dữ liệu** ⇒ trục
 *   không bao giờ bị "co cụm" về vài phút cuối, kể cả khi dữ liệu đang tải.
 *
 * ⚠ Padding **không** áp dụng cho cửa sổ gọi API — BE giới hạn
 *   `to - from ≤ 24h` ⇒ cửa sổ fetch phải đúng 24 giờ (xem
 *   `resolveTimeRangeWindow`).
 */
export function resolveAxisDomain(
  range: SessionSensorTimeRange,
  now: Date = new Date(),
): [number, number] {
  const { start, end } = resolveTimeRangeWindow(range, now)
  return [start - AXIS_DOMAIN_PADDING_MS, end + AXIS_DOMAIN_PADDING_MS]
}

/**
 * Lọc các lần đo theo khoảng thời gian đã chọn.
 *
 * ⚠ Dùng `received_at` làm mốc chính (là thời điểm BE ghi nhận, luôn có mặt);
 *   `measured_at` chỉ là thời điểm cảm biến đo được.
 */
export function filterReadingsByTimeRange(
  readings: SessionSensorReading[],
  range: SessionSensorTimeRange,
  now: Date = new Date(),
): SessionSensorReading[] {
  const start = resolveTimeRangeStart(range, now)
  if (start === null) return readings

  const nowMs = now.getTime()
  return readings.filter((reading) => {
    const timestamp = Date.parse(
      reading.received_at ?? reading.measured_at ?? '',
    )
    if (!Number.isFinite(timestamp)) return false
    return timestamp >= start && timestamp <= nowMs
  })
}

/**
 * Một điểm đã chuẩn hoá cho biểu đồ — **shape chung** cho cả 2 nguồn.
 */
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
  /** Số mẫu đã gộp (chỉ có ý nghĩa với nguồn raw). */
  sampleCount: number
  /**
   * `true` = điểm đã được **BE** gộp sẵn (`environment-history`).
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

/** Epoch ms của **đầu nhóm** (giờ địa phương) chứa `timestamp`. */
function startOfBucket(timestamp: number, bucketMs: number): number {
  const date = new Date(timestamp)
  date.setSeconds(0, 0)
  /*
   * ⚠ Căn theo giờ (chia từ 00:00) để các nhóm luôn trùng nhau, không phụ
   *   thuộc vào bản ghi đầu tiên gặp được.
   */
  return Math.floor(date.getTime() / bucketMs) * bucketMs
}

/**
 * Gom các lần đo theo **nhóm thời gian** và tính trung bình nhiệt độ / độ ẩm.
 *
 * ⚠ Trung bình được tính **riêng cho từng chỉ số** (nhiệt độ / độ ẩm) chỉ trên
 *   các mẫu có giá trị hợp lệ ⇒ một nhóm thiếu độ ẩm vẫn cho nhiệt độ bình
 *   thường, và ngược lại.
 *
 * ⚠ `bucketMinutes` = kích thước nhóm (phút). Mốc thời gian của nhóm được
 *   **căn theo giờ** (mốc chia hết cho `bucketMinutes` tính từ 00:00) ⇒ các
 *   nhóm luôn trùng nhau giữa các lần render, không nhảy lung tung.
 *
 * @param bucketMinutes Kích thước nhóm (phút). `1` = gom từng phút.
 * @returns Các điểm **tăng dần theo thời gian** (đã sắp xếp).
 */
export function aggregateReadingsByBucket(
  readings: SessionSensorReading[],
  bucketMinutes = 1,
): SessionClimatePoint[] {
  const bucketMs = Math.max(1, Math.round(bucketMinutes)) * 60_000

  interface Accumulator {
    timestamp: number
    temperatureSum: number
    temperatureCount: number
    humiditySum: number
    humidityCount: number
    sampleCount: number
    floorIds: Set<number>
    floorLabels: Set<string>
  }

  const buckets = new Map<number, Accumulator>()

  for (const reading of readings) {
    const raw = Date.parse(reading.received_at ?? reading.measured_at ?? '')
    if (!Number.isFinite(raw)) continue

    const timestamp = startOfBucket(raw, bucketMs)
    let bucket = buckets.get(timestamp)
    if (!bucket) {
      bucket = {
        timestamp,
        temperatureSum: 0,
        temperatureCount: 0,
        humiditySum: 0,
        humidityCount: 0,
        sampleCount: 0,
        floorIds: new Set<number>(),
        floorLabels: new Set<string>(),
      }
      buckets.set(timestamp, bucket)
    }

    bucket.sampleCount += 1

    if (typeof reading.temperature === 'number') {
      bucket.temperatureSum += reading.temperature
      bucket.temperatureCount += 1
    }
    if (typeof reading.humidity === 'number') {
      bucket.humiditySum += reading.humidity
      bucket.humidityCount += 1
    }

    if (reading.floor_id != null) bucket.floorIds.add(reading.floor_id)
    const floorLabel =
      reading.floor_name ??
      (reading.floor_id != null ? `Tầng ${reading.floor_id}` : null)
    if (floorLabel) bucket.floorLabels.add(floorLabel)
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
      sampleCount: bucket.sampleCount,
      serverAggregated: false,
    }))
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
 * ⚠ Dùng cho nguồn `environment-history`: BE trả **một chuỗi riêng cho từng
 *   tầng** ⇒ ta gộp theo mốc thời gian để ra đường trung bình của phiên
 *   (đúng như hành vi của nguồn raw).
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
