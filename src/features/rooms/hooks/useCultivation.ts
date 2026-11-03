import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { cultivationRoomApi } from '../api/cultivation-room.api'
import { cultivationTrayApi } from '../api/cultivation-tray.api'
import { toUiTiers, toUiTray } from '../../../types/cultivation'
import { DEFAULT_TELEMETRY } from './cultivation.defaults'
import type {
  CultivationRoom,
  CultivationTray,
  CultivationRoomListQuery,
  CultivationTrayListQuery,
} from '../../../types/cultivation'
import type { Tier, Tray } from '../../../types/room.types'

// --- Query Keys -----------------------------------------------------------
export const cultivationKeys = {
  all: ['cultivation'] as const,
  rooms: () => [...cultivationKeys.all, 'rooms'] as const,
  room: (id: number) => [...cultivationKeys.rooms(), id] as const,
  trays: () => [...cultivationKeys.all, 'trays'] as const,
  tray: (id: number) => [...cultivationKeys.trays(), id] as const,
  /** Tier[] computed from rooms + trays - shared key for bulk invalidation */
  tiers: () => [...cultivationKeys.all, 'tiers'] as const,
}

// --- Rooms ----------------------------------------------------------------
export function useCultivationRooms(
  query: CultivationRoomListQuery = {},
  options?: Partial<UseQueryOptions<CultivationRoom[], Error>>,
) {
  return useQuery<CultivationRoom[], Error>({
    queryKey: [...cultivationKeys.rooms(), query],
    queryFn: () => cultivationRoomApi.list(query),
    ...options,
  })
}

export function useCultivationRoom(
  id: number | null,
  options?: Partial<UseQueryOptions<CultivationRoom, Error>>,
) {
  return useQuery<CultivationRoom, Error>({
    queryKey: cultivationKeys.room(id ?? -1),
    queryFn: async () => {
      const result = await cultivationRoomApi.getById(id as number)
      if (!result) throw new Error(`Cultivation room not found (id=${id})`)
      return result
    },
    enabled: id !== null && id > 0,
    ...options,
  })
}

// --- Trays ----------------------------------------------------------------
export function useCultivationTrays(
  query: CultivationTrayListQuery = {},
  options?: Partial<UseQueryOptions<CultivationTray[], Error>>,
) {
  return useQuery<CultivationTray[], Error>({
    queryKey: [...cultivationKeys.trays(), query],
    queryFn: () => cultivationTrayApi.list(query),
    ...options,
  })
}

export function useCultivationTray(
  id: number | null,
  options?: Partial<UseQueryOptions<CultivationTray, Error>>,
) {
  return useQuery<CultivationTray, Error>({
    queryKey: cultivationKeys.tray(id ?? -1),
    queryFn: async () => {
      const result = await cultivationTrayApi.getById(id as number)
      if (!result) throw new Error(`Cultivation tray not found (id=${id})`)
      return result
    },
    enabled: id !== null && id > 0,
    ...options,
  })
}

// --- Tier[] (computed from rooms + trays) ---------------------------------
/**
 * Aggregates rooms + trays in parallel and merges them into Tier[].
 * Telemetry + Relays use defaults for now (to be replaced by WS real-time data).
 */
export function useCultivationTiers(
  options?: Partial<UseQueryOptions<Tier[], Error>>,
) {
  return useQuery<Tier[], Error>({
    queryKey: cultivationKeys.tiers(),
    queryFn: async () => {
      const [rooms, trays] = await Promise.all([
        cultivationRoomApi.list({}),
        cultivationTrayApi.list({}),
      ])
      return toUiTiers(rooms, trays, DEFAULT_TELEMETRY)
    },
    staleTime: 60_000,
    ...options,
  })
}

/**
 * Flat Tray[] list used by TrayDetailDrawer lookup.
 */
export function useAllUiTrays(
  options?: Partial<UseQueryOptions<Tray[], Error>>,
) {
  return useQuery<Tray[], Error>({
    queryKey: cultivationKeys.trays(),
    queryFn: async () => {
      const trays = await cultivationTrayApi.list({})
      return trays.map(toUiTray)
    },
    staleTime: 60_000,
    ...options,
  })
}

// NOTE: no useMutation hooks here. Web Admin is read-only: it only observes
// rooms and trays. Infrastructure writes are done by staff on the mobile app.
