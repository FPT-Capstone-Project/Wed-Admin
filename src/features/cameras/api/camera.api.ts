import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  Camera,
  CameraListQuery,
  CameraStatus,
  CreateCameraRequest,
  LiveSession,
  LiveSessionListQuery,
  LiveStreamQuery,
  LiveStreamResponse,
  StopLiveSessionRequest,
  UpdateCameraRequest,
} from '../../../types/camera.types'
import { CAMERA_STATUSES } from '../../../types/camera.types'

/**
 * API client cho module Camera (Imou).
 *
 * Base URL + Bearer token đã do `apiClient` lo (xem `shared/api/client.ts`):
 *  - Request interceptor tự gắn `Authorization: Bearer <token>`.
 *  - Response interceptor tự clear session khi BE trả 401.
 *  - Retry để React Query quản lý.
 *
 * Vì vậy các hàm dưới đây **không** try-catch thủ công — lỗi đã được
 * chuẩn hoá thành message tiếng Việt ở tầng hook/UI qua `extractApiError`.
 * Bắt try-catch ở đây chỉ làm mất stack gốc của axios.
 */
/**
 * Chuẩn hoá 1 record camera từ BE về shape `Camera` của client.
 *
 * ⚠ Vì sao cần: BE trộn hai convention trong cùng codebase.
 *   - `CultivationRoom` trả **snake_case** (`room_id`, `room_name`).
 *   - `IotMaster` / `UpdateCultivationRoomRequest` trả **camelCase**
 *     (`masterId`, `cultivationRoomId`, `roomCode`).
 *   - Swagger **không** khai báo schema response cho `GET /api/cameras`
 *     (chỉ ghi "Camera list"), nên không có cách biết chắc BE dùng convention nào.
 *
 * Nếu BE trả snake_case mà client đọc camelCase → `record.id` là `undefined`
 * → Antd Table cảnh báo "Each child in a list should have a unique key" và
 * mọi cột hiển thị trống. Normalizer ở đây xử lý **cả hai** convention
 * nên không còn phụ thuộc vào điều BE thực sự trả gì.
 *
 * Ưu tiên camelCase (đúng với type `Camera`), fallback snake_case.
 */
function normalizeCamera(raw: unknown): Camera {
  const obj = (raw ?? {}) as Record<string, unknown>

  const id = pickNumber(obj, 'id', 'camera_id', 'cameraId')
  const cameraCode = pickString(obj, 'cameraCode', 'camera_code')
  const cameraName = pickString(obj, 'cameraName', 'camera_name')
  const roomId = pickNumber(obj, 'roomId', 'room_id')
  const streamUrl = pickString(obj, 'streamUrl', 'stream_url')
  const status = pickString(obj, 'status')

  return {
    // `id` thiếu → 0. Row key của Table sẽ fallback sang `cameraCode`
    // (xem `rowKey` ở CameraOverviewPage) — dùng -1 sẽ đụng nhau giữa
    // nhiều record thiếu id và sinh cảnh báo key trùng.
    id: id ?? 0,
    // cameraCode/cameraName là bắt buộc theo schema → fallback chuỗi rỗng
    // thay vì null để không vi phạm type.
    cameraCode: cameraCode ?? '',
    cameraName: cameraName ?? '',
    roomId: roomId ?? null,
    streamUrl: streamUrl ?? null,
    status: isCameraStatus(status) ? status : 'INACTIVE',
    createdAt: pickString(obj, 'createdAt', 'created_at') ?? undefined,
    updatedAt: pickString(obj, 'updatedAt', 'updated_at') ?? undefined,
  }
}

function pickString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.length > 0) return value
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
    // BE có thể trả id dạng string.
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function isCameraStatus(value: string | null): value is CameraStatus {
  return value !== null && (CAMERA_STATUSES as readonly string[]).includes(value)
}

/**
 * Chuẩn hoá response live-stream về shape `LiveStreamResponse`.
 *
 * BE trả về (sau 1 lớp bọc `data`):
 * ```json
 * { "data": { "cameraId": 12, "cameraName": "...", "channelId": "0",
 *             "stream": { "url": "https://.../live.m3u8" } } }
 * ```
 *
 * Vì `ensureObject` đã unwrap lớp `data` ta cần tự bóc tiếp `stream.url`.
 * Hàm trả `null` nếu không tìm thấy URL — caller sẽ báo lỗi rõ ràng.
 */
function normalizeLiveStream(
  raw: unknown,
  cameraId: number,
  query: LiveStreamQuery,
): LiveStreamResponse | null {
  const obj = ensureObject<Record<string, unknown>>(raw)
  if (!obj) return null

  // `stream` có thể nằm trực tiếp ở `obj` hoặc bọc thêm 1 lớp nữa.
  const streamObj = ensureObject<Record<string, unknown>>(obj.stream)
  const url =
    pickString(streamObj ?? {}, 'url', 'hlsUrl', 'streamUrl') ??
    pickString(obj, 'url', 'hlsUrl', 'streamUrl')

  if (!url) return null

  return {
    cameraId: pickNumber(obj, 'cameraId', 'camera_id') ?? cameraId,
    cameraName: pickString(obj, 'cameraName', 'camera_name') ?? '',
    channelId: pickString(obj, 'channelId', 'channel_id') ?? query.channelId ?? '0',
    stream: { url },
  }
}

