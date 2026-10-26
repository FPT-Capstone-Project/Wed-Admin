import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { cameraApi } from '../api/camera.api'
import type {
  Camera,
  CameraListQuery,
  CreateCameraRequest,
  ImouPlayerToken,
  ImouPlayerTokenQuery,
  LiveSession,
  LiveSessionListQuery,
  LiveStreamQuery,
  LiveStreamResponse,
  UpdateCameraRequest,
} from '../../../types/camera.types'

/**
 * Query keys cho module Camera.
 *
 * - `cameras.all`      → mọi truy vấn camera (dùng để invalidate khi create/update/delete)
 * - `liveStreams.all`  → danh sách phiên live toàn hệ thống
 *
 * Lưu ý: invalidate `cameras.all` KHÔNG tự động đụng `liveStreams` vì live
 * stream là resource độc lập của Imou cloud — chỉ invalidate khi thao tác
 * start/stop thực sự diễn ra.
 */
export const cameraKeys = {
  all: ['cameras'] as const,
  lists: () => [...cameraKeys.all, 'list'] as const,
  list: (query: CameraListQuery) => [...cameraKeys.lists(), query] as const,
  details: () => [...cameraKeys.all, 'detail'] as const,
  detail: (cameraId: number) => [...cameraKeys.details(), cameraId] as const,
  liveStream: (cameraId: number, query: LiveStreamQuery) =>
    [...cameraKeys.details(), cameraId, 'live-stream', query] as const,
  /**
   * KitToken ImouPlayer — key dùng primitive để không tạo query mới khi
   * object `query` đổi identity giữa các lần render.
   */
  imouPlayerToken: (
    cameraId: number,
    channelId: string,
    streamId: number,
  ) =>
    [
      ...cameraKeys.details(),
      cameraId,
      'imou-player-token',
      channelId,
      streamId,
    ] as const,
}

export const liveStreamKeys = {
  all: ['live-streams'] as const,
  list: (query: LiveSessionListQuery) => [...liveStreamKeys.all, query] as const,
}

// ─── Queries ────────────────────────────────────────────────────────────

/** GET /api/cameras */
export function useCameras(
  query: CameraListQuery = {},
  options?: Partial<UseQueryOptions<Camera[], Error>>,
) {
  return useQuery<Camera[], Error>({
    queryKey: cameraKeys.list(query),
    queryFn: () => cameraApi.list(query),
    ...options,
  })
}

/** GET /api/cameras/{cameraId} — truyền `null` để tắt query. */
export function useCameraDetail(
  cameraId: number | null,
  options?: Partial<UseQueryOptions<Camera, Error>>,
) {
  return useQuery<Camera, Error>({
    queryKey: cameraKeys.detail(cameraId ?? -1),
    queryFn: async () => {
      const result = await cameraApi.getById(cameraId as number)
      if (!result) throw new Error(`Không tìm thấy camera ID ${cameraId}`)
      return result
    },
    enabled: cameraId !== null && cameraId > 0,
    ...options,
  })
}

/**
 * GET /api/cameras/{cameraId}/live-stream
 *
 * Response thực tế: `{ data: { cameraId, cameraName, channelId, stream: { url } } }`
 * → hook trả về `LiveStreamResponse` (đã unwrap lớp `data`).
 *
 * HLS URL chỉ hợp lệ ngắn hạn → `staleTime` ngắn. `refetchInterval` mặc định
 * không bật vì mỗi lần gọi đều là một lượt gọi tới Imou cloud; UI nên bấm
 * tay hoặc bật interval khi đang phát.
 */
export function useCameraLiveStream(
  cameraId: number | null,
  query: LiveStreamQuery = {},
  options?: Partial<UseQueryOptions<LiveStreamResponse, Error>>,
) {
  return useQuery<LiveStreamResponse, Error>({
    queryKey: cameraKeys.liveStream(cameraId ?? -1, query),
    queryFn: async () => {
      const result = await cameraApi.getLiveStream(cameraId as number, query)
      if (!result) throw new Error('Không lấy được link live stream')
      return result
    },
    enabled: cameraId !== null && cameraId > 0,
    staleTime: 30_000,
    ...options,
  })
}

/** GET /api/cameras/live-streams — trạng thái phiên live đang chạy. */
export function useLiveStreams(
  query: LiveSessionListQuery = {},
  options?: Partial<UseQueryOptions<LiveSession[], Error>>,
) {
  return useQuery<LiveSession[], Error>({
    queryKey: liveStreamKeys.list(query),
    queryFn: () => cameraApi.listLiveSessions(query),
    ...options,
  })
}

