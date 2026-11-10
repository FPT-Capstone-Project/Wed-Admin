import type {
  SessionDeviceEvent,
  SessionDeviceEventType,
} from '../types/session-device-activity.types'
import { extractDeviceClimate } from './session-device-climate.utils.ts'

/**
 * Gom nhật ký thiết bị (auto-control log) thành các **chu kỳ hoạt động**.
 *
 * ## Vì sao cần gom?
 *
 * ⚠ Hệ thống tưới phun tự động ghi **rất nhiều** dòng quyết định cho mỗi
 *   lần đánh giá (`DECISION`, `PULSE_RESERVED`, `RETRY_WAIT`…) ⇒ xem log thô
 *   sẽ thấy rác và khó theo dõi.
 *
 *   → Ta chỉ giữ các sự kiện **hành động** (`ON_REQUESTED` / `OFF_REQUESTED` /
 *     `OFF_CONFIRMED` / `MANUAL_OVERRIDE` / `FAULT`) và ghép mỗi cặp
 *     **Bật → Tắt** thành 1 chu kỳ.
 *
 * ⚨ **Quy tắc ghép**: mỗi `ON_REQUESTED` được ghép với sự kiện tắt **đầu tiên
 *   xảy ra ngay sau nó** trên **cùng tầng**. Các sự kiện tắt lặp thừa (cơ chế
 *   lặp an toàn của BE) bị bỏ qua.
 */

/** Kết quả gom chu kỳ — 1 dòng hiển thị trong bảng nhật ký. */
export interface SessionDeviceCycle {
  /** Khoá duy nhất của dòng (dùng cho `rowKey`). */
  id: string
  /** Tầng của chu kỳ. */
  floorId: number | null
  /** Nhãn hiển thị của tầng. */
  floorLabel: string
  /** Sự kiện mở đầu chu kỳ (thường là `ON_REQUESTED`). */
  onEvent: SessionDeviceEvent
  /** Sự kiện kết thúc chu kỳ — `null` nghĩa là **đang hoạt động**. */
  offEvent: SessionDeviceEvent | null
  /** Epoch ms lúc Bật. */
  startedAt: number | null
  /** Epoch ms lúc Tắt — `null` nghĩa là **đang hoạt động**. */
  endedAt: number | null
  /** Thời lượng chạy (ms) — `null` nếu chu kỳ đang hoạt động. */
  durationMs: number | null
  /** Chu kỳ đang chạy (chưa có sự kiện tắt). */
  isActive: boolean
  /** Chu kỳ có lỗi (`FAULT` hoặc tắt thủ công). */
  hasError: boolean
  /** Lý do / thông báo của chu kỳ. */
  reason: string | null
  /** Nhiệt độ trung bình lúc Bật (°C). */
  averageTemperature: number | null
  /** Độ ẩm trung bình lúc Bật (%RH). */
  averageHumidity: number | null
  /**
   * Nguồn của giá trị nhiệt độ / độ ẩm.
   *
   * - `aggregate`: từ cột `average_*` của BE.
   * - `snapshot`: tính lại từ `sensor_values_json`.
   * - `none`: không có dữ liệu.
   */
  climateSource: 'aggregate' | 'snapshot' | 'none'
}

/** Sự kiện **mở** chu kỳ. */
const ON_EVENTS: readonly SessionDeviceEventType[] = ['ON_REQUESTED']

/** Sự kiện **đóng** chu kỳ. */
const OFF_EVENTS: readonly SessionDeviceEventType[] = [
  'OFF_REQUESTED',
  'OFF_CONFIRMED',
]

/** Sự kiện **lỗi** — chu kỳ chứa sự kiện này thì bị coi là lỗi. */
const ERROR_EVENTS: readonly SessionDeviceEventType[] = ['FAULT']

/** Epoch ms của 1 sự kiện. */
function eventTimestamp(event: SessionDeviceEvent): number | null {
  const raw = Date.parse(event.created_at ?? '')
  return Number.isFinite(raw) ? raw : null
}

/**
 * Gom nhật ký thô thành các **chu kỳ hoạt động**.
 *
 * ⚠ Quy trình (áp dụng **cho từng tầng riêng biệt**):
 *   1. Sắp xếp sự kiện theo thời gian **tăng dần**.
 *   2. Duyệt: `ON_REQUESTED` ⇒ mở chu kỳ mới; `OFF_REQUESTED` /
 *      `OFF_CONFIRMED` ⇒ đóng chu kỳ đang mở **nếu có**, nếu không có chu kỳ
 *      đang mở ⇒ **bỏ qua** (đây chính là lệnh Tắt lặp thừa do cơ chế lặp an
 *      toàn).
 *
 * @param floorLabels Nhãn hiển thị của tầng — tra theo `floor_id`.
 * @returns Các chu kỳ **mới nhất trước** (sắp xếp giảm dần theo thời gian Bật).
 */
