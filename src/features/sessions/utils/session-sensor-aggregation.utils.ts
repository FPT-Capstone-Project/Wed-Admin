/**
 * Cửa sổ thời gian & trục hoành cho biểu đồ cảm biến của phiên canh tác.
 *
 * ⚠ **Nguồn dữ liệu duy nhất**: `GET /api/environment-history/sessions/{sessionId}`
 *   (đã gộp sẵn **10 phút/tầng** bởi BE).
 *
 * ## Vì sao bỏ hẳn "2 nguồn" (raw + server-aggregate)?
 *
 * ⚠ Endpoint cũ `/api/cultivation-sessions/admin/{sessionId}/iot-history/sensors`
 *   đã bị BE **gỡ bỏ** (404) ⇒ không còn nguồn raw theo cảm biến.
 *   ⇒ Mọi mốc thời gian (1h/6h/12h/24h) đều dùng **cùng 1 nguồn**, chỉ khác
 *   cửa sổ `from`/`to` truyền vào ⇒ đơn giản và đồng nhất.
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
 * Kích thước nhóm của BE — **10 phút**.
 *
 * ⚠ BE gộp sẵn theo `date_bin(INTERVAL '10 minutes', …)` ⇒ mọi bản ghi đều
 *   nằm trên mốc tròn 10 phút ⇒ biểu đồ vẽ thẳng, không cần gom lại ở FE.
 *
 * ⚠ Dùng để **hiển thị** đúng trong tooltip (không nói "trung bình theo phút"
 *   khi thực tế là 10 phút).
 */
export const ENVIRONMENT_HISTORY_BUCKET_MINUTES = 10

/**
 * Mốc dùng nguồn dữ liệu **đã gộp sẵn** của BE.
 *
 * ⚠ Hiện tại **mọi** mốc đều dùng nguồn gộp sẵn (chỉ còn 1 nguồn).
 */
export const SENSOR_TIME_RANGE_USES_SERVER_AGGREGATE: Record<
  SessionSensorTimeRange,
  boolean
> = {
  '1h': true,
  '6h': true,
  '12h': true,
  '24h': true,
}

/** Cửa sổ thời gian cố định của biểu đồ (epoch ms). */
export interface SessionTimeWindow {
  /** Đầu cửa sổ = `now - số giờ`. */
  start: number
  /** Cuối cửa sổ = `now`. */
  end: number
}

/**
 * Mốc **căn** cho cửa sổ — 10 phút.
 *
 * ⚠ Vì sao căn 10 phút (không phải "đúng now")?
 *   Bucket của BE được căn theo `date_bin(INTERVAL '10 minutes', …, '2000-01-01')`
 *   ⇒ các mốc là :00, :10, :20, :30, :40, :50.
 *   Căn `end` về mốc 10 phút gần nhất ⇒ `start = end - số giờ` ⇒ cửa sổ khớp
 *   đúng với các bucket BE sinh ra ⇒ không mất điểm ở hai đầu.
 */
const WINDOW_ALIGN_MS = 10 * 60_000

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
  anchorEnd?: number | null,
): SessionTimeWindow {
  const hours = RANGE_HOURS[range] ?? 1
  /*
   * ⚠ **Mốc neo** — khi có (phiên đã kết thúc), cửa sổ neo về cuối phiên
   *   thay vì `now`.
   *
   *   Căn (floor) theo 10 phút ⇒ khớp bucket BE. Bucket cuối cùng có
   *   `period_start = anchor - 10 phút` ⇒ vẫn **nằm trong** cửa sổ
   *   (điều kiện BE: `period_start >= from AND period_start < to`).
   */
  const reference =
    anchorEnd != null && Number.isFinite(anchorEnd)
      ? anchorEnd
      : now.getTime()
  const end = Math.floor(reference / WINDOW_ALIGN_MS) * WINDOW_ALIGN_MS
  return { start: end - hours * 60 * 60 * 1000, end }
}

