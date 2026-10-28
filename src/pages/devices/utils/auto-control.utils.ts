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

/** Phân loại trạng thái một dòng nhật ký (thành công / thất bại). */
export function resolveLogStatus(
  eventType: string | null | undefined,
): AutoControlLogStatus {
  if (!eventType) return 'success'
  return FAILED_EVENT_TYPES.has(eventType.toUpperCase()) ? 'failure' : 'success'
}

/** Nhãn tiếng Việt của loại sự kiện BE ghi trong nhật ký. */
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

/** Nhãn tiếng Việt của loại sự kiện (fallback = chính giá trị gốc). */
export function formatEventType(eventType: string | null | undefined): string {
  if (!eventType) return '—'
  return AUTO_CONTROL_EVENT_LABELS[eventType.toUpperCase()] ?? eventType
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
