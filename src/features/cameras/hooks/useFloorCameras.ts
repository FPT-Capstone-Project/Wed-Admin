/**
 * Hook tra cứu camera theo tầng — dùng cho nút "Xem camera" ở trang
 * Thiết bị IoT (`DeviceControlPanel`).
 *
 * ── Vì sao cần hook riêng? ──────────────────────────────────────────────
 * `GET /api/cameras` của BE **yêu cầu role Admin** (`authorizeRoles(1)`) —
 * xem `Backend/src/routes/camera.routes.js`. Farm Operator (role 2) sẽ nhận
 * 403 ⇒ `useCameras()` lỗi ⇒ nếu bảng tầng gọi thẳng hook này thì mọi tầng
 * đều hiện "chưa lắp camera" (sai thông điệp) và có thể spam toast lỗi.
 *
 * → Hook này **chỉ chạy khi user có quyền `camera.view`** và coi lỗi 403 là
 * "không có danh sách camera" (im lặng, không toast) vì đó là trạng thái hợp lệ.
 *
 * ⚠ Việc quyền ở tầng FE chỉ là **UI affordance** — BE vẫn là nguồn quyết
 *   định cuối cùng (xem `features/auth/permissions.ts`).
 */

import { useMemo } from 'react'
import { useCameras } from '../hooks/useCameras'
import { useHasPermission } from '../../auth/hooks/usePermission'
import { CAMERA_VIEW } from '../../auth/permissions'
import { extractApiError } from '../../../shared/api/error'
import {
  buildFloorCameraMap,
  FLOOR_CAMERA_CONFIG,
  type FloorCameraConfigEntry,
  type FloorCameraResolution,
} from '../../../pages/devices/utils/floor-camera.utils'
import type { CultivationFloorMapping } from '../../../types/iot'
import type { Camera } from '../../../types/camera.types'

export interface FloorCameraMapResult {
  /** Map `floor_id` → kết quả tra cứu camera của tầng đó. */
  byFloorId: Map<number, FloorCameraResolution>
  /** Danh sách camera gốc (dùng cho tiêu đề modal). */
  cameras: Camera[]
  /** User hiện tại có quyền xem camera không (FE affordance). */
  canViewCameras: boolean
  /** Đang tải danh sách camera. */
  isLoading: boolean
  /**
   * `true` khi không thể tải danh sách camera (mạng, 5xx…) — dùng để phân
   * biệt "tầng chưa lắp camera" với "lỗi tải danh sách".
   */
  isUnavailable: boolean
}

/**
 * Map camera cho từng tầng.
 *
 * @param floors Danh sách tầng (`GET /api/iot/floors`).
 * @param config Cấu hình tầng ↔ camera (mặc định `FLOOR_CAMERA_CONFIG`).
 */
export function useFloorCameraMap(
  floors: readonly CultivationFloorMapping[],
  config: readonly FloorCameraConfigEntry[] = FLOOR_CAMERA_CONFIG,
): FloorCameraMapResult {
  const canViewCameras = useHasPermission(CAMERA_VIEW)

  const camerasQuery = useCameras(
    {},
    {
      // Không có quyền → không gọi API (tránh 403 + toast đỏ).
      enabled: canViewCameras,
      // Danh sách camera thay đổi hiếm → cache lâu hơn mặc định 30s.
      staleTime: 60_000,
    },
  )

  // ⚠ `?? []` tạo array mới mỗi render → làm đổi identity của `cameras` và
  //   phá `useMemo` bên dưới. Bọc trong `useMemo` để giữ ổn định.
  const cameras = useMemo(() => camerasQuery.data ?? [], [camerasQuery.data])

  // 403 = không đủ quyền xem camera → coi như "không có danh sách camera",
  // im lặng (không toast) vì đây là trạng thái hợp lệ, không phải lỗi.
  const isForbidden =
    !canViewCameras || extractApiError(camerasQuery.error).status === 403
  const isUnavailable =
    camerasQuery.isError && !isForbidden && cameras.length === 0

  const byFloorId = useMemo(() => {
    const map = buildFloorCameraMap(floors, cameras, config)

    // Không tải được danh sách camera → mọi tầng cùng báo lỗi tải, KHÔNG
    // báo "chưa lắp camera" (thông điệp sai và gây hiểu nhầm).
    if (isUnavailable) {
      for (const floorId of map.keys()) {
        map.set(floorId, { camera: null, reason: 'cameras-unavailable' })
      }
    }

    // Không có quyền xem camera → nút bị disable, tooltip nói rõ lý do
    // (không phải "chưa lắp camera" — vốn đã gây hiểu nhầm).
    if (isForbidden) {
      for (const floorId of map.keys()) {
        map.set(floorId, { camera: null, reason: 'cameras-forbidden' })
      }
    }

    return map
  }, [floors, cameras, config, isUnavailable, isForbidden])

  return {
    byFloorId,
    cameras,
    canViewCameras,
    isLoading: canViewCameras && camerasQuery.isLoading,
    isUnavailable,
  }
}
