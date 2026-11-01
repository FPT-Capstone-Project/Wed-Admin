/**
 * Logic map **tầng ↔ camera** cho nút "Xem camera" ở trang Thiết bị IoT.
 *
 * ── Vì sao cần file riêng? ──────────────────────────────────────────────
 * Tầng (`cultivation_floors`) và camera (`cameras`) là 2 bảng **không có
 * quan hệ trực tiếp** ở BE hiện tại:
 *
 *   - Tầng  : `floor_id`, `room_id`, `floor_number`
 *   - Camera: `camera_id`, `room_id` (KHÔNG có `floor_id`)
 *
 * ⇒ Về lý thuyết mỗi camera chỉ gắn được với **phòng**, không gắn được với
 * **tầng**. Để bảng "Cấu hình tưới phun sương tự động" mở được live stream
 * theo từng tầng, ta cần một lớp ánh xạ ở FE.
 *
 * ── Thứ tự ưu tiên (từ chắc chắn → tạm) ─────────────────────────────────
 * 1. **API** — camera có `floor_id` trùng `floor.floor_id`
 *    (BE đang mở rộng `cameras.floor_id`; xem `types/camera.types.ts`).
 *    → Khi BE có field này, UI tự dùng, **không phải sửa gì ở đây**.
 * 2. **API (mở rộng)** — camera có `floor_number` trùng **và** cùng `room_id`.
 * 3. **Cấu hình tay** — `FLOOR_CAMERA_CONFIG` bên dưới: khai báo tầng nào
 *    (theo `floor_number`, tuỳ chọn `room_id`) dùng camera nào.
 *    → Đây là chỗ duy nhất cần sửa khi gắn thêm camera cho tầng 2.
 * 4. **Không có** → nút bị disable + tooltip "Tầng này chưa được lắp camera".
 *
 * ⚠ Nguyên tắc: **UI không hardcode `floor_id === 1`**. Mọi thứ đi qua
 *   `resolveFloorCamera()` để khi tầng 2 được lắp camera chỉ cần sửa
 *   config/API, không phải sửa lại component.
 */

import type { CultivationFloorMapping } from '../../../types/iot'
import type { Camera } from '../../../types/camera.types'

// ─── Cấu hình tầng ↔ camera ──────────────────────────────────────────────

/**
 * Một khai báo "tầng nào dùng camera nào".
 *
 * - `floorNumber` — số thứ tự tầng trong phòng (`cultivation_floors.floor_number`).
 *   ⚠ Đây **không** phải `floor_id` (xem `CultivationFloorMapping.floor_id`).
 * - `roomId`      — tuỳ chọn. Bỏ trống = áp dụng cho mọi phòng.
 * - `cameraId`    — tuỳ chọn. Bỏ trống = lấy camera **đầu tiên** của phòng
 *   (sắp xếp theo `camera_id`) — phù hợp khi phòng chỉ có 1 camera.
 */
export interface FloorCameraConfigEntry {
  floorNumber: number
  roomId?: number
  cameraId?: number
}

/**
 * ⚙️ **CẤU HÌNH TẦNG ↔ CAMERA** — sửa file này khi gắn thêm camera.
 *
 * Hiện tại: Tầng 1 đã lắp camera Imou; Tầng 2 chưa lắp.
 *
 * Khi Tầng 2 được lắp camera → chỉ cần thêm `{ floorNumber: 2 }` vào đây
 * (hoặc để BE trả `cameras.floor_id` → bỏ hẳn cấu hình tay).
 */
export const FLOOR_CAMERA_CONFIG: readonly FloorCameraConfigEntry[] = [
  { floorNumber: 1 },
]

// ─── Kết quả tra cứu ────────────────────────────────────────────────────

/** Lý do một tầng **không** mở được live stream. */
export type FloorCameraUnavailableReason =
  /** Danh sách camera chưa tải xong / tải lỗi. */
  | 'cameras-unavailable'
  /** User không có quyền xem danh sách camera (BE trả 403). */
  | 'cameras-forbidden'
  /** Phòng của tầng chưa đăng ký camera nào. */
  | 'no-camera-in-room'
  /** Tầng không nằm trong `FLOOR_CAMERA_CONFIG` (chưa cấu hình). */
  | 'not-configured'
  /** Camera đã tìm thấy nhưng không ở trạng thái ACTIVE. */
  | 'camera-inactive'

export interface FloorCameraResolution {
  /** Camera dùng để phát live — `null` nếu tầng chưa có camera. */
  camera: Camera | null
  /** `null` khi đã có camera dùng được. */
  reason: FloorCameraUnavailableReason | null
}

/** Message tiếng Việt cho từng lý do — dùng cho Tooltip. */
export const FLOOR_CAMERA_UNAVAILABLE_MESSAGES: Record<
  FloorCameraUnavailableReason,
  string