/**
 * GET /api/cameras/{cameraId}/imou-player-token
 *
 * KitToken hết hạn ~2 giờ theo Imou. Không cache trên client (`staleTime: 0`,
 * `gcTime: 0`) → mỗi lần mở modal lấy token mới, tránh phát với token cũ.
 */
export function useImouPlayerToken(
  cameraId: number | null,
  query: ImouPlayerTokenQuery = {},
  options?: Partial<UseQueryOptions<ImouPlayerToken | null, Error>>,
) {
  const channelId = query.channelId ?? '0'
  const streamId = query.streamId ?? 0

  return useQuery<ImouPlayerToken | null, Error>({
    queryKey: cameraKeys.imouPlayerToken(cameraId ?? -1, channelId, streamId),
    queryFn: async () => {
      if (cameraId === null || cameraId <= 0) return null
      return cameraApi.getImouPlayerToken(cameraId, { channelId, streamId })
    },
    enabled: cameraId !== null && cameraId > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────

/**
 * Wrapper chung: mọi mutation đều invalidate `cameras.all` khi thành công.
 *
 * `onSuccess` của caller vẫn được gọi sau (không nuốt), nên UI có thể vừa
 * báo thông báo vừa có dữ liệu mới.
 */
function useCameraMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  extraInvalidate?: (variables: TVariables) => Promise<unknown> | unknown,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables, onMutateResult, context) => {
      void queryClient.invalidateQueries({ queryKey: cameraKeys.all })
      if (extraInvalidate) {
        void queryClient.invalidateQueries({
          queryKey: liveStreamKeys.all,
        })
      }
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    onError: (err, variables, onMutateResult, context) => {
      options?.onError?.(err, variables, onMutateResult, context)
    },
  })
}

/** POST /api/cameras */
export function useRegisterCamera(
  options?: UseMutationOptions<Camera | null, Error, CreateCameraRequest>,
) {
  return useCameraMutation<Camera | null, CreateCameraRequest>(
    (payload) => cameraApi.create(payload),
    undefined,
    options,
  )
}

/** Body của `PUT /api/cameras/{cameraId}` + id trong path. */
export type UpdateCameraPayload = UpdateCameraRequest & { id: number }

/** PUT /api/cameras/{cameraId} */
export function useUpdateCamera(
  options?: UseMutationOptions<Camera | null, Error, UpdateCameraPayload>,
) {
  return useCameraMutation<Camera | null, UpdateCameraPayload>(
    ({ id, ...rest }) => cameraApi.update(id, rest),
    undefined,
    options,
  )
}

/** DELETE /api/cameras/{cameraId} — 409 nếu đang được tham chiếu. */
export function useDeleteCamera(
  options?: UseMutationOptions<void, Error, number>,
) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number>({
    mutationFn: (cameraId: number) => cameraApi.remove(cameraId),
    ...options,
    onSuccess: (data, cameraId, onMutateResult, context) => {
      void queryClient.invalidateQueries({ queryKey: cameraKeys.all })
      // Xoá xong thì detail/live-stream của camera đó không còn ý nghĩa.
      void queryClient.invalidateQueries({
        queryKey: [...cameraKeys.all, 'detail', cameraId],
      })
      void queryClient.invalidateQueries({ queryKey: liveStreamKeys.all })
      options?.onSuccess?.(data, cameraId, onMutateResult, context)
    },
    onError: (err, cameraId, onMutateResult, context) => {
      options?.onError?.(err, cameraId, onMutateResult, context)
    },
  })
}

/**
 * POST /api/cameras/{cameraId}/live-stream — bắt đầu/lấy phiên live.
 *
 * Invalidate cả `cameras.all` lẫn `live-streams` vì backend có thể đổi
 * trạng thái camera sang ACTIVE khi bắt đầu stream.
 */
export function useStartLiveStream(
  options?: UseMutationOptions<LiveStreamResponse | null, Error, number>,
) {
  return useCameraMutation<LiveStreamResponse | null, number>(
    async (cameraId) => {
      const result = await cameraApi.startLiveStream(cameraId)
      if (!result) throw new Error('Không khởi động được live stream')
      return result
    },
    () => undefined,
    options,
  )
}

/**
 * POST /api/cameras/{cameraId}/live-stream/stop
 *
 * Invalidate `cameras.all` có thể thừa (BE nói "does not change local camera
 * status") nhưng giữ lại để đồng nhất với các mutation khác.
 */
export function useStopLiveStream(
  options?: UseMutationOptions<void, Error, number>,
) {
  return useCameraMutation<void, number>(
    async (cameraId) => {
      await cameraApi.stopLiveStream(cameraId)
      return undefined
    },
    () => undefined,
    options,
  )
}