import { useMemo } from 'react'
import { useCultivationRooms } from '../../rooms/hooks/useCultivation'
import { useCultivationTrays } from '../../rooms/hooks/useCultivation'
import { useFloorList } from '../../devices/hooks/useIoT'
import { useMasterList } from '../../devices/hooks/useIoT'
import type { BeTrayStatus } from '../../../types/cultivation-status'

/**
 * Cơ cấu trang trại (phòng / tầng / khay / thiết bị) cho trang Tổng quan.
 *
 * ⚠ **Không** dùng `fetchFarmAnalytics` cũ nữa — hàm đó gộp 8 endpoint bằng
 *   `Promise.all` kèm vòng lặp gọi `/environment` theo tầng và
 *   `/spawn-inspections` theo phiên (N+1 + cascade failure).
 *
 * → Hook này chỉ gọi **4 endpoint danh sách** (song song, không vòng lặp):
 *   - `GET /api/cultivation-rooms`
 *   - `GET /api/cultivation-trays`
 *   - `GET /api/iot/floors`
 *   - `GET /api/iot/masters`
 *
 *   Tất cả dùng chung query key với các trang khác (`/rooms`, `/devices`)
 *   ⇒ điều hướng giữa các trang không phát sinh request lặp lại.
 */

/** Tỷ lệ lấp đầy khay. */
export interface TrayOccupancy {
  total: number
  available: number
  occupied: number
  maintenance: number
  /** 0–100 */
  occupancyRate: number
}

/** Sức khoẻ thiết bị Master. */
export interface DeviceHealth {
  total: number
  online: number
  offline: number
  /** Tỷ lệ Master online (0–100). */
  onlineRate: number
}

export interface FarmStructure {
  totalRooms: number
  activeRooms: number
  totalFloors: number
  trays: TrayOccupancy
  devices: DeviceHealth
}

/** Trạng thái khay được tính vào nhóm "đang vận hành". */
const OCCUPIED_STATUSES: ReadonlySet<BeTrayStatus> = new Set<BeTrayStatus>([
  'OCCUPIED',
])

/**
 * Cơ cấu trang trại — 4 request song song, **không** có vòng lặp N+1.
 */
export function useFarmStructure() {
  const roomsQuery = useCultivationRooms({}, { staleTime: 60_000 })
  const traysQuery = useCultivationTrays({}, { staleTime: 60_000 })
  const floorsQuery = useFloorList({ staleTime: 60_000 })
  const mastersQuery = useMasterList({ staleTime: 60_000 })

  const structure = useMemo<FarmStructure>(() => {
    const trays = traysQuery.data ?? []
    const masters = mastersQuery.data ?? []

    const occupied = trays.filter((tray) =>
      OCCUPIED_STATUSES.has(tray.status),
    ).length
    const available = trays.filter(
      (tray) => tray.status === 'AVAILABLE',
    ).length
    const maintenance = trays.filter(
      (tray) => tray.status === 'MAINTENANCE',
    ).length
    const total = trays.length

    const online = masters.filter(
      (master) => master.reportedStatus === 'online',
    ).length

    return {
      totalRooms: (roomsQuery.data ?? []).length,
      activeRooms: (roomsQuery.data ?? []).filter(
        (room) => room.status === 'ACTIVE',
      ).length,
      totalFloors: (floorsQuery.data ?? []).length,
      trays: {
        total,
        available,
        occupied,
        maintenance,
        occupancyRate:
          total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0,
      },
      devices: {
        total: masters.length,
        online,
        offline: masters.length - online,
        onlineRate:
          masters.length > 0
            ? Math.round((online / masters.length) * 1000) / 10
            : 0,
      },
    }
  }, [roomsQuery.data, traysQuery.data, floorsQuery.data, mastersQuery.data])

  return {
    structure,
    isLoading:
      roomsQuery.isLoading ||
      traysQuery.isLoading ||
      floorsQuery.isLoading ||
      mastersQuery.isLoading,
    isError:
      roomsQuery.isError ||
      traysQuery.isError ||
      floorsQuery.isError ||
      mastersQuery.isError,
    /** Lỗi gốc đầu tiên để hiển thị thông điệp thân thiện. */
    error:
      roomsQuery.error ?? traysQuery.error ?? floorsQuery.error ?? mastersQuery.error ?? null,
    refetch: () => {
      void roomsQuery.refetch()
      void traysQuery.refetch()
      void floorsQuery.refetch()
      void mastersQuery.refetch()
    },
  }
}
