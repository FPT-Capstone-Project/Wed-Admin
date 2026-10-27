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
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { autoMistingApi, iotApi } from '../api/iot.api'
import { filterActiveSensors } from '../utils/iot-node-scope'
import type {
  CultivationFloorMapping,
  FloorEnvironmentResponse,
  IotHistoryQuery,
  IotHistoryResponse,
  IotMaster,
  IotSensor,
  IotSensorsResponse,
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
  floors: () => [...iotKeys.all, 'floors'] as const,
  floor: (floorId: number) => [...iotKeys.all, 'floors', floorId] as const,
  autoControlSuggestions: (floorId: number) =>
    [...iotKeys.all, 'auto-control-suggestions', floorId] as const,
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