> = {
  'cameras-unavailable':
    'Chưa tải được danh sách camera. Vui lòng kiểm tra kết nối hoặc thử lại.',
  'cameras-forbidden':
    'Bạn không có quyền xem danh sách camera của hệ thống.',
  'no-camera-in-room': 'Tầng này chưa được lắp camera',
  'not-configured': 'Tầng này chưa được lắp camera',
  'camera-inactive': 'Camera của tầng này đang không hoạt động',
}

// ─── Hàm tra cứu ────────────────────────────────────────────────────────

/** Camera có đủ điều kiện phát live không. */
function isPlayable(camera: Camera): boolean {
  // ⚠ `id` là số → `0` nghĩa là BE trả record thiếu id (normalize đặt 0) ⇒
  // không đủ điều kiện gọi `/api/cameras/{id}/imou-player-token`.
  return camera.id > 0 && camera.cameraCode.trim().length > 0
}

/**
 * Camera ứng viên của một phòng, sắp xếp theo `camera_id` tăng dần.
 *
 * Chỉ lấy camera **phát được** (có id + device code) — camera thiếu id sẽ
 * không gọi được endpoint token.
 */
function camerasOfRoom(cameras: readonly Camera[], roomId: number): Camera[] {
  return cameras
    .filter((camera) => camera.roomId === roomId && isPlayable(camera))
    .sort((a, b) => a.id - b.id)
}

/**
 * Tìm camera của một tầng theo thứ tự ưu tiên (xem header file).
 *
 * @param floor   Tầng cần tra cứu.
 * @param cameras Danh sách camera đã tải (có thể rỗng khi lỗi/quyền).
 * @param config  Cấu hình tầng ↔ camera (mặc định `FLOOR_CAMERA_CONFIG`).
 */
export function resolveFloorCamera(
  floor: CultivationFloorMapping,
  cameras: readonly Camera[],
  config: readonly FloorCameraConfigEntry[] = FLOOR_CAMERA_CONFIG,
): FloorCameraResolution {
  const playable = cameras.filter(isPlayable)

  // 1. API đã gắn trực tiếp `floor_id` → chắc chắn nhất.
  const byFloorId = playable.find((camera) => camera.floorId === floor.floor_id)
  if (byFloorId) {
    return { camera: byFloorId, reason: null }
  }

  // 2. API gắn theo `floor_number` + `room_id`.
  const byFloorNumber = playable.find(
    (camera) =>
      camera.floorNumber === floor.floor_number &&
      camera.roomId === floor.room_id,
  )
  if (byFloorNumber) {
    return { camera: byFloorNumber, reason: null }
  }

  // 3. Cấu hình tay.
  const entry = config.find(
    (item) =>
      item.floorNumber === floor.floor_number &&
      (item.roomId === undefined || item.roomId === floor.room_id),
  )

  if (!entry) {
    // Không khai báo trong config. Nếu phòng có camera mà chưa khai báo thì
    // vẫn báo "chưa lắp camera" — đúng như kỳ vọng hiện tại (Tầng 2).
    return {
      camera: null,
      reason: camerasOfRoom(cameras, floor.room_id).length
        ? 'not-configured'
        : 'no-camera-in-room',
    }
  }

  const roomCameras = camerasOfRoom(cameras, floor.room_id)

  if (entry.cameraId !== undefined) {
    const explicit = roomCameras.find((camera) => camera.id === entry.cameraId)
    if (explicit) return { camera: explicit, reason: null }
    // Cấu hình trỏ camera không tồn tại (hoặc camera đã bị xoá) → coi như
    // chưa lắp camera, KHÔNG fallback sang camera khác (tránh mở nhầm).
    return { camera: null, reason: 'no-camera-in-room' }
  }

  // Không chỉ định `cameraId` → lấy camera đầu tiên của phòng.
  const first = roomCameras[0]
  if (first) return { camera: first, reason: null }

  // Có camera trong phòng nhưng không phát được (thiếu id/device code).
  const unusable = cameras.filter(
    (camera) => camera.roomId === floor.room_id && !isPlayable(camera),
  )
  if (unusable.length > 0) {
    return { camera: null, reason: 'camera-inactive' }
  }

  return { camera: null, reason: 'no-camera-in-room' }
}

/**
 * Map `floor_id` → camera cho **cả bảng** — dùng để render cột hành động.
 *
 * ⚠ Camera có thể phục vụ nhiều tầng (vd 1 camera toàn cảnh phòng) — không
 *   giới hạn 1-1 để không vô tình chặn tầng hợp lệ.
 */
export function buildFloorCameraMap(
  floors: readonly CultivationFloorMapping[],
  cameras: readonly Camera[],
  config: readonly FloorCameraConfigEntry[] = FLOOR_CAMERA_CONFIG,
): Map<number, FloorCameraResolution> {
  const map = new Map<number, FloorCameraResolution>()
  for (const floor of floors) {
    map.set(floor.floor_id, resolveFloorCamera(floor, cameras, config))
  }
  return map
}
