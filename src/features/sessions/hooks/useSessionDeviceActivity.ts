import { useQueries, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  fetchCultivationFloorMappings,
  fetchFloorAutoControlLogs,
} from '../api/session-device-activity.api'
import { aggregateDeviceCycles } from '../utils/session-device-cycle.utils'
import type { SessionFloorMapping } from '../types/session-floor-mapping.types'
import type {
  SessionDeviceEvent,
  SessionDeviceEventType,
} from '../types/session-device-activity.types'

/**
 * Hook nhật ký hoạt động thiết bị IoT của phiên canh tác — **chỉ đọc**.
 *
 * ⚠ **Nguồn**: `GET /api/iot/floors/{floorId}/auto-control/logs` của **từng
 *   tầng** thuộc phiên (BE đã gỡ bỏ endpoint `/iot-history` theo phiên).
 */

/** Query keys cho nhật ký thiết bị. */
export const sessionDeviceActivityKeys = {
  all: ['session-device-activity'] as const,
  /** Log thô theo tầng. */
  floors: () => [...sessionDeviceActivityKeys.all, 'floors'] as const,
  floorLogs: (floorId: number) =>
    [...sessionDeviceActivityKeys.floors(), floorId] as const,
  /** Danh sách tầng đã map sang thiết bị. */
  mappings: () => [...sessionDeviceActivityKeys.all, 'mappings'] as const,
}

/**
 * Danh sách tầng đã map sang thiết bị IoT.
 *
 * ⚠ Thay cho `floors` mà endpoint `/iot-history` cũ từng trả.
 */
export function useSessionFloorMappings(
  options?: Partial<UseQueryOptions<SessionFloorMapping[], Error>>,
) {
  return useQuery<SessionFloorMapping[], Error>({
    queryKey: sessionDeviceActivityKeys.mappings(),
    queryFn: fetchCultivationFloorMappings,
    staleTime: 60_000,
    ...options,
  })
}

/**
 * Chu kỳ hoạt động thiết bị của phiên — gom từ log của các tầng thuộc phiên.
 *
 * @param floorIds Các tầng thuộc phiên (thường lấy từ `trays[].floor_id`).
 * @param window Khoảng thời gian của phiên (epoch ms) — lọc log theo đây.
 * @param floorLabels Map `floor_id` → nhãn hiển thị (vd: `3` → `"Tầng 2"`).
 *
 *   ⚠ **Bắt buộc** để cột "Tầng" hiển thị đúng **số tầng thực tế**:
 *      `floor_id` trong DB là khoá kỹ thuật (SERIAL), **không** phải số tầng.
 *      Thiếu map này ⇒ bảng sẽ in `Tầng ${floor_id}` ⇒ **sai**.
 */
export function useSessionDeviceCycles(
  floorIds: readonly number[],
  window: { from?: number; to?: number } = {},
  options: {
    enabled?: boolean
    floorLabels?: ReadonlyMap<number, string>
  } = {},
) {
  /*
   * ⚠ **Chữ ký danh sách tầng** — dùng làm phần của query key.
   *
   *   Mảng tầng được tạo mới mỗi lần render ⇒ dùng chuỗi đã sắp xếp làm key
   *   ⇒ ổn định, cache không bị phá khi component render lại.
   */
  const floorSignature = useMemo(
    () => [...new Set(floorIds)].sort((a, b) => a - b).join(','),
    [floorIds],
  )

  const queries = useQueries({
    queries: useMemo(
      () =>
        [...new Set(floorIds)].map((floorId) => ({
          queryKey: sessionDeviceActivityKeys.floorLogs(floorId),
          queryFn: () => fetchFloorAutoControlLogs(floorId),
          staleTime: 60_000,
          enabled: options?.enabled ?? true,
        })),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [floorSignature, options?.enabled],
    ),
  })

  /**
   * Chữ ký nội dung của kết quả — dùng làm dependency thay vì mảng `queries`
   * (mảng đó được tạo mới mỗi lần render ⇒ `useMemo` không bao giờ giữ được
   * giá trị).
   */
  const dataSignature = queries
    .map((query) => (query.data?.length ?? 0).toString())
    .join('|')

  /*
   * ⚠ **Chữ ký nhãn tầng** — map được tạo mới mỗi lần render ⇒ cần chuỗi
   *   ổn định để `useMemo` không bị vô hiệu hoá liên tục.
   */
  const labelSignature = useMemo(() => {
    const entries = [...(options?.floorLabels ?? new Map())].map(
      ([floorId, label]) => `${floorId}:${label}`,
    )
    return entries.sort().join('|')
  }, [options?.floorLabels])

  const cycles = useMemo(() => {
    const events: SessionDeviceEvent[] = []
    for (const query of queries) {
      for (const entry of query.data ?? []) {
        const event = normalizeDeviceEvent(entry)
        if (!event) continue

        if (window.from != null || window.to != null) {
          const timestamp = Date.parse(event.created_at ?? '')
          if (!Number.isFinite(timestamp)) continue
          if (window.from != null && timestamp < window.from) continue
          if (window.to != null && timestamp > window.to) continue
        }

        events.push(event)
      }
    }
    return aggregateDeviceCycles(events, options?.floorLabels)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries, dataSignature, window.from, window.to, labelSignature])

  const isLoading = queries.some((query) => query.isLoading)
  const error = queries.find((query) => query.error)?.error ?? null

  return {
    data: cycles,
    isLoading,
    isError: queries.some((query) => query.isError),
    error: (error as Error | null) ?? null,
    refetch: () => {
      for (const query of queries) void query.refetch()
    },
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Chuẩn hoá 1 dòng log auto-control thành sự kiện thiết bị. */
function normalizeDeviceEvent(
  raw: unknown,
): SessionDeviceEvent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>

  const eventType = pickEventType(obj.event_type ?? obj.eventType)

  return {
    event_id: pickNumber(obj, 'id', 'event_id'),
    floor_id: pickNumber(obj, 'floor_id', 'floorId'),
    event_type: eventType,
    reason: pickString(obj, 'reason'),
    created_at: pickString(obj, 'created_at', 'createdAt'),
    command_id: pickString(obj, 'command_id', 'commandId'),
    average_temperature: pickNumber(
      obj,
      'average_temperature',
      'averageTemperature',
    ),
    average_humidity: pickNumber(obj, 'average_humidity', 'averageHumidity'),
    sensor_values_json: obj.sensor_values_json ?? obj.sensorValuesJson ?? null,
  }
}

/** Loại sự kiện hợp lệ — BE ghi vào `iot_auto_control_logs.event_type`. */
const EVENT_TYPES: readonly SessionDeviceEventType[] = [
  'DECISION',
  'START',
  'STOP',
  'ON_REQUESTED',
  'OFF_REQUESTED',
  'PULSE_RESERVED',
  'OFF_CONFIRMED',
  'RETRY_WAIT',
  'CONFIG_SAVED',
  'FAULT',
  'MANUAL_OVERRIDE',
  'AUTO_PAUSED',
  'INTERRUPTION_STOP',
]

/**
 * Chuẩn hoá loại sự kiện.
 *
 * ⚠ BE có thể bổ sung loại mới ⇒ loại **không nhận diện được** trả `null`
 *   (không ép về loại gần giống để tránh ghi sai nghĩa).
 */
function pickEventType(value: unknown): SessionDeviceEventType | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return EVENT_TYPES.includes(normalized as SessionDeviceEventType)
    ? (normalized as SessionDeviceEventType)
    : null
}

function pickString(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]) {
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