/**
 * Tính **mốc neo** của biểu đồ cho một phiên canh tác.
 *
 * ⚠ **Vì sao cần?**
 *   Phiên **đã kết thúc** (COMPLETED / CANCELLED) có dữ liệu nằm trong quá
 *   khứ. Nếu vẫn tính cửa sổ từ `now` ⇒ mở drawer vài ngày sau sẽ thấy
 *   biểu đồ **trống trơn** (dữ liệu nằm ngoài cửa sổ).
 *
 *   → Ta neo cửa sổ về **cuối dữ liệu của phiên**:
 *     1. `period_end` / `period_start` của bản ghi **mới nhất** (chính xác
 *        nhất — nơi dữ liệu thực sự dừng lại).
 *     2. `session.end_date` (khi không có bản ghi nào, ví dụ phiên bị huỷ
 *        sớm).
 *     3. `null` ⇒ dùng `now` (phiên đang chạy).
 *
 * @param sessionEnded Phiên đã kết thúc hay chưa.
 * @param sessionEnd `end_date` của phiên (ISO 8601).
 * @param latestRecord Bản ghi môi trường mới nhất (nếu đã tải).
 * @returns Epoch ms của mốc neo, hoặc `null` nếu dùng `now`.
 */
export function resolveSessionChartAnchor({
  sessionEnded,
  sessionEnd,
  latestRecord,
}: {
  sessionEnded: boolean
  sessionEnd?: string | null
  latestRecord?: {
    period_end?: string | null
    period_start?: string | null
  } | null
}): number | null {
  // ⚠ Phiên **đang chạy** ⇒ luôn neo vào `now`.
  if (!sessionEnded) return null

  // 1) Bản ghi mới nhất — nơi dữ liệu thực sự dừng lại.
  const lastRecord = latestRecord?.period_end ?? latestRecord?.period_start
  if (lastRecord) {
    const parsed = Date.parse(lastRecord)
    if (Number.isFinite(parsed)) return parsed
  }

  // 2) Ngày kết thúc của phiên.
  if (sessionEnd) {
    const parsed = Date.parse(sessionEnd)
    if (Number.isFinite(parsed)) return parsed
  }

  return null
}

/**
 * Mốc bắt đầu (epoch ms) của khoảng thời gian (tính từ `now`).
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
  anchorEnd?: number | null,
): number[] {
  const { start, end } = resolveTimeRangeWindow(range, now, anchorEnd)
  const step = (end - start) / 4
  return Array.from({ length: 5 }, (_, index) => Math.round(start + step * index))
}

/**
 * Padding mép trục hoành (ms) — giữ điểm nằm **đúng** trên mép domain.
 *
 * ⚠ Bucket của BE bắt đầu ở mốc tròn 10 phút ⇒ điểm đầu tiên rơi **đúng**
 *   vào `window.start` ⇒ nếu domain không nới, Recharts cắt mất một nửa điểm
 *   đó (và mép phải tương tự) ⇒ trục "mất" dữ liệu ở hai đầu.
 */
export const AXIS_DOMAIN_PADDING_MS = 60_000

/**
 * **Domain cố định** của trục hoành cho biểu đồ.
 *
 * ⚠ Luôn trả về `[now - range, now]` (có padding) **độc lập dữ liệu** ⇒ trục
 *   không bao giờ bị "co cụm" về vài phút cuối, kể cả khi dữ liệu đang tải.
 *
 * ⚠ Padding **không** áp dụng cho cửa sổ gọi API — cửa sổ fetch phải đúng
 *   số giờ đã chọn (xem `resolveTimeRangeWindow`).
 */
export function resolveAxisDomain(
  range: SessionSensorTimeRange,
  now: Date = new Date(),
  anchorEnd?: number | null,
): [number, number] {
  const { start, end } = resolveTimeRangeWindow(range, now, anchorEnd)
  return [start - AXIS_DOMAIN_PADDING_MS, end + AXIS_DOMAIN_PADDING_MS]
}