export function aggregateDeviceCycles(
  events: readonly SessionDeviceEvent[],
  floorLabels: ReadonlyMap<number, string> = new Map(),
): SessionDeviceCycle[] {
  /*
   * ⚠ Bước 1 — nhóm theo tầng. Dùng Map (giữ thứ tự chèn) + sort tại chỗ.
   */
  const groups = new Map<string, SessionDeviceEvent[]>()
  for (const event of events) {
    const key = String(event.floor_id ?? 'unknown')
    const bucket = groups.get(key)
    if (bucket) bucket.push(event)
    else groups.set(key, [event])
  }

  const cycles: SessionDeviceCycle[] = []

  for (const bucket of groups.values()) {
    const ordered = [...bucket].sort((left, right) => {
      const leftTime = eventTimestamp(left) ?? 0
      const rightTime = eventTimestamp(right) ?? 0
      if (leftTime !== rightTime) return leftTime - rightTime
      return (left.event_id ?? 0) - (right.event_id ?? 0)
    })

    let openCycle: SessionDeviceEvent | null = null

    for (const event of ordered) {
      if (event.event_type && ON_EVENTS.includes(event.event_type)) {
        /*
         * ⚠ `ON_REQUESTED` khi đang có chu kỳ mở ⇒ chu kỳ cũ **không có Tắt**
         *   ⇒ coi như đã kết thúc (thiết bị bật lại). Đóng nó lại để không mất
         *   dữ liệu.
         */
        if (openCycle) {
          cycles.push(buildCycle(openCycle, null, floorLabels))
        }
        openCycle = event
        continue
      }

      if (event.event_type && OFF_EVENTS.includes(event.event_type)) {
        if (openCycle) {
          cycles.push(buildCycle(openCycle, event, floorLabels))
          openCycle = null
        }
        /*
         * ⚠ Sự kiện tắt mà không có chu kỳ đang mở ⇒ **lệnh Tắt lặp thừa**
         *   (failsafe) ⇒ BỎ QUA hoàn toàn.
         */
        continue
      }

      if (event.event_type && ERROR_EVENTS.includes(event.event_type)) {
        /*
         * ⚠ `FAULT` (lỗi thiết bị) ⇒ đóng chu kỳ đang chạy với cờ lỗi.
         *   Nếu không có chu kỳ nào đang chạy ⇒ bỏ qua (lỗi xảy ra ngoài
         *   chu kỳ tưới).
         */
        if (openCycle) {
          cycles.push(buildCycle(openCycle, event, floorLabels))
          openCycle = null
        }
        continue
      }
    }

    // Chu kỳ vẫn đang mở ⇒ thiết bị đang hoạt động.
    if (openCycle) cycles.push(buildCycle(openCycle, null, floorLabels))
  }

  // Mới nhất trước — dễ đọc nhật ký.
  return cycles.sort((left, right) => {
    const leftTime = left.startedAt ?? 0
    const rightTime = right.startedAt ?? 0
    return rightTime - leftTime
  })
}

/** Dựng 1 chu kỳ từ sự kiện mở (và sự kiện đóng nếu có). */
function buildCycle(
  onEvent: SessionDeviceEvent,
  offEvent: SessionDeviceEvent | null,
  floorLabels: ReadonlyMap<number, string>,
): SessionDeviceCycle {
  const floorId = onEvent.floor_id
  const startedAt = eventTimestamp(onEvent)
  const endedAt = offEvent ? eventTimestamp(offEvent) : null

  const durationMs =
    startedAt != null && endedAt != null && endedAt >= startedAt
      ? endedAt - startedAt
      : null

  const hasError = [onEvent, offEvent].some((event) =>
    event?.event_type && ERROR_EVENTS.includes(event.event_type),
  )

  /*
   * ⚠ Nhiệt độ / độ ẩm: ưu tiên cột `average_*` của BE, fallback tính lại từ
   *   snapshot cảm biến (cột nhiệt độ chỉ có từ migration 012).
   */
  const climate = extractDeviceClimate(onEvent)

  return {
    id:
      onEvent.command_id ??
      `cycle-${onEvent.created_at ?? ''}-${floorId ?? ''}-${onEvent.event_id ?? ''}`,
    floorId,
    floorLabel:
      floorId != null
        ? (floorLabels.get(floorId) ?? `Tầng ${floorId}`)
        : '—',
    onEvent,
    offEvent,
    startedAt,
    endedAt,
    durationMs,
    isActive: offEvent === null,
    hasError,
    reason: onEvent.reason ?? offEvent?.reason ?? null,
    averageTemperature: climate.temperature,
    averageHumidity: climate.humidity,
    climateSource: climate.source,
  }
}

/**
 * Định dạng thời lượng chạy cho dễ đọc.
 *
 * ⚠ Trả `null` khi chưa có thời lượng (chu kỳ đang hoạt động).
 */
export function formatCycleDuration(durationMs: number | null): string | null {
  if (durationMs == null) return null
  if (durationMs < 0) return null

  const seconds = Math.floor(durationMs / 1000)
  if (seconds < 60) return `${seconds} giây`

  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60
  if (minutes < 60) {
    return restSeconds > 0
      ? `${minutes} phút ${restSeconds} giây`
      : `${minutes} phút`
  }

  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours < 24) {
    return restMinutes > 0
      ? `${hours} giờ ${restMinutes} phút`
      : `${hours} giờ`
  }

  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours > 0 ? `${days} ngày ${restHours} giờ` : `${days} ngày`
}
