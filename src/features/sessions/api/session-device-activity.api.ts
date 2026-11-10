import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type { AutoControlLogEntry } from '../../../types/iot'
import type { SessionFloorMapping } from '../types/session-floor-mapping.types'

/**
 * Nhật ký hoạt động thiết bị IoT của một phiên canh tác.
 *
 * ⚠ **Vì sao không còn `/api/cultivation-sessions/admin/{sessionId}/iot-history`?**
 *
 *   BE đã **gỡ bỏ** route đó (commit `4e136253` — "xóa xem lịch sử iot của từng
 *   phiên trồng") ⇒ trả **404**. Thay vào đó, BE ghi nhật ký quyết định của
 *   hệ thống tưới phun tự động vào bảng `iot_auto_control_logs`, đọc được qua
 *   `GET /api/iot/floors/{floorId}/auto-control/logs`.
 *
 *   ⇒ Ta dựng lại nhật ký theo phiên bằng cách: lấy log của **từng tầng**
 *   thuộc phiên ⇒ gộp ⇒ lọc theo khoảng thời gian của phiên.
 *
 * ## Phân quyền
 *
 * Swagger: *"Authenticated read access."* ⇒ Admin / Farm Operator đều đọc được.
 */

/** Base endpoint nhóm auto-control theo tầng. */
const AUTO_CONTROL_LOGS_URL = '/api/iot/floors'

/**
 * Số log lấy mỗi tầng trong 1 lần gọi.
 *
 * ⚠ BE giới hạn `limit` ở **1000** ⇒ 500 là mức an toàn (1 tầng có vài chục
 *   quyết định / giờ ⇒ 500 log phủ được nhiều giờ).
 */
const LOGS_LIMIT = 500

/**
 * GET `/api/iot/floors/{floorId}/auto-control/logs`
 *
 * @returns Mảng log của tầng (mới nhất trước) — `[]` khi tầng không tồn tại.
 */
export async function fetchFloorAutoControlLogs(
  floorId: number,
): Promise<AutoControlLogEntry[]> {
  try {
    const response = await apiClient.get<unknown>(
      `${AUTO_CONTROL_LOGS_URL}/${floorId}/auto-control/logs`,
      { params: { limit: LOGS_LIMIT, offset: 0 } },
    )
    const body = ensureObject<Record<string, unknown>>(response.data)
    if (!body) return []
    return ensureArray<AutoControlLogEntry>(body.logs)
  } catch (error) {
    if (isNotFoundError(error)) return []
    throw error
  }
}

/**
 * GET `/api/iot/floors` — danh sách tầng đã map sang thiết bị.
 *
 * ⚠ Dùng cho danh sách "Tầng & thiết bị phục vụ phiên" (thay cho `floors` mà
 *   endpoint `/iot-history` cũ từng trả).
 *
 * ⚠ **Phòng thủ `floor_id`**: schema Swagger **không** khai báo cột này ⇒ ta
 *   chuẩn hoá về `SessionFloorMapping` với `floorId: number | null` và chấp
 *   nhận nhiều tên cột (`floor_id` / `floorId` / `id`) để không mất tầng khi
 *   BE đổi tên cột. Xem `types/session-floor-mapping.types.ts`.
 */
export async function fetchCultivationFloorMappings(): Promise<
  SessionFloorMapping[]
> {
  const response = await apiClient.get<unknown>(AUTO_CONTROL_LOGS_URL)
  return ensureArray<Record<string, unknown>>(response.data).map(
    normalizeFloorMapping,
  )
}

/** Chuẩn hoá 1 tầng từ response `GET /api/iot/floors`. */
export function normalizeFloorMapping(
  raw: Record<string, unknown>,
): SessionFloorMapping {
  return {
    floorId: pickNumber(raw, 'floor_id', 'floorId', 'id'),
    roomId: pickNumber(raw, 'room_id', 'roomId'),
    floorNumber: pickNumber(raw, 'floor_number', 'floorNumber'),
    floorName: pickString(raw, 'floor_name', 'floorName', 'name'),
    masterId: pickNumber(raw, 'master_id', 'masterId'),
    nodeAddress: pickNumber(raw, 'node_address', 'nodeAddress'),
    status: pickString(raw, 'status'),
    totalRows: pickNumber(raw, 'total_rows', 'totalRows'),
    totalColumns: pickNumber(raw, 'total_columns', 'totalColumns'),
  }
}

function pickString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}
