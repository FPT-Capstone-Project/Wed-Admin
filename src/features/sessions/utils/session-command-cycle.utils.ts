import type {
  SessionDeviceCommand,
  SessionDeviceType,
} from '../types/session-iot-history.types'

/**
 * Gom chu kỳ hoạt động của thiết bị IoT từ nhật ký lệnh thô.
 *
 * ## Vì sao cần gom chu kỳ?
 *
 * ⚠ Cơ chế **lặp an toàn** của BE phát nhiều lệnh `Tắt` liên tiếp cho cùng 1
 *   kênh (Bật → Tắt → Tắt → Tắt…) để đảm bảo rơ-le thật sự tắt. Xem **log lệnh
 *   thô** sẽ thấy rác và rất khó theo dõi.
 *
 *   → Ta gom mỗi cặp **Bật → Tắt đầu tiên** thành **1 chu kỳ** và bỏ qua các
 *     lệnh `Tắt` lặp thừa. Lệnh `Bật` chưa có `Tắt` đi kèm ⇒ chu kỳ đang
 *     **"Đang hoạt động"**.
 *
 * ⚨ **Quy tắc ghép**: mỗi lệnh `Bật` được ghép với lệnh `Tắt` **đầu tiên xảy
 *   ra ngay sau nó** trên **cùng thiết bị + kênh**. Các lệnh `Tắt` lặp sau đó
 *   bị bỏ qua cho tới khi có lệnh `Bật` mới.
 */

/** Kết quả gom chu kỳ — 1 dòng hiển thị trong bảng nhật ký. */
export interface SessionCommandCycle {
  /** Khoá duy nhất của dòng (dùng cho `rowKey`). */
  id: string
  /** Loại thiết bị của chu kỳ (suy ra từ tầng mà lệnh Bật áp dụng). */
  deviceType: SessionDeviceType | null
  /** Tên thiết bị (vd `Hệ thống phun sương`). */
  deviceName: string
  /** Kênh SSR của chu kỳ. */
  channel: number | null
  /** Master điều khiển. */
  masterId: string | null
  /** Các tầng mà chu kỳ này áp dụng (từ lệnh Bật). */
  floors: SessionDeviceCommand['floors']
  /** Lệnh Bật mở đầu chu kỳ. */
  onCommand: SessionDeviceCommand
  /** Lệnh Tắt kết thúc chu kỳ — `null` nghĩa là **đang hoạt động**. */
  offCommand: SessionDeviceCommand | null
  /** Epoch ms lúc Bật. */
  startedAt: number | null
  /** Epoch ms lúc Tắt — `null` nghĩa là **đang hoạt động**. */
  endedAt: number | null
  /** Thời lượng chạy (ms) — `null` nếu chu kỳ đang hoạt động. */
  durationMs: number | null
  /** Chu kỳ đang chạy (chưa có lệnh Tắt). */
  isActive: boolean
  /** Chu kỳ có lỗi (lệnh Bật hoặc Tắt thất bại / quá hạn). */
  hasError: boolean
  /** Người yêu cầu lệnh Bật. */
  requestedBy: number | null
  /** Thông báo lỗi (nếu có). */
  errorMessage: string | null
}

/** Tên thiết bị hiển thị cho quản trị viên. */
const DEVICE_NAME_LABEL: Record<SessionDeviceType, string> = {
  MISTING: 'Hệ thống phun sương',
  LIGHT: 'Đèn sưởi',
}

/** Trạng thái lệnh được coi là **lỗi**. */
const ERROR_STATUSES = new Set(['FAILED', 'TIMED_OUT'])

/**
 * Khoá nhóm thiết bị + kênh — mỗi kênh SSR là 1 chu kỳ độc lập.
 *
 * ⚠ Dùng `masterId` + `channel` vì 1 master điều khiển nhiều kênh.
 */
function channelKey(command: SessionDeviceCommand): string {
  return `${command.master_id ?? 'unknown'}#${command.channel ?? 'unknown'}`
}

/** Epoch ms của 1 lệnh (dùng `requested_at` — mốc BE ghi nhận yêu cầu). */
function commandTimestamp(command: SessionDeviceCommand): number | null {
  const raw = Date.parse(command.requested_at ?? '')
  return Number.isFinite(raw) ? raw : null
}

/**
 * Loại thiết bị của 1 lệnh — suy ra từ `floors[].device_type`.
 *
 * ⚠ `null` khi BE không trả `deviceType` (lệnh không map được tầng nào).
 */
function resolveDeviceType(
  command: SessionDeviceCommand,
): SessionDeviceType | null {
  for (const floor of command.floors) {
    if (floor.device_type) return floor.device_type
  }
  return null
}

/**
 * Gom nhật ký lệnh thô thành các **chu kỳ hoạt động**.
 *
 * ⚠ Quy trình (áp dụng **cho từng** master + kênh riêng biệt):
 *   1. Sắp xếp lệnh theo thời gian **tăng dần**.
 *   2. Duyệt: `Bật` ⇒ mở chu kỳ mới (đóng chu kỳ đang mở nếu có — trường hợp
 *      hiếm, Bật liên tiếp mà thiếu Tắt); `Tắt` ⇒ đóng chu kỳ đang mở **nếu có**,
 *      nếu không có chu kỳ đang mở ⇒ **bỏ qua** (đây chính là lệnh `Tắt` lặp
 *      thừa do cơ chế lặp an toàn).
 *
 * @returns Các chu kỳ **mới nhất trước** (sắp xếp giảm dần theo thời gian Bật).
 */
export function aggregateCommandCycles(
  commands: SessionDeviceCommand[],
): SessionCommandCycle[] {
  /*
   * ⚠ Bước 1 — nhóm theo master + kênh, mỗi nhóm sắp xếp tăng dần theo thời
   *   gian. Dùng Map (giữ thứ tự chèn) + sort tại chỗ.
   */
  const groups = new Map<string, SessionDeviceCommand[]>()
  for (const command of commands) {
    const key = channelKey(command)
    const bucket = groups.get(key)
    if (bucket) bucket.push(command)
    else groups.set(key, [command])
  }

  const cycles: SessionCommandCycle[] = []

  for (const bucket of groups.values()) {
    const ordered = [...bucket].sort((left, right) => {
      const leftTime = commandTimestamp(left) ?? 0
      const rightTime = commandTimestamp(right) ?? 0
      if (leftTime !== rightTime) return leftTime - rightTime
      return (left.command_id ?? '').localeCompare(right.command_id ?? '')
    })

    let openCycle: SessionDeviceCommand | null = null

    for (const command of ordered) {
      if (command.action === 'ON') {
        /*
         * ⚠ `Bật` khi đang có chu kỳ mở ⇒ chu kỳ cũ **không có Tắt** ⇒
         *   coi như đã kết thúc (thiết bị bật lại). Đóng nó lại để không mất
         *   dữ liệu.
         */
        if (openCycle) {
          cycles.push(buildCycle(openCycle, null))
        }
        openCycle = command
        continue
      }

      if (command.action === 'OFF') {
        if (openCycle) {
          cycles.push(buildCycle(openCycle, command))
          openCycle = null
        }
        /*
         * ⚠ `Tắt` mà không có chu kỳ đang mở ⇒ **lệnh Tắt lặp thừa** (failsafe)
         *   ⇒ BỎ QUA hoàn toàn. Đây là nguồn gây "spam Tắt".
         */
        continue
      }
    }

    // Chu kỳ vẫn đang mở ⇒ thiết bị đang hoạt động.
    if (openCycle) cycles.push(buildCycle(openCycle, null))
  }

  // Mới nhất trước — dễ đọc nhật ký.
  return cycles.sort((left, right) => {
    const leftTime = left.startedAt ?? 0
    const rightTime = right.startedAt ?? 0
    return rightTime - leftTime
  })
}

/** Dựng 1 chu kỳ từ lệnh Bật (và lệnh Tắt nếu có). */
function buildCycle(
  onCommand: SessionDeviceCommand,
  offCommand: SessionDeviceCommand | null,
): SessionCommandCycle {
  const deviceType = resolveDeviceType(onCommand)
  const startedAt = commandTimestamp(onCommand)
  const endedAt = offCommand ? commandTimestamp(offCommand) : null

  const durationMs =
    startedAt != null && endedAt != null && endedAt >= startedAt
      ? endedAt - startedAt
      : null

  const hasError =
    (onCommand.status != null && ERROR_STATUSES.has(onCommand.status)) ||
    (offCommand?.status != null && ERROR_STATUSES.has(offCommand.status))

  const errorMessage =
    onCommand.error_message ?? offCommand?.error_message ?? null

  return {
    id:
      onCommand.command_id ??
      `cycle-${onCommand.requested_at ?? ''}-${onCommand.channel ?? ''}`,
    deviceType,
    deviceName: deviceType
      ? DEVICE_NAME_LABEL[deviceType]
      : 'Thiết bị IoT',
    channel: onCommand.channel,
    masterId: onCommand.master_id,
    floors: onCommand.floors,
    onCommand,
    offCommand,
    startedAt,
    endedAt,
    durationMs,
    isActive: offCommand === null,
    hasError,
    requestedBy: onCommand.requested_by,
    errorMessage,
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
