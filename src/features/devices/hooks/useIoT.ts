/**
 * IoT Hooks — React Query wrappers cho iot.api.ts.
 * Phases 4 (cultivation), 6 (IoT devices & auto-misting).
 *
 * Pattern:
 * - API layer (iot.api.ts) trả `T | null` (defensive — chấp nhận mọi BE response shape).
 * - Hook layer bọc API call với fallback → luôn trả non-null type.
 * - UI consumers gọi `.map()` an toàn vì hooks luôn trả array/object hợp lệ.
 */
import { useMemo } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { autoMistingApi, iotApi } from '../api/iot.api'
import { filterActiveSensors } from '../utils/iot-node-scope'
import type {
  AutoControlEvaluateResult,
  AutoControlLogEntry,
  AutoControlLogsQuery,
  AutoControlState,
  AutoControlSuggestions,
  AutoMistingConfiguration,
  CreateIotCommandRequest,
  CultivationFloorMapping,
  FloorEnvironmentResponse,
  IotCommand,
  IotHistoryQuery,
  IotHistoryResponse,
  IotMaster,
  IotSensor,
  IotSensorsResponse,
  IotSsrChannelState,
  IotSsrResponse,
} from '../../../types/iot'

// ─── Query Keys ─────────────────────────────────────────────────────────
export const iotKeys = {
  all: ['iot'] as const,
  masters: () => [...iotKeys.all, 'masters'] as const,
  sensors: (masterId: string) => [...iotKeys.all, 'sensors', masterId] as const,
  history: (
    masterId: string,
    nodeId: number,
    sensorId: number,
  ) => [...iotKeys.all, 'history', masterId, nodeId, sensorId] as const,
  ssr: (masterId: string) => [...iotKeys.all, 'ssr', masterId] as const,
  command: (commandId: string) =>
    [...iotKeys.all, 'commands', commandId] as const,
  floors: () => [...iotKeys.all, 'floors'] as const,
  floor: (floorId: number) => [...iotKeys.all, 'floors', floorId] as const,
  autoControl: (floorId: number) =>
    [...iotKeys.all, 'auto-control', floorId] as const,
  autoControlSuggestions: (floorId: number) =>
    [...iotKeys.all, 'auto-control-suggestions', floorId] as const,
  autoControlStatus: (floorId: number) =>
    [...iotKeys.all, 'auto-control-status', floorId] as const,
  autoControlLogs: (floorId: number) =>
    [...iotKeys.all, 'auto-control-logs', floorId] as const,
}

// ─── Masters / Sensors / History ────────────────────────────────────────

export function useMasterList(
  options?: Partial<UseQueryOptions<IotMaster[], Error>>,
) {
  return useQuery<IotMaster[], Error>({
    queryKey: iotKeys.masters(),
    queryFn: () => iotApi.listMasters(),
    staleTime: 30_000,
    ...options,
  })
}

export function useMasterSensors(
  masterId: string | null,
  options?: Partial<UseQueryOptions<IotSensorsResponse, Error>>,
) {
  return useQuery<IotSensorsResponse, Error>({
    queryKey: iotKeys.sensors(masterId ?? ''),
    queryFn: async () => {
      const result = await iotApi.listSensors(masterId as string)
      if (!result) return { masterId: masterId ?? '', sensors: [] }
      return {
        masterId: result.masterId,
        sensors: filterActiveSensors(result.sensors ?? []),
      }
    },
    enabled: masterId !== null && masterId.length > 0,
    staleTime: 15_000,
    ...options,
  })
}

export function useSensorHistory(
  masterId: string | null,
  nodeId: number | null,
  sensorId: number | null,
  query?: IotHistoryQuery,
  options?: Partial<UseQueryOptions<IotHistoryResponse, Error>>,
) {
  return useQuery<IotHistoryResponse, Error>({
    queryKey: [
      ...iotKeys.history(
        masterId ?? '',
        nodeId ?? -1,
        sensorId ?? -1,
      ),
      query,
    ],
    queryFn: async () => {
      const result = await iotApi.getHistory(
        masterId as string,
        nodeId as number,
        sensorId as number,
        query,
      )
      return result ?? {
        masterId: masterId ?? '',
        nodeId: nodeId ?? 0,
        sensorId: sensorId ?? 0,
        limit: 0,
        offset: 0,
        readings: [],
      }
    },
    enabled:
      masterId !== null &&
      masterId.length > 0 &&
      nodeId !== null &&
      nodeId > 0 &&
      sensorId !== null &&
      sensorId > 0,
    staleTime: 60_000,
    ...options,
  })
}

// ─── SSR (Manual Relay Control) ──────────────────────────────────────

export function useSsrStatus(
  masterId: string | null,
  options?: Partial<UseQueryOptions<IotSsrResponse, Error>>,
) {
  return useQuery<IotSsrResponse, Error>({
    queryKey: iotKeys.ssr(masterId ?? ''),
    queryFn: async () => {
      const result = await iotApi.getSsr(masterId as string)
      return result ?? { masterId: masterId ?? '', channels: [] }
    },
    enabled: masterId !== null && masterId.length > 0,
    staleTime: 10_000,
    refetchInterval: 10_000,
    ...options,
  })
}

export function useSsrCommand(
  options?: UseMutationOptions<
    IotCommand,
    Error,
    {
      masterId: string
      channel: number
      payload: CreateIotCommandRequest
    }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<
    IotCommand,
    Error,
    { masterId: string; channel: number; payload: CreateIotCommandRequest }
  >({
    mutationFn: async ({ masterId, channel, payload }) => {
      const result = await iotApi.createManualCommand(masterId, channel, payload)
      if (!result) throw new Error('Không thể tạo lệnh SSR')
      return result
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: iotKeys.ssr(variables.masterId),
      })
    },
    ...options,
  })
}

export function useCommandStatus(
  commandId: string | null,
  options?: Partial<UseQueryOptions<IotCommand, Error>>,
) {
  return useQuery<IotCommand, Error>({
    queryKey: iotKeys.command(commandId ?? ''),
    queryFn: async () => {
      const result = await iotApi.getCommandStatus(commandId as string)
      if (!result) throw new Error('Không tìm thấy trạng thái lệnh')
      return result
    },
    enabled: commandId !== null && commandId.length > 0,
    refetchInterval: 2_000,
    ...options,
  })
}

// ─── Cultivation Floors ───────────────────────────────────────────────

export function useFloorList(
  options?: Partial<UseQueryOptions<CultivationFloorMapping[], Error>>,
) {
  return useQuery<CultivationFloorMapping[], Error>({
    queryKey: iotKeys.floors(),
    queryFn: () => autoMistingApi.listFloors(),
    staleTime: 60_000,
    ...options,
  })
}

export function useCreateFloor(
  options?: UseMutationOptions<
    CultivationFloorMapping,
    Error,
    CultivationFloorMapping
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<CultivationFloorMapping, Error, CultivationFloorMapping>({
    mutationFn: async (payload) => {
      const result = await autoMistingApi.createFloor(payload)
      if (!result) throw new Error('Không thể tạo cấu hình tầng')
      return result
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: iotKeys.floors() })
    },
    ...options,
  })
}

export function useUpdateFloor(
  options?: UseMutationOptions<
    CultivationFloorMapping,
    Error,
    { floorId: number; payload: CultivationFloorMapping }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<
    CultivationFloorMapping,
    Error,
    { floorId: number; payload: CultivationFloorMapping }
  >({
    mutationFn: async ({ floorId, payload }) => {
      const result = await autoMistingApi.updateFloor(floorId, payload)
      if (!result) throw new Error('Không thể cập nhật cấu hình tầng')
      return result
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: iotKeys.floors() })
    },
    ...options,
  })
}

export function useAssignFloorToTray(
  options?: UseMutationOptions<
    void,
    Error,
    { floorId: number; trayId: number }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { floorId: number; trayId: number }>({
    mutationFn: async ({ floorId, trayId }) => {
      await autoMistingApi.assignFloorToTray(floorId, trayId)
    },
    onSuccess: (_data, variables) => {
      // Gán khay xong thì 3 thứ đều đổi:
      //  - danh sách tầng (đã có ở key `floors`)
      //  - môi trường tầng: số sensor + độ ẩm trung bình
      //  - cấu hình auto-control đã gán (GET .../auto-control)
      // Phải gọi cả key của query **đang active** (có hậu tố 'environment'),
      // vì `invalidateQueries` so khớp theo tiền tố.
      void queryClient.invalidateQueries({ queryKey: iotKeys.floors() })
      void queryClient.invalidateQueries({
        queryKey: [...iotKeys.floor(variables.floorId), 'environment'],
      })
      void queryClient.invalidateQueries({
        queryKey: iotKeys.autoControl(variables.floorId),
      })
    },
    ...options,
  })
}

/** Môi trường thực tế của tầng: sensors + độ ẩm trung bình. */
export function useFloorEnvironment(
  floorId: number | null,
  options?: Partial<
    UseQueryOptions<
      { sensors: IotSensor[]; avgHumidity: number | null },
      Error
    >
  >,
) {
  return useQuery<{ sensors: IotSensor[]; avgHumidity: number | null }, Error>({
    queryKey: [...iotKeys.floor(floorId ?? -1), 'environment'],
    queryFn: async () => {
      const result = await autoMistingApi.getEnvironment(floorId as number)
      if (!result) return { sensors: [], avgHumidity: null }
      return {
        sensors: filterActiveSensors(result.sensors ?? []),
        avgHumidity: result.avgHumidity,
      }
    },
    enabled: floorId !== null && floorId > 0,
    staleTime: 15_000,
    ...options,
  })
}

/** Kết quả môi trường tầng, đã áp dụng fallback khi BE chưa map sensor. */
export interface ResolvedFloorEnvironment {
  sensors: IotSensor[]
  avgHumidity: number | null
  /** `true` khi dữ liệu lấy từ telemetry Master thay vì từ API environment. */
  isFallback: boolean
  /** Master mà fallback dùng để lấy telemetry (chỉ có khi `isFallback`). */
  masterId: string | null
}

/**
 * Môi trường tầng có fallback sang telemetry Master.
 *
 * Vấn đề: `GET /api/iot/floors/{floorId}/environment` map sensor thông qua
 * bảng tray (`tray.node_id`/`tray.sensor_id`). Khi DB chưa cấu hình 2 cột đó
 * cho khay, endpoint trả `sensors: []` dù tầng **có** node đã gán và tầng đó
 * đang báo cáo dữ liệu thật qua RS485.
 *
 * Cách khắc phục phía FE: lấy `GET /api/iot/masters/{masterId}/sensors`
 * rồi lọc theo `node_address` của tầng. Master là nguồn telemetry, nên dữ liệu
 * ở đây là số đo thật — chỉ khác ở chỗ *ánh xạ* sang khay.
 *
 * ⚠ Khi BE đã map đủ `tray.node_id`/`sensor_id`, `isFallback` = false và
 * hook này cho ra đúng kết quả của API gốc — không ảnh hưởng hành vi.
 */
export function useResolvedFloorEnvironment(
  floorId: number | null,
  masterId: string | null,
  nodeAddress: number | null,
) {
  const floorEnv = useFloorEnvironment(floorId)
  const masterSensors = useMasterSensors(masterId, {
    enabled: masterId !== null && masterId.length > 0,
  })

  const resolved = useMemo<ResolvedFloorEnvironment>(() => {
    const apiSensors = floorEnv.data?.sensors ?? []
    const apiAvgHumidity = floorEnv.data?.avgHumidity ?? null

    // API đã có sensor → dùng luôn, không fallback.
    if (apiSensors.length > 0) {
      return {
        sensors: apiSensors,
        avgHumidity: apiAvgHumidity,
        isFallback: false,
        masterId: null,
      }
    }

    // BE chưa map tray → node_id/sensor_id: lấy telemetry Master, lọc
    // theo node_address của tầng rồi tự tính độ ẩm trung bình.
    if (nodeAddress === null) {
      return {
        sensors: [],
        avgHumidity: apiAvgHumidity,
        isFallback: false,
        masterId: null,
      }
    }

    const fallbackSensors = (masterSensors.data?.sensors ?? []).filter(
      (sensor) => sensor.nodeId === nodeAddress,
    )

    if (fallbackSensors.length === 0) {
      return {
        sensors: [],
        avgHumidity: apiAvgHumidity,
        isFallback: false,
        masterId: null,
      }
    }

    const values = fallbackSensors
      .map((sensor) => sensor.humidity)
      .filter((h): h is number => typeof h === 'number' && Number.isFinite(h))

    return {
      sensors: fallbackSensors,
      avgHumidity:
        values.length > 0
          ? values.reduce((sum, h) => sum + h, 0) / values.length
          : null,
      isFallback: true,
      masterId: masterId ?? null,
    }
  }, [
    floorEnv.data,
    masterSensors.data,
    masterId,
    nodeAddress,
  ])

  return {
    ...floorEnv,
    data: resolved,
    isFallback: resolved.isFallback,
    fallbackMasterId: resolved.isFallback ? resolved.masterId : null,
    fallbackNodeAddress: nodeAddress,
    isLoadingMaster: masterSensors.isLoading,
  }
}

export function useFloorConfig(
  floorId: number | null,
  options?: Partial<UseQueryOptions<AutoMistingConfiguration, Error>>,
) {
  return useQuery<AutoMistingConfiguration, Error>({
    queryKey: iotKeys.autoControl(floorId ?? -1),
    queryFn: async () => {
      const result = await autoMistingApi.getConfig(floorId as number)
      if (result) return result
      // Fallback matching actual AutoMistingConfiguration fields from iot.ts
      return {
        mushroom_type_id: 0,
        humidity_min: 70,
        humidity_max: 95,
        humidity_start_threshold: 75,
        humidity_stop_threshold: 90,
        misting_pulse_ms: 100,
        cooldown_ms: 30000,
        evaluation_interval_ms: 300000,
        max_sensor_spread_percent: 10,
        max_activations_per_hour: 12,
        max_cumulative_on_ms_per_hour: 600000,
      }
    },
    enabled: floorId !== null && floorId > 0,
    staleTime: 60_000,
    ...options,
  })
}

export function useFloorAutoControlStatus(
  floorId: number | null,
  options?: Partial<UseQueryOptions<AutoControlRuntimeStatus, Error>>,
) {
  return useQuery<AutoControlRuntimeStatus, Error>({
    queryKey: iotKeys.autoControlStatus(floorId ?? -1),
    queryFn: async () => {
      const result = await autoMistingApi.getStatus(floorId as number)
      if (result) return result
      return {
        state: 'STOPPED',
        startedAt: null,
        stoppedAt: null,
        lastEvaluationAt: null,
        message: null,
      }
    },
    enabled: floorId !== null && floorId > 0,
    refetchInterval: 5_000,
    ...options,
  })
}

export function useFloorAutoControlLogs(
  floorId: number | null,
  limit = 50,
  options?: Partial<UseQueryOptions<AutoControlLogEntry[], Error>>,
) {
  return useQuery<AutoControlLogEntry[], Error>({
    queryKey: iotKeys.autoControlLogs(floorId ?? -1),
    queryFn: () => autoMistingApi.getLogs(floorId as number, limit),
    enabled: floorId !== null && floorId > 0,
    staleTime: 30_000,
    ...options,
  })
}

// ─── Auto-misting Mutations ────────────────────────────────────────────

function invalidateFloor(
  queryClient: ReturnType<typeof useQueryClient>,
  floorId: number,
) {
  void queryClient.invalidateQueries({
    queryKey: iotKeys.autoControl(floorId),
  })
  void queryClient.invalidateQueries({
    queryKey: iotKeys.autoControlStatus(floorId),
  })
  void queryClient.invalidateQueries({
    queryKey: iotKeys.autoControlLogs(floorId),
  })
  void queryClient.invalidateQueries({ queryKey: iotKeys.floors() })
}

export function useSaveAutoControlConfig(
  options?: UseMutationOptions<
    AutoMistingConfiguration,
    Error,
    { floorId: number; payload: AutoMistingConfiguration }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<
    AutoMistingConfiguration,
    Error,
    { floorId: number; payload: AutoMistingConfiguration }
  >({
    mutationFn: async ({ floorId, payload }) => {
      const result = await autoMistingApi.saveConfig(floorId, payload)
      if (!result) throw new Error('Không thể lưu cấu hình auto-misting')
      return result
    },
    onSuccess: (_data, variables) => {
      invalidateFloor(queryClient, variables.floorId)
    },
    ...options,
  })
}

export function useStartAutoMisting(
  options?: UseMutationOptions<
    AutoControlRuntimeStatus,
    Error,
    number
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<AutoControlRuntimeStatus, Error, number>({
    mutationFn: async (floorId) => {
      const result = await autoMistingApi.start(floorId)
      if (!result) throw new Error('Không thể khởi động auto-misting')
      return result
    },
    onSuccess: (_data, floorId) => {
      invalidateFloor(queryClient, floorId)
    },
    ...options,
  })
}

export function useStopAutoMisting(
  options?: UseMutationOptions<
    AutoControlRuntimeStatus,
    Error,
    number
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<AutoControlRuntimeStatus, Error, number>({
    mutationFn: async (floorId) => {
      const result = await autoMistingApi.stop(floorId)
      if (!result) throw new Error('Không thể dừng auto-misting')
      return result
    },
    onSuccess: (_data, floorId) => {
      invalidateFloor(queryClient, floorId)
    },
    ...options,
  })
}

export function useEvaluateAutoMisting(
  options?: UseMutationOptions<
    AutoControlEvaluateResult,
    Error,
    number
  >,
) {
  return useMutation<AutoControlEvaluateResult, Error, number>({
    mutationFn: async (floorId) => {
      const result = await autoMistingApi.evaluate(floorId)
      if (!result)
        throw new Error('Không thể đánh giá điều kiện auto-misting')
      return result
    },
    ...options,
  })
}

// ─── SSR Channels helper (flat channel list) ──────────────────────────
export function useSsrChannels(
  masterId: string | null,
  options?: Partial<UseQueryOptions<IotSsrChannelState[], Error>>,
) {
  return useQuery<IotSsrChannelState[], Error>({
    queryKey: iotKeys.ssr(masterId ?? ''),
    queryFn: async () => {
      const ssr = await iotApi.getSsr(masterId as string)
      return ssr?.channels ?? []
    },
    enabled: masterId !== null && masterId.length > 0,
    staleTime: 10_000,
    refetchInterval: 10_000,
    ...options,
  })
}