export const cameraApi = {
  /** GET /api/cameras — danh sách camera. */
  async list(query: CameraListQuery = {}): Promise<Camera[]> {
    const response = await apiClient.get<unknown>('/api/cameras', {
      params: query,
    })
    return ensureArray<unknown>(response.data).map(normalizeCamera)
  },
  /**
   * POST /api/cameras — đăng ký camera Imou mới.
   *
   * 409 nếu `cameraCode` đã tồn tại.
   *
   * Trả `null` nếu BE trả 201 nhưng body rỗng — caller nên refetch list
   * thay vì dựng object giả với `id: 0` (id giả sẽ làm hỏng cache).
   */
  async create(payload: CreateCameraRequest): Promise<Camera | null> {
    const response = await apiClient.post<unknown>('/api/cameras', payload)
    const raw = ensureObject<unknown>(response.data)
    return raw ? normalizeCamera(raw) : null
  },

  /** GET /api/cameras/{cameraId} — chi tiết camera. */
  async getById(cameraId: number): Promise<Camera | null> {
    const response = await apiClient.get<unknown>(
      `/api/cameras/${cameraId}`,
    )
    const raw = ensureObject<unknown>(response.data)
    return raw ? normalizeCamera(raw) : null
  },

  /** PUT /api/cameras/{cameraId} — cập nhật camera (partial). */
  async update(
    cameraId: number,
    payload: UpdateCameraRequest,
  ): Promise<Camera | null> {
    const response = await apiClient.put<unknown>(
      `/api/cameras/${cameraId}`,
      payload,
    )
    const raw = ensureObject<unknown>(response.data)
    return raw ? normalizeCamera(raw) : null
  },

  /** DELETE /api/cameras/{cameraId} — 409 nếu camera đang được tham chiếu. */
  async remove(cameraId: number): Promise<void> {
    await apiClient.delete(`/api/cameras/${cameraId}`)
  },

  // ─── Live stream (Imou cloud) ──────────────────────────────────────────

  /**
   * GET /api/cameras/live-streams — đọc thông tin phiên đang chạy.
   *
   * Không khởi động phiên mới. HLS URL có thời hạn ngắn.
   */
  async listLiveSessions(
    query: LiveSessionListQuery = {},
  ): Promise<LiveSession[]> {
    const response = await apiClient.get<unknown>('/api/cameras/live-streams', {
      params: query,
    })
    return ensureArray<LiveSession>(response.data)
  },

  /**
   * GET /api/cameras/{cameraId}/live-stream — link live tạm thời.
   *
   * Yêu cầu camera có `camera_code` chứa Imou device ID, và token thuộc
   * admin hoặc farm operator. 503 nghĩa là BE chưa cấu hình Imou credentials.
   *
   * Response thực tế (đã xác nhận từ BE):
   * ```json
   * { "data": { "cameraId": 12, "cameraName": "...", "channelId": "0",
   *             "stream": { "url": "https://.../live.m3u8" } } }
   * ```
   * → unwrap lớp `data` và trả về đúng shape `LiveStreamResponse`.
   */
  async getLiveStream(
    cameraId: number,
    query: LiveStreamQuery = {},
  ): Promise<LiveStreamResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/cameras/${cameraId}/live-stream`,
      { params: { channelId: query.channelId ?? '0' } },
    )
    return normalizeLiveStream(response.data, cameraId, query)
  },

  /**
   * POST /api/cameras/{cameraId}/live-stream — bắt đầu hoặc lấy phiên live.
   *
   * 409 nghĩa là camera không ở trạng thái ACTIVE.
   */
  async startLiveStream(
    cameraId: number,
    query: LiveStreamQuery = {},
  ): Promise<LiveStreamResponse | null> {
    const response = await apiClient.post<unknown>(
      `/api/cameras/${cameraId}/live-stream`,
      undefined,
      { params: { channelId: query.channelId ?? '0' } },
    )
    return normalizeLiveStream(response.data, cameraId, query)
  },

  /**
   * POST /api/cameras/{cameraId}/live-stream/stop — dừng phiên của một kênh.
   *
   * Không đổi trạng thái camera trong DB.
   */
  async stopLiveStream(
    cameraId: number,
    query: LiveStreamQuery = {},
  ): Promise<void> {
    await apiClient.post(
      `/api/cameras/${cameraId}/live-stream/stop`,
      undefined,
      { params: { channelId: query.channelId ?? '0' } },
    )
  },

  /**
   * POST /api/cameras/live-streams/stop — dừng phiên bằng liveToken.
   *
   * ⚠ `LIVE_STREAM_STOP_TOKEN_GAP`
   * BE yêu cầu `liveToken` trong body, nhưng lại **không** trả token về ở
   * `GET /api/cameras/live-streams` ("live tokens are never returned").
   * Client không có đường nào để lấy giá trị này một cách hợp lệ, nên hàm
   * này chỉ dùng được khi BE đổi chính sách (trả token, hoặc bỏ hẳn endpoint
   * này và chỉ dùng `/live-stream/stop` theo cameraId + channelId).
   *
   * Giữ lại để sẵn sàng cho BE; xem `stopLiveStreamByCamera` ở trên cho
   * luồng dùng được ngay.
   */
  async stopLiveSessionByToken(
    payload: StopLiveSessionRequest,
  ): Promise<void> {
    await apiClient.post('/api/cameras/live-streams/stop', payload)
  },
}

/** Endpoint này chưa dùng được end-to-end — xem `LIVE_STREAM_STOP_TOKEN_GAP`. */
export const LIVE_STREAM_STOP_TOKEN_GAP =
  'POST /api/cameras/live-streams/stop yêu cầu liveToken nhưng BE không trả liveToken cho client.'