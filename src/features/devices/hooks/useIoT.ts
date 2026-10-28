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
  useQueries,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { autoMistingApi, iotApi } from '../api/iot.api'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import { filterActiveSensors } from '../utils/iot-node-scope'
import type {
  AutoControlConfigRecord,
  AutoControlConfigurationResponse,
  AutoControlLogsQuery,
  AutoControlLogsResponse,
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
  /**
   * Cache cho endpoint `GET /api/iot/floors/{floorId}/auto-control`.
   *
   * ⚠ Một key = MỘT shape dữ liệu. Response đầy đủ `{ config, mode, ... }`
   * được cache tại đây; các consumer cần view khác (vd chỉ `config`) dùng
   * `select` để suy ra — **không** tạo key riêng, vì key riêng sẽ gây
   * tranh chấp shape khi 2 hook dùng chung 1 key.
   */
  autoControlConfig: (floorId: number) =>
    [...iotKeys.all, 'auto-control-config', floorId] as const,
  autoControlStatus: (floorId: number) =>
    [...iotKeys.all, 'auto-control-status', floorId] as const,
  autoControlLogs: (floorId: number, query: AutoControlLogsQuery) =>
    [...iotKeys.all, 'auto-control-logs', floorId, query] as const,
}

// ─── Masters / Sensors / History ────────────────────────────────────────

/**
 * Chu kỳ polling telemetry thời gian thực (ms).
 *
 * ⚠ Master gửi telemetry qua MQTT; BE cập nhật `iot_sensor_latest` khi nhận
 * được gói tin. Chu kỳ 3s đủ để số liệu "chạy" mà chưa dồn tải lên BE.
 *
 * → Được dùng bởi `useMasterSensors` và `useFloorEnvironment` (bảng "Cảm biến
 * môi trường" + drawer môi trường tầng).
 */
export const TELEMETRY_POLL_INTERVAL_MS = 3_000

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

/**
 * Telemetry cảm biến của một Master — **real-time**.
 *
 * ⚠ `refetchInterval: 3000` để bảng "Cảm biến môi trường" tự cập nhật số
 * liệu mà không cần reload trang.
 *
 * ## Tắt polling khi chuyển tab "Lịch sử"
 *
 * `options.refetchInterval` được truyền xuống ⇒ consumer chỉ cần truyền
 * `refetchInterval: false` (hoặc `0`) khi rời khỏi màn hình thời gian thực
 * ⇒ TanStack Query dừng hẳn timer, không còn gọi API nữa.
 *
 * ⚠ `staleTime` **phải** ≤ `refetchInterval` — nếu `staleTime` lớn hơn thì
 * lần refetch định kỳ sẽ bị coi là "còn fresh" và bị bỏ qua, dữ liệu sẽ
 * đứng yên. Vì vậy `staleTime` đặt bằng `refetchInterval` (3s).
 */
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
    staleTime: TELEMETRY_POLL_INTERVAL_MS,
    refetchInterval: TELEMETRY_POLL_INTERVAL_MS,
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
 *
 * → Polling 3s như `useMasterSensors` để drawer môi trường tầng cũng cập
 * nhật real-time. Consumer truyền `refetchInterval: false` để tắt.
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
    staleTime: TELEMETRY_POLL_INTERVAL_MS,
    refetchInterval: TELEMETRY_POLL_INTERVAL_MS,
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
  options?: {
    /**
     * Chu kỳ polling (ms) — truyền `false` để tắt polling.
     *
     * ⚠ Truyền xuống **cả hai** query (`/environment` và `/masters/{id}/sensors`)
     * vì cả hai đều là nguồn telemetry. Nếu chỉ tắt một, query còn lại vẫn
     * gọi API mỗi 3s ⇒ không tiết kiệm được gì.
     */
    refetchInterval?: number | false
  },
) {
  const { refetchInterval = TELEMETRY_POLL_INTERVAL_MS } = options ?? {}

  const floorEnv = useFloorEnvironment(floorId, { refetchInterval })
  const masterSensors = useMasterSensors(masterId, {
    enabled: masterId !== null && masterId.length > 0,
    refetchInterval,
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

// ─── Tưới phun sương tự động (CHỈ ĐỌC) ─────────────────────────────────
//
// ⚠ Web admin KHÔNG sửa cấu hình. Các endpoint ghi (PUT /auto-control,
// POST /start, /stop, /evaluate) thuộc quyền `iot.automation.manage` —
// nhân viên (staff) thực hiện trên mobile app. Ở đây chỉ có GET.

/**
 * Chuẩn hoá response `GET /api/iot/floors/{floorId}/auto-control` về đúng
 * shape `{ config, mode, ... }`.
 *
 * ⚠ BE trả `{ data: { config, mode, ... } }` — `ensureObject` đã bóc lớp
 * `data` (`response-normalizer.ts`). Nhưng để chống "đọc nhầm shape" khi
 * cache bị ghi bởi consumer khác, hàm này còn:
 *   - coi object **không có** key `config` là bản ghi config thuần
 *     (BE có thể trả thẳng row cấu hình) → bọc lại thành `{ config: row }`,
 *   - chuẩn hoá `floor_id` về number (BE trả `SERIAL` → number, nhưng
 *     defensive để tránh so sánh `1` vs `'1'`).
 */
function normalizeAutoControlResponse(
  raw: AutoControlConfigurationResponse | null | undefined,
): AutoControlConfigurationResponse {
  if (!raw || typeof raw !== 'object') return {}

  // Đã đúng shape response → trả nguyên vẹn.
  if ('config' in raw || 'mode' in raw) {
    return {
      ...raw,
      config: raw.config ?? null,
      mode: raw.mode ?? 'MANUAL',
    }
  }

  // Không có key `config`/`mode` → coi như BE trả thẳng bản ghi cấu hình.
  return { config: raw as unknown as AutoControlConfigRecord, mode: 'MANUAL' }
}

/**
 * Cấu hình tự động hiện tại của một tầng.
 *
 * `GET /api/iot/floors/{floorId}/auto-control` → `{ config, mode, ... }`.
 * `config` là `null` khi tầng chưa được cấu hình — UI hiển thị "Chưa có
 * cấu hình" thay vì đoán.
 */
export function useAutoControlConfiguration(
  floorId: number | null,
  options?: Partial<
    UseQueryOptions<AutoControlConfigurationResponse, Error>
  >,
) {
  return useQuery<AutoControlConfigurationResponse, Error>({
    queryKey: iotKeys.autoControlConfig(floorId ?? -1),
    queryFn: async () => {
      const result = await autoMistingApi.getAutoControlConfiguration(
        floorId as number,
      )
      return normalizeAutoControlResponse(result)
    },
    enabled: floorId !== null && floorId > 0,
    staleTime: 30_000,
    ...options,
  })
}

/** Chỉ lấy phần `config` của cấu hình tự động — tiện cho consumer đơn giản. */
export function useAutoControlConfig(
  floorId: number | null,
  options?: Partial<
    UseQueryOptions<AutoControlConfigurationResponse, Error>
  >,
) {
  const query = useAutoControlConfiguration(floorId, options)
  const config = query.data?.config ?? null
  return { ...query, data: config }
}

/**
 * Nhật ký kích hoạt của một tầng.
 *
 * `GET /api/iot/floors/{floorId}/auto-control/logs` → `{ limit, offset, logs }`.
 */
export function useAutoControlLogs(
  floorId: number | null,
  query: AutoControlLogsQuery = {},
  options?: Partial<UseQueryOptions<AutoControlLogsResponse, Error>>,
) {
  return useQuery<AutoControlLogsResponse, Error>({
    queryKey: iotKeys.autoControlLogs(floorId ?? -1, query),
    queryFn: async () => {
      const result = await autoMistingApi.getAutoControlLogs(
        floorId as number,
        query,
      )
      return result ?? { limit: query.limit ?? 100, offset: query.offset ?? 0, logs: [] }
    },
    enabled: floorId !== null && floorId > 0,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Cấu hình tự động của **nhiều tầng** — dùng để bảng "Cấu hình tưới phun
 * sương tự động" hiển thị tóm tắt thông số của từng tầng.
 *
 * Endpoint `GET /api/iot/floors/{floorId}/auto-control` là read-only (chỉ cần
 * đăng nhập) nên Admin và Operator đều đọc được.
 *
 * ⚠ `retry: retryApiErrors` — chỉ thử lại 1 lần khi lỗi TẠM THỜI (timeout
 * khi backend Render đang thức dậy, 5xx, 429). Tầng chưa cấu hình trả
 * `config: null` (không phải lỗi) nên không ảnh hưởng.
 */
export function useAutoControlConfigList(floorIds: number[]) {
  const queries = useQueries({
    queries: floorIds.map((floorId) => ({
      // ⚠ Dùng CHUNG key `autoControlConfig` với `useAutoControlConfiguration`
      // — nhưng cả hai phải trả về CÙNG shape: response đầy đủ
      // `{ config, mode, ... }`.
      //
      // Lý do: React Query cache theo queryKey ⇒ **một key = một shape**.
      // Nếu hook này trả về bản ghi config (`{ misting_pulse_ms, ... }`)
      // còn hook kia trả response đầy đủ (`{ config, mode, ... }`), cache chỉ
      // giữ shape của hook chạy ĐẦU TIÊN. Modal mở sau sẽ đọc `data.config`
      // trên một bản ghi config → `undefined` → hiển thị nhầm "Tầng chưa có
      // cấu hình tưới tự động" dù tầng CÓ cấu hình.
      queryKey: iotKeys.autoControlConfig(floorId),
      queryFn: async () => {
        const result = await autoMistingApi.getAutoControlConfiguration(floorId)
        return result ?? {}
      },
      staleTime: 30_000,
      retry: retryApiErrors,
    })),
  })

  const isLoading = queries.some((query) => query.isLoading)
  const isFetching = queries.some((query) => query.isFetching)

  /** Map `floor_id` → cấu hình tự động (tầng chưa cấu hình không có entry). */
  const configByFloorId = useMemo(() => {
    const map = new Map<number, AutoControlConfigRecord>()
    floorIds.forEach((floorId, index) => {
      const config = queries[index]?.data?.config
      if (config) map.set(floorId, config)
    })
    return map
  }, [floorIds, queries])

  return { configByFloorId, isLoading, isFetching }
}
