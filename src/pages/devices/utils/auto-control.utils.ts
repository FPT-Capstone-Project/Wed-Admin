/**
 * Helpers hiển thị cho **tưới phun sương tự động** — chỉ đọc.
 *
 * ⚠ Admin web KHÔNG được sửa cấu hình (xem `features/auth/permissions.ts` —
 * `iot.automation.manage` thuộc về staff trên mobile app). Mọi hàm ở đây
 * chỉ **định dạng** dữ liệu BE trả về để hiển thị:
 *   - không gửi lệnh tới thiết bị,
 *   - không tính toán lại ngưỡng,
 *   - không đề xuất thay đổi.
 *
 * Nguồn dữ liệu:
 *   - `GET /api/iot/floors/{floorId}/auto-control` → cấu hình + chế độ
 *   - `GET /api/iot/floors/{floorId}/auto-control/logs` → nhật ký kích hoạt
 */

import type {
  AutoControlConfigRecord,
  AutoControlLogEntry,
  AutoControlLogSensor,
} from '../../../types/iot'

// ─── Định dạng cơ bản ───────────────────────────────────────────────────

/** Định dạng mốc thời gian theo chuẩn Việt Nam. */
export function formatDateTime(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

/**
 * Định dạng mốc thời gian dạng `DD/MM/YYYY HH:mm:ss` — dùng cho bảng
 * nhật ký kích hoạt (cột "Thời gian chạy").
 *
 * ⚴ Khác `formatDateTime` (dùng `toLocaleString('vi-VN')` → `HH:mm:ss DD/MM/YYYY`),
 * hàm này trả về đúng thứ tự ngày-tháng-năm trước để cột thời gian
 * dễ đọc và **luôn có giây** (đủ để tra cứu sự kiện theo thời điểm).
 */
export function formatLogDateTime(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const pad = (n: number) => String(n).padStart(2, '0')
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Định dạng số mili-giây thành thời lượng dễ đọc.
 *
 * VD: `45000` → `45 giây`, `300000` → `5 phút`, `7200000` → `2 giờ`.
 */
export function formatDurationMs(
  ms: number | null | undefined,
): string | null {
  if (ms === null || ms === undefined) return null
  if (!Number.isFinite(ms) || ms < 0) return null
  if (ms < 1000) return `${Math.round(ms)} mili giây`
  if (ms < 60_000) return `${Math.round(ms / 1000)} giây`
  if (ms < 3_600_000) {
    const minutes = ms / 60_000
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} phút`
  }
  const hours = ms / 3_600_000
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} giờ`
}

/** Định dạng phần trăm — luôn giữ 1 chữ số thập phân tối đa. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—'
  }
  return `${Number(value.toFixed(1))}%`
}

// ─── Cấu hình tự động ───────────────────────────────────────────────────

/**
 * Điều kiện kích hoạt — mô tả ngắn để Admin nhìn thấy ngay trong bảng.
 *
 * Hệ thống bật tưới khi độ ẩm trung bình **xuống dưới** `humidity_start_threshold`
 * và ngừng khi độ ẩm **vượt** `humidity_stop_threshold` (hysteresis).
 *
 * @returns chuỗi mô tả, hoặc `null` khi tầng chưa có cấu hình.
 */
export function formatTriggerCondition(
  config: AutoControlConfigRecord | null | undefined,
): string | null {
  if (!config) return null
  const start = config.humidity_start_threshold
  if (typeof start !== 'number' || !Number.isFinite(start)) return null
  return `Độ ẩm < ${formatPercent(start)}`
}

/** Ngưỡng ngừng tưới — `humidity_stop_threshold`. */
export function formatStopCondition(
  config: AutoControlConfigRecord | null | undefined,
): string | null {
  if (!config) return null
  const stop = config.humidity_stop_threshold
  if (typeof stop !== 'number' || !Number.isFinite(stop)) return null
  return `Độ ẩm ≥ ${formatPercent(stop)}`
}

/** Khoảng độ ẩm được phép — `humidity_min` … `humidity_max`. */
export function formatHumidityRange(
  config: AutoControlConfigRecord | null | undefined,
): string | null {
  if (!config) return null
  const min = config.humidity_min
  const max = config.humidity_max
  if (typeof min !== 'number' || typeof max !== 'number') return null
  return `${formatPercent(min)} – ${formatPercent(max)}`
}

/**
 * Quy tắc điều khiển đang áp dụng — mô tả bằng lời từ `config_source`.
 *
 * - `FLOOR` → ngưỡng suy ra từ các phiên trồng đang gán cho tầng.
 * - `LEGACY` → ngưỡng gắn với một loại nấm cụ thể.
 */
export function formatControlRule(
  config: AutoControlConfigRecord | null | undefined,
): string {
  if (!config) return 'Chưa có cấu hình tự động'
  if (config.config_source === 'FLOOR') {
    return 'Tự động theo bộ ngưỡng chung của tầng (FLOOR)'
  }
  return 'Tự động theo loại nấm đã chọn (LEGACY)'
}

/** Tên bộ ngưỡng đã duyệt — `profile_name`. */
export function formatProfileName(
  config: AutoControlConfigRecord | null | undefined,
): string | null {
  const name = config?.profile_name?.trim()
  return name ? name : null
}

// ─── Nhật ký kích hoạt ──────────────────────────────────────────────────

/** Trạng thái rút gọn của một dòng nhật ký. */
export type AutoControlLogStatus = 'success' | 'failure'

/**
 * Sự kiện BE ghi khi **không** kích hoạt được:
 *   - `FAULT` → hệ thống tự dừng vì điều kiện an toàn không thoả.
 *   - `OFF_FAILED` → không đóng được rơ-le.
 *   - `RETRY_WAIT` → cảm biến lỗi / thiết bị offline → tạm dừng hành động.
 */
const FAILED_EVENT_TYPES = new Set(['FAULT', 'OFF_FAILED', 'RETRY_WAIT'])

/**
 * Sự kiện chỉ **ghi nhận quyết định** — KHÔNG phải lỗi.
 *
 * ⚠ `DECISION` là bản ghi "hệ thống đã đánh giá và quyết định X", có thể
 * là quyết định **không tưới** (vd độ ẩm đã đạt ngưỡng dừng). Không phải
 * lỗi, nên vẫn xếp "thành công" — nhưng nhãn phải nói rõ là quyết định
 * chứ không phải "đã tưới". Xem `formatEventType`.
 */
export const AUTO_CONTROL_EVENT_LABELS: Readonly<Record<string, string>> = {
  DECISION: 'Quyết định tưới',
  START: 'Bắt đầu phiên tự động',
  STOP: 'Dừng phiên tự động',
  ON_REQUESTED: 'Yêu cầu mở van tưới',
  OFF_REQUESTED: 'Yêu cầu đóng van tưới',
  PULSE_RESERVED: 'Phun sương',
  OFF_CONFIRMED: 'Đã đóng van tưới',
  RETRY_WAIT: 'Tạm dừng — chờ thử lại',
  CONFIG_SAVED: 'Lưu cấu hình',
  FAULT: 'Lỗi hệ thống',
  MANUAL_OVERRIDE: 'Nhân viên ngắt tưới',
}

/**
 * Kết quả thực tế của một dòng nhật ký — điều hệ thống **đã làm**,
 * không phải chỉ là "đã đánh giá".
 */
export type AutoControlLogOutcome =
  | 'misted' // đã phun sương thật
  | 'skipped' // đánh giá nhưng KHÔNG tưới (điều kiện không thoả)
  | 'started' // bắt đầu phiên tự động
  | 'stopped' // dừng phiên tự động
  | 'waiting' // tạm dừng, chờ thử lại
  | 'failed' // lỗi hệ thống
  | 'info' // sự kiện thông tin (lưu cấu hình, ngắt tưới thủ công)

/**
 * Phân loại kết quả thực tế của một dòng nhật ký.
 *
 * ⚠ **Vì sao cần?**
 *
 * Sự kiện `DECISION` của BE được ghi cho **MỌI** lần đánh giá — kể cả khi
 * kết luận là KHÔNG tưới. Nhãn "Quyết định tưới" khiến người đọc tưởng rằng
 * hệ thống đã phun nước. Ví dụ thực tế:
 *
 *   - Cấu hình: `humidity_start_threshold = 82`, `humidity_stop_threshold = 85`
 *   - Sự kiện: `DECISION`, `average_humidity = 83`
 *
 * → 83% **nằm trong vùng hysteresis** (82 ≤ 83 < 85) ⇒ hệ thống giữ
 *   trạng thái hiện tại (không tưới, không dừng). Đây là hành vi **đúng**
 *   của thuật toán, nhưng UI phải nói rõ "không tưới" thay vì "quyết định
 *   tưới" để không gây hoang mang.
 *
 * Logic phía BE (xem `Backend/src/services/autoMisting.algorithm.js` — `decide()`):
 *   - `humidity <  humidity_start_threshold` → `demand = true`  (muốn tưới)
 *   - `humidity >= humidity_stop_threshold`  → `demand = false` (không tưới)
 *   - `start < humidity < stop`              → giữ nguyên `runtime.demand`
 *                                              (vùng hysteresis)
 *
 * @param log Dòng nhật ký.
 */
export function resolveLogOutcome(
  log: AutoControlLogEntry | null | undefined,
): AutoControlLogOutcome {
  if (!log) return 'info'

  const eventType = log.event_type?.toUpperCase() ?? ''

  switch (eventType) {
    case 'PULSE_RESERVED':
    case 'ON_REQUESTED':
      return 'misted'

    case 'START':
      return 'started'

    case 'STOP':
    case 'OFF_REQUESTED':
    case 'OFF_CONFIRMED':
      return 'stopped'

    case 'RETRY_WAIT':
      return 'waiting'

    case 'FAULT':
    case 'OFF_FAILED':
      return 'failed'

    case 'DECISION':
      // Có mở van không? `ON_REQUESTED`/`PULSE_RESERVED` là sự kiện riêng,
      // nên `DECISION` **luôn** là lần đánh giá không mở van.
      return 'skipped'

    default:
      return 'info'
  }
}

/**
 * Phân loại trạng thái một dòng nhật ký (thành công / thất bại).
 *
 * @param eventType Loại sự kiện BE ghi.
 */
export function resolveLogStatus(
  eventType: string | null | undefined,
): AutoControlLogStatus {
  if (!eventType) return 'success'
  return FAILED_EVENT_TYPES.has(eventType.toUpperCase()) ? 'failure' : 'success'
}

/**
 * Nhãn tiếng Việt của loại sự kiện (fallback = chính giá trị gốc).
 *
 * ⚠ `DECISION` = "hệ thống đã đánh giá", KHÔNG phải "đã tưới". Nhãn cũ
 * "Quyết định tưới" gây hiểu nhầm là đã phun nước — trong khi thực tế sự
 * kiện này được ghi cho **mọi** lần đánh giá, kể cả khi kết luận là KHÔNG
 * tưới (độ ẩm đã đạt ngưỡng dừng, hết ngân sách giờ, đang nghỉ cooldown…).
 *
 * → Đổi thành "Đánh giá điều kiện" để phản ánh đúng bản chất. Lý do cụ
 * thể nằm ở cột "Lý do / Ghi chú" (`reason`) — BE trả sẵn.
 */
export function formatEventType(eventType: string | null | undefined): string {
  if (!eventType) return '—'
  const key = eventType.toUpperCase()
  if (key === 'DECISION') return 'Đánh giá điều kiện'
  return AUTO_CONTROL_EVENT_LABELS[key] ?? eventType
}

/**
 * Thời lượng thực thi của một dòng nhật ký — đọc đúng trường API trả về.
 *
 * ## Nguồn dữ liệu
 *
 * Bảng `iot_auto_control_logs` (migration 005 + 007) **không có** cột
 * `duration_ms`. Các cột thời gian thực sự tồn tại:
 *
 * | Cột                | Ý nghĩa                                        |
 * | ------------------ | ---------------------------------------------- |
 * | `reserved_on_ms`   | Thời lượng xung phun **đã giữ trong giờ** (ms)   |
 * | `misting_pulse_ms` | Thời lượng xung phun **cấu hình** của tầng (ms) |
 *
 * BE chỉ ghi `reserved_on_ms > 0` cho sự kiện `PULSE_RESERVED`; mọi sự
 * kiện khác nhận `0` (default cột). Vì vậy hiển thị `reserved_on_ms` cho
 * mọi dòng ⇒ tất cả đều ra "0 mili giây" ⇒ vô nghĩa.
 *
 * → Thứ tự đọc:
 *   1. `duration_ms` / `pulse_duration` / `execution_ms` — cột thời lượng
 *      thực thi nếu BE bổ sung sau này (BE trả `SELECT *` nên FE tự nhận).
 *   2. `reserved_on_ms` — chỉ dùng cho `PULSE_RESERVED` (xung phun thật).
 *   3. `null` — các sự kiện không có thời lượng riêng (quyết định, cấu
 *      hình, bắt đầu/dừng phiên…) ⇒ UI hiển thị "—".
 *
 * @param log Dòng nhật ký.
 * @param fallbackPulseMs `misting_pulse_ms` của cấu hình tầng — dùng làm
 *   fallback cho sự kiện `PULSE_RESERVED` khi BE không ghi `reserved_on_ms`.
 */
export function formatLogDuration(
  log: AutoControlLogEntry | null | undefined,
  fallbackPulseMs?: number | null,
): string | null {
  if (!log) return null

  // 1. Cột thời lượng thực thi (nếu BE đã bổ sung).
  const explicit = [log.duration_ms, log.pulse_duration, log.execution_ms].find(
    (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
  )
  if (explicit !== undefined) return formatDurationMs(explicit)

  // 2. Thời lượng xung phun thật — chỉ có nghĩa cho `PULSE_RESERVED`.
  const isPulse = log.event_type?.toUpperCase() === 'PULSE_RESERVED'
  if (isPulse) {
    const reserved = log.reserved_on_ms
    if (typeof reserved === 'number' && Number.isFinite(reserved) && reserved > 0) {
      return formatDurationMs(reserved)
    }
    // BE ghi 0 (dry-run không reserve) → dùng thời lượng cấu hình.
    return formatDurationMs(fallbackPulseMs)
  }

  // 3. Sự kiện không có thời lượng riêng.
  return null
}

/**
 * Các cụm cảm biến có dữ liệu tại thời điểm ghi nhật ký.
 *
 * `sensor_values_json` là mảng sensor do BE `aggregate()` dựng
 * (xem `autoMisting.algorithm.js`) — mỗi phần tử có `node_address`.
 */
export function extractLogNodeAddresses(
  log: AutoControlLogEntry | null | undefined,
): number[] {
  const raw = log?.sensor_values_json
  const list: AutoControlLogSensor[] = Array.isArray(raw) ? raw : []
  const nodes = new Set<number>()
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const node = item.node_address
    if (typeof node === 'number' && Number.isFinite(node)) nodes.add(node)
  }
  return [...nodes].sort((a, b) => a - b)
}

/**
 * Ngưỡng đang áp dụng tại thời điểm ghi nhận ký.
 *
 * BE lưu `thresholds_snapshot_json` = `config_snapshot` của run (JSONB), nên
 * đây chính là cấu hình tại thời điểm sự kiện xảy ra — không phải cấu
 * hình hiện tại (cấu hình có thể đã đổi sau đó).
 */
export function extractLogThresholds(
  log: AutoControlLogEntry | null | undefined,
): Record<string, unknown> | null {
  const raw = log?.thresholds_snapshot_json
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return null
}

/**
 * Giải thích vì sao hệ thống **không** tưới ở một sự kiện `DECISION`.
 *
 * ⚠ Câu hỏi thường gặp: *"Độ ẩm đã 83% mà ngưỡng là < 82%, sao vẫn ghi
 * nhận sự kiện?"*
 *
 * Trả lời: `DECISION` được ghi cho **mọi** lần đánh giá, không phải lúc
 * phun nước. Thuật toán dùng **hysteresis** (2 ngưỡng):
 *
 * ```text
 *   humidity <  start (82%)  →  demand = true   (tưới)
 *   humidity >= stop  (85%)  →  demand = false  (dừng)
 *   start <= humidity < stop →  GIỮ demand cũ   (vùng chết)
 * ```
 *
 * Ở 83% ⇒ nằm trong vùng chết (82 ≤ 83 < 85) ⇒ hệ thống **giữ** trạng
 * thái trước đó. Nếu trước đó đang tưới thì vẫn tưới tiếp (đó là mục
 * đích của hysteresis: tránh dao động); nếu đang nghỉ thì vẫn nghỉ.
 *
 * → Dùng hàm này để hiển thị lý do cụ thể cho Admin thay vì để họ tự đoán.
 *
 * @param log Dòng nhật ký.
 * @returns Mô tả lý do, hoặc `null` nếu không đủ dữ liệu để kết luận.
 */
export function explainSkippedDecision(
  log: AutoControlLogEntry | null | undefined,
): string | null {
  if (!log) return null
  if (log.event_type?.toUpperCase() !== 'DECISION') return null

  const humidity = log.average_humidity
  if (typeof humidity !== 'number' || !Number.isFinite(humidity)) return null

  const thresholds = extractLogThresholds(log)
  const start = thresholds?.humidity_start_threshold
  const stop = thresholds?.humidity_stop_threshold
  const max = thresholds?.humidity_max

  const hasStart = typeof start === 'number' && Number.isFinite(start)
  const hasStop = typeof stop === 'number' && Number.isFinite(stop)

  if (hasStart && hasStop) {
    if (humidity >= start && humidity < stop) {
      return `Độ ẩm ${formatPercent(humidity)} nằm trong vùng giữ (${formatPercent(start)} – ${formatPercent(stop)}) → giữ trạng thái hiện tại, không tưới mới.`
    }
    if (humidity >= stop) {
      return `Độ ẩm ${formatPercent(humidity)} ≥ ngưỡng dừng ${formatPercent(stop)} → không tưới.`
    }
    if (humidity < start) {
      return `Độ ẩm ${formatPercent(humidity)} < ngưỡng bắt đầu ${formatPercent(start)} → đủ điều kiện tưới (xem sự kiện phun sương).`
    }
  }

  if (typeof max === 'number' && Number.isFinite(max) && humidity >= max) {
    return `Độ ẩm ${formatPercent(humidity)} ≥ trần cho phép ${formatPercent(max)} → không tưới.`
  }

  return null
}

/**
 * Danh sách cụm cảm biến dạng văn bản — `Cụm 2, Cụm 5`.
 *
 * ⚠ Chỉ một số loại sự kiện có `sensor_values_json` (BE chỉ ghi snapshot
 * cảm biến cho `DECISION`, `PULSE_RESERVED`, `FAULT`). Với các sự kiện còn
 * lại (ví dụ `ON_REQUESTED`), ta fallback về cụm cảm biến của tầng — vì
 * tầng chỉ có đúng một cụm RS485 phục vụ.
 *
 * @param fallbackNodeAddress `node_address` của tầng (dùng khi log không có snapshot).
 */
export function formatLogSensors(
  log: AutoControlLogEntry | null | undefined,
  fallbackNodeAddress?: number | null,
): string {
  const nodes = extractLogNodeAddresses(log)
  if (nodes.length > 0) {
    return nodes.map((node) => `Cụm ${node}`).join(', ')
  }
  if (
    typeof fallbackNodeAddress === 'number' &&
    Number.isFinite(fallbackNodeAddress)
  ) {
    return `Cụm ${fallbackNodeAddress}`
  }
  return '—'
}

/**
 * Giá trị đo tại thời điểm kích hoạt — độ ẩm + nhiệt độ trung bình.
 */
export function formatLogMeasurements(
  log: AutoControlLogEntry | null | undefined,
): string {
  const humidity = log?.average_humidity
  const temperature = log?.average_temperature
  const parts: string[] = []

  if (typeof humidity === 'number' && Number.isFinite(humidity)) {
    parts.push(`Độ ẩm ${formatPercent(humidity)}`)
  }
  if (typeof temperature === 'number' && Number.isFinite(temperature)) {
    parts.push(`Nhiệt độ ${Number(temperature.toFixed(1))}°C`)
  }
  return parts.length > 0 ? parts.join(' · ') : '—'
}
