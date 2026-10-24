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
  AutoControlRuntimeStatus,
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

/**
 * Môi trường thực tế của tầng.
 *
 * ⚠ Endpoint `/environment` trả `FloorEnvironmentSensor` (`sensorId` +
 * `humidity`), **khác** `IotSensor` của `/masters/{id}/sensors` (`nodeId` +
 * `temperature`). Giữ đúng shape của endpoint để không mất `temperature`.
 */
export function useFloorEnvironment(
  floorId: number | null,
  options?: Partial<UseQueryOptions<FloorEnvironmentResponse, Error>>,
) {
  return useQuery<FloorEnvironmentResponse, Error>({
    queryKey: [...iotKeys.floor(floorId ?? -1), 'environment'],
    queryFn: async () => {
      const result = await autoMistingApi.getEnvironment(floorId as number)
      return (
        result ?? {
          masterId: '',
          nodeId: 0,
          avgHumidity: null,
          avgTemperature: null,
          spread: null,
          temperatureSpread: null,
          healthy: null,
          reason: null,
          sensors: [],
          thresholds: null,
        }
      )
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
  /** Nhiệt độ trung bình — chỉ có khi endpoint `/environment` trả về. */
  avgTemperature: number | null
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
    // Chuẩn hoá sensor của endpoint `/environment` sang `IotSensor` để các
    // consumer dùng chung một shape (nodeId + temperature + humidity).
    const apiSensors: IotSensor[] = (floorEnv.data?.sensors ?? []).map((s) => ({
      masterId: floorEnv.data?.masterId ?? '',
      nodeId: floorEnv.data?.nodeId ?? 0,
      sensorId: s.sensorId,
      temperature: s.temperature ?? null,
      humidity: s.humidity,
      ok: s.valid,
      lastReceivedAt: null,
      lastValidAt: null,
      measuredAt: null,
      retained: s.retained,
    }))
    const apiAvgHumidity = floorEnv.data?.avgHumidity ?? null
    const apiAvgTemperature = floorEnv.data?.avgTemperature ?? null

    // API đã có sensor → dùng luôn, không fallback.
    if (apiSensors.length > 0) {
      return {
        sensors: apiSensors,
        avgHumidity: apiAvgHumidity,
        avgTemperature: apiAvgTemperature,
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
        avgTemperature: apiAvgTemperature,
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
        avgTemperature: apiAvgTemperature,
        isFallback: false,
        masterId: null,
      }
    }

    const values = fallbackSensors
      .map((sensor) => sensor.humidity)
      .filter((h): h is number => typeof h === 'number' && Number.isFinite(h))

    const temps = fallbackSensors
      .map((sensor) => sensor.temperature)
      .filter((t): t is number => typeof t === 'number' && Number.isFinite(t))

    return {
      sensors: fallbackSensors,
      avgHumidity:
        values.length > 0
          ? values.reduce((sum, h) => sum + h, 0) / values.length
          : null,
      avgTemperature:
        temps.length > 0
          ? temps.reduce((sum, t) => sum + t, 0) / temps.length
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

/**
 * Cấu hình auto-misting đang lưu của tầng.
 *
 * ⚠ Trả `null` khi BE chưa có config (tầng chưa được thiết lập lần đầu) —
 *   đây là trạng thái **bình thường**, không phải lỗi. Consumer phải xử lý
 *   cả `null` (thường là mở form với giá trị mặc định).
 */
export function useFloorConfig(
  floorId: number | null,
  options?: Partial<UseQueryOptions<AutoMistingConfiguration | null, Error>>,
) {
  return useQuery<AutoMistingConfiguration | null, Error>({
    queryKey: iotKeys.autoControl(floorId ?? -1),
    queryFn: async () => {
      const result = await autoMistingApi.getConfig(floorId as number)
      return result?.config ?? null
    },
    enabled: floorId !== null && floorId > 0,
    staleTime: 60_000,
    ...options,
  })
}

/**
 * Ngưỡng đề xuất do BE tính — nguồn duy nhất, FE không tự suy luận.
 *
 * Swagger: *"Uses ACTIVE tray sessions linked to ACTIVE rentals on the same
 * tray; returns sourceProfiles, common, issues, warnings, config. Config is
 * null for missing, conflicting or too narrow conditions. No database writes
 * or device commands."*
 */
export function useFloorAutoControlSuggestions(
  floorId: number | null,
  options?: Partial<UseQueryOptions<AutoControlSuggestions, Error>>,
) {
  return useQuery<AutoControlSuggestions, Error>({
    queryKey: iotKeys.autoControlSuggestions(floorId ?? -1),
    queryFn: async () => {
      const result = await autoMistingApi.getSuggestions(floorId as number)
      return (
        result ?? {
          sourceProfiles: [],
          common: null,
          issues: [],
          warnings: [],
          config: null,
        }
      )
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
      // Endpoint trả cùng shape `AutoControlState`; thiếu `mode` thì coi
      // như đang MANUAL để UI mặc định về trạng thái dừng.
      return result ?? {
        mode: 'MANUAL',
        config: null,
        run: null,
        runtime: null,
        ssr: null,
      }
    },
    enabled: floorId !== null && floorId > 0,
    refetchInterval: 5_000,
    ...options,
  })
}

export function useFloorAutoControlLogs(
  floorId: number | null,
  query: AutoControlLogsQuery = {},
  options?: Partial<UseQueryOptions<AutoControlLogEntry[], Error>>,
) {
  return useQuery<AutoControlLogEntry[], Error>({
    queryKey: [...iotKeys.autoControlLogs(floorId ?? -1), query],
    queryFn: () => autoMistingApi.getLogs(floorId as number, query),
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
    AutoControlState,
    Error,
    { floorId: number; payload: AutoMistingConfiguration }
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<
    AutoControlState,
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
  options?: UseMutationOptions<AutoControlState, Error, number>,
) {
  const queryClient = useQueryClient()
  return useMutation<AutoControlState, Error, number>({
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
  options?: UseMutationOptions<AutoControlState, Error, number>,
) {
  const queryClient = useQueryClient()
  return useMutation<AutoControlState, Error, number>({
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
