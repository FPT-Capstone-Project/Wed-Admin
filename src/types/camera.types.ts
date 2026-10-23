/**
 * Types cho module Camera (Imou).
 *
 * Nguồn: OpenAPI spec sống của BE (`swagger-ui-init.js`, tag `Cameras`).
 * Mọi endpoint đều yêu cầu `bearerAuth`.
 *
 * ⚠ Lưu ý về `POST /api/cameras/live-streams/stop`: body chỉ nhận `liveToken`,
 *   nhưng response của `GET /api/cameras/live-streams` **không** trả token về
 *   ("live tokens are never returned"). Nghĩa là không tự dựng được request
 *   stop hợp lệ từ client. Xem `LIVE_STREAM_STOP_TOKEN_GAP` ở `camera.api.ts`.
 */

export const CAMERA_STATUSES = ['ACTIVE', 'INACTIVE', 'OFFLINE'] as const
export type CameraStatus = (typeof CAMERA_STATUSES)[number]

/** Một camera đã đăng ký trong hệ thống. */
export interface Camera {
  id: number
  /** Imou cloud device ID — dùng cho endpoint live-stream. */
  cameraCode: string
  cameraName: string
  roomId: number | null
  /** HLS/RTSP tùy chọn do admin tự nhập; null nếu chưa cấu hình. */
  streamUrl: string | null
  status: CameraStatus
  createdAt?: string
  updatedAt?: string
}

/** Query của `GET /api/cameras`. */
export interface CameraListQuery {
  roomId?: number
  status?: CameraStatus
}

/** Body của `POST /api/cameras`. */
export interface CreateCameraRequest {
  roomId: number
  cameraCode: string
  cameraName: string
  streamUrl?: string | null
  status?: CameraStatus
}

/** Body của `PUT /api/cameras/{cameraId}` — mọi field đều tuỳ chọn. */
export type UpdateCameraRequest = Partial<CreateCameraRequest>

/** Body của `POST /api/cameras/live-streams/stop`. */
export interface StopLiveSessionRequest {
  liveToken: string
}

/**
 * Thông tin phiên live của một kênh camera.
 *
 * Spec không công bố schema response chi tiết (chỉ ghi "Current live
 * sessions"), nên các field dưới đây suy ra từ mô tả:
 * "HLS URLs are temporary and live tokens are never returned".
 */
export interface LiveSession {
  cameraId: number
  /** Imou device channel; mặc định "0". */
  channelId: string
  /** URL HLS tạm thời — hết hạn sau thời gian ngắn, không cache lâu. */
  hlsUrl?: string | null
  liveStatus?: string | null
}

/** Query của `GET /api/cameras/live-streams`. */
export interface LiveSessionListQuery {
  cameraId?: number
  /** Mô tả "Page size, from 1 to 50" trong spec. */
  roomId?: number
  /** Chuỗi channel IDs phân tách bởi dấu phẩy, vd "0,1". Mặc định "0". */
  channelIds?: string
}

/** Query của `GET|POST /api/cameras/{cameraId}/live-stream`. */
export interface LiveStreamQuery {
  /** Imou device channel; mặc định "0". */
  channelId?: string
}

/**
 * Response thực tế của `GET /api/cameras/{cameraId}/live-stream`.
 *
 * BE trả về (sau khi bọc 1 lớp `data`):
 * ```json
 * {
 *   "data": {
 *     "cameraId": 12,
 *     "cameraName": "Camera hành lang tầng 1",
 *     "channelId": "0",
 *     "stream": { "url": "https://.../live.m3u8" }
 *   }
 * }
 * ```
 *
 * Lưu ý: `stream.url` là URL HLS **tạm thời** do Imou cloud cấp — hết hạn
 * sau thời gian ngắn, không được cache lâu.
 */
export interface LiveStreamResponse {
  cameraId: number
  cameraName: string
  /** Imou device channel; mặc định "0". */
  channelId: string
  /** Thông tin luồng phát — hiện BE chỉ trả `url` (HLS). */
  stream: {
    url: string
  }
}

/**
 * @deprecated Dùng `LiveStreamResponse` — cấu trúc response thực tế đã được
 * xác nhận từ BE.
 */
export type LiveStreamInfo = LiveStreamResponse