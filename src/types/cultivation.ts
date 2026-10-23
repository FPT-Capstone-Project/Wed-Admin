/**
 * Cultivation (Rooms + Trays) — DTOs khớp Swagger.
 * Endpoints: /api/cultivation-rooms, /api/cultivation-trays
 *
 * Chiến lược mapping với UI hiện tại (dùng `Tier[]` với Tray embedded):
 *   - UI `Tier` có: tierId, name, nodeId, trays[], telemetry
 *   - UI `Tray` có: id, code, tierId, status, customerId, batchId, rental
 *   - BE trả: flat CultivationRoom[] + flat CultivationTray[]
 *   - → mapper `toUiTiers()` gắn trays vào từng tầng,
 *     telemetry dùng default (sau này replace bằng WS real-time)
 */

import type {
  Tier,
  TierId,
  TierTelemetry,
  Tray,
  TrayStatus,
} from './room.types'
import type { BeTrayStatus } from './cultivation-status'

export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

// ─── Room ──────────────────────────────────────────────────────────────────
export interface CultivationRoom {
  room_id: number
  room_code: string
  room_name: string
  description: string | null
  capacity: number
  status: RoomStatus
  created_at: string
  updated_at: string
}

export interface CreateCultivationRoomRequest {
  roomCode: string
  roomName: string
  description?: string
  capacity?: number
  status?: RoomStatus
}

export interface UpdateCultivationRoomRequest {
  roomCode?: string
  roomName?: string
  description?: string | null
  capacity?: number
  status?: RoomStatus
}

export interface CultivationRoomListQuery {
  status?: RoomStatus
}

// ─── Tray (BE schema) ────────────────────────────────────────────────────
export interface CultivationTray {
  tray_id: number
  room_id: number
  tray_code: string
  tray_name: string | null
  status: BeTrayStatus
  created_at: string
  updated_at: string
}

export interface CreateCultivationTrayRequest {
  roomId: number
  trayCode: string
  trayName?: string
  status?: BeTrayStatus
}

export interface UpdateCultivationTrayRequest {
  roomId?: number
  trayCode?: string
  trayName?: string | null
  status?: BeTrayStatus
}

export interface CultivationTrayListQuery {
  roomId?: number
  status?: BeTrayStatus
}

// ─── UI mapper: BE → Tier[] + Tray[] ───────────────────────────────────────

const VALID_NODE_IDS = ['node-stm32-01', 'node-stm32-02', 'node-stm32-03', 'node-stm32-04'] as const

function safeNodeId(roomId: number): typeof VALID_NODE_IDS[number] {
  return (
    (VALID_NODE_IDS[roomId - 1] as typeof VALID_NODE_IDS[number]) ??
    (`node-stm32-0${roomId}` as typeof VALID_NODE_IDS[number])
  )
}

/** Mapper: CultivationRoom[] + CultivationTray[] → Tier[] (gắn trays vào từng tầng) */
export function toUiTiers(
  rooms: CultivationRoom[],
  trays: CultivationTray[],
  defaultTelemetry: TierTelemetry,
): Tier[] {
  return rooms.map((room) => {
    const roomTrays = trays
      .filter((t) => t.room_id === room.room_id)
      .map((t) => toUiTray(t))

    return {
      tierId: room.room_id as TierId,
      name: room.room_name,
      nodeId: safeNodeId(room.room_id),
      trays: roomTrays,
      telemetry: defaultTelemetry,
    }
  })
}

/** Mapper: CultivationTray → Tray (khớp `room.types.ts`) */
export function toUiTray(be: CultivationTray): Tray {
  // Map BE BeTrayStatus → UI TrayStatus
  let uiStatus: TrayStatus
  switch (be.status) {
    case 'AVAILABLE':
      uiStatus = 'empty'
      break
    case 'OCCUPIED':
      uiStatus = 'rented'
      break
    case 'MAINTENANCE':
      uiStatus = 'maintenance'
      break
    default:
      uiStatus = 'empty'
  }

  return {
    id: String(be.tray_id),
    code: be.tray_code as Tray['code'],
    tierId: be.room_id as TierId,
    status: uiStatus,
    customerId: null,
    batchId: null,
    rental: null,
  }
}

/** Map UI TrayStatus → BE BeTrayStatus */
export function uiTrayStatusToBe(uiStatus: TrayStatus): BeTrayStatus {
  switch (uiStatus) {
    case 'empty':
      return 'AVAILABLE'
    case 'rented':
    case 'harvesting':
      return 'OCCUPIED'
    case 'maintenance':
      return 'MAINTENANCE'
    default:
      return 'AVAILABLE'
  }
}

/** Lọc trays trống (AVAILABLE) — dùng cho TrayAssignmentModal */
export function filterAvailableTrays(trays: CultivationTray[]): CultivationTray[] {
  return trays.filter((t) => t.status === 'AVAILABLE')
}
