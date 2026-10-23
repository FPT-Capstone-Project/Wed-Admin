import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { cultivationRoomApi } from '../api/cultivation-room.api'
import { cultivationTrayApi } from '../api/cultivation-tray.api'
import {
  toUiTiers,
  toUiTray,
  filterAvailableTrays,
} from '../../../types/cultivation'
import { DEFAULT_TELEMETRY } from './cultivation.defaults'
import type {
  CreateCultivationRoomRequest,
  CreateCultivationTrayRequest,
  CultivationRoom,
  CultivationTray,
  CultivationRoomListQuery,
  CultivationTrayListQuery,
  UpdateCultivationRoomRequest,
  UpdateCultivationTrayRequest,
} from '../../../types/cultivation'
import type { Tier, Tray } from '../../../types/room.types'

// ─── Query Keys ──────────────────────────────────────────────────────────
export const cultivationKeys = {
  all: ['cultivation'] as const,
  rooms: () => [...cultivationKeys.all, 'rooms'] as const,
  room: (id: number) => [...cultivationKeys.rooms(), id] as const,
  trays: () => [...cultivationKeys.all, 'trays'] as const,
  tray: (id: number) => [...cultivationKeys.trays(), id] as const,
  availableTrays: () => [...cultivationKeys.trays(), 'available'] as const,
  /** Tier[] computed từ rooms + trays — key chung để invalidate cùng lúc */
  tiers: () => [...cultivationKeys.all, 'tiers'] as const,
}

// ─── Rooms ────────────────────────────────────────────────────────────────
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
      if (!result) throw new Error(`Không tìm thấy phòng nuôi trồng ID ${id}`)
      return result
    },
    enabled: id !== null && id > 0,
    ...options,
  })
}

// ─── Trays ───────────────────────────────────────────────────────────────
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
      if (!result) throw new Error(`Không tìm thấy khay ID ${id}`)
      return result
    },
    enabled: id !== null && id > 0,
    ...options,
  })
}

/** Lọc trays trống (AVAILABLE) cho TrayAssignmentModal */
export function useAvailableTrays(
  options?: Partial<UseQueryOptions<CultivationTray[], Error>>,
) {
  return useQuery<CultivationTray[], Error>({
    queryKey: cultivationKeys.availableTrays(),
    queryFn: async () => {
      const all = await cultivationTrayApi.list({})
      return filterAvailableTrays(all)
    },
    ...options,
  })
}

// ─── Tier[] (computed from rooms + trays) ─────────────────────────────────
/**
 * Hook tổng hợp: gọi rooms + trays song song, ghép thành Tier[].
 * Telemetry + Relays dùng default (sau này replace bằng WS real-time data).
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
 * Tray[] phẳng cho TrayDetailDrawer lookup.
 * Khi user click 1 tray → trayId → tìm tray từ list này → compute tier.
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

// ─── Mutations ────────────────────────────────────────────────────────────
function useMutationBase<TData, TVariables>(
  mutationFn: (v: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cultivationKeys.all })
    },
    ...options,
  })
}

export function useCreateCultivationRoom(
  options?: UseMutationOptions<CultivationRoom, Error, CreateCultivationRoomRequest>,
) {
  return useMutationBase<CultivationRoom, CreateCultivationRoomRequest>(
    async (payload) => {
      const result = await cultivationRoomApi.create(payload)
      if (!result) throw new Error('Không thể tạo phòng nuôi trồng mới')
      return result
    },
    options,
  )
}

export function useUpdateCultivationRoom(
  options?: UseMutationOptions<
    CultivationRoom,
    Error,
    { id: number; payload: UpdateCultivationRoomRequest }
  >,
) {
  return useMutationBase<
    CultivationRoom,
    { id: number; payload: UpdateCultivationRoomRequest }
  >(async ({ id, payload }) => {
    const result = await cultivationRoomApi.update(id, payload)
    if (!result) throw new Error(`Không thể cập nhật phòng ID ${id}`)
    return result
  }, options)
}

export function useDeleteCultivationRoom(
  options?: UseMutationOptions<void, Error, number>,
) {
  return useMutationBase<void, number>((id) => cultivationRoomApi.remove(id), options)
}

export function useCreateCultivationTray(
  options?: UseMutationOptions<CultivationTray, Error, CreateCultivationTrayRequest>,
) {
  return useMutationBase<CultivationTray, CreateCultivationTrayRequest>(
    async (payload) => {
      const result = await cultivationTrayApi.create(payload)
      if (!result) throw new Error('Không thể tạo khay mới')
      return result
    },
    options,
  )
}

export function useUpdateCultivationTray(
  options?: UseMutationOptions<
    CultivationTray,
    Error,
    { id: number; payload: UpdateCultivationTrayRequest }
  >,
) {
  return useMutationBase<
    CultivationTray,
    { id: number; payload: UpdateCultivationTrayRequest }
  >(async ({ id, payload }) => {
    const result = await cultivationTrayApi.update(id, payload)
    if (!result) throw new Error(`Không thể cập nhật khay ID ${id}`)
    return result
  }, options)
}

export function useDeleteCultivationTray(
  options?: UseMutationOptions<void, Error, number>,
) {
  return useMutationBase<void, number>((id) => cultivationTrayApi.remove(id), options)
}
