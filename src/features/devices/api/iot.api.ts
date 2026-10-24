import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
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

// ─── IoT Masters / Sensors / History / SSR ────────────────────────────────
export const iotApi = {
  async listMasters(): Promise<IotMaster[]> {
    const response = await apiClient.get<unknown>('/api/iot/masters')
    return ensureArray<IotMaster>(response.data)
  },

  async listSensors(masterId: string): Promise<IotSensorsResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/masters/${masterId}/sensors`,
    )
    return ensureObject<IotSensorsResponse>(response.data)
  },

  async getSensor(
    masterId: string,
    nodeId: number,
    sensorId: number,
  ): Promise<IotSensor | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/masters/${masterId}/nodes/${nodeId}/sensors/${sensorId}`,
    )
    return ensureObject<IotSensor>(response.data)
  },

  async getHistory(
    masterId: string,
    nodeId: number,
    sensorId: number,
    query: IotHistoryQuery = {},
  ): Promise<IotHistoryResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/masters/${masterId}/nodes/${nodeId}/sensors/${sensorId}/history`,
      { params: query },
    )
    return ensureObject<IotHistoryResponse>(response.data)
  },

  async getSsr(masterId: string): Promise<IotSsrResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/masters/${masterId}/ssr`,
    )
    return ensureObject<IotSsrResponse>(response.data)
  },

  async createManualCommand(
    masterId: string,
    channel: number,
    payload: CreateIotCommandRequest,
  ): Promise<IotCommand | null> {
    const response = await apiClient.post<unknown>(
      `/api/iot/masters/${masterId}/ssr/${channel}/commands`,
      payload,
    )
    return ensureObject<IotCommand>(response.data)
  },

  async getCommandStatus(commandId: string): Promise<IotCommand | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/commands/${commandId}`,
    )
    return ensureObject<IotCommand>(response.data)
  },

  /** Flat channel list for UI convenience */
  async listSsrChannels(masterId: string): Promise<IotSsrChannelState[]> {
    const ssr = await this.getSsr(masterId)
    return ssr?.channels ?? []
  },
}

// ─── Automatic Misting ────────────────────────────────────────────────────
export const autoMistingApi = {
  async listFloors(): Promise<CultivationFloorMapping[]> {
    const response = await apiClient.get<unknown>('/api/iot/floors')
    return ensureArray<CultivationFloorMapping>(response.data)
  },

  async createFloor(
    payload: CultivationFloorMapping,
  ): Promise<CultivationFloorMapping | null> {
    const response = await apiClient.post<unknown>(
      '/api/iot/floors',
      payload,
    )
    return ensureObject<CultivationFloorMapping>(response.data)
  },

  async updateFloor(
    floorId: number,
    payload: CultivationFloorMapping,
  ): Promise<CultivationFloorMapping | null> {
    const response = await apiClient.put<unknown>(
      `/api/iot/floors/${floorId}`,
      payload,
    )
    return ensureObject<CultivationFloorMapping>(response.data)
  },

  async assignFloorToTray(floorId: number, trayId: number): Promise<void> {
    await apiClient.put(`/api/iot/floors/${floorId}/trays/${trayId}`)
  },

  /**
   * GET /api/iot/floors/{floorId}/environment
   *
   * Response thật (đã xác nhận từ Swagger): `{ data: { masterId, nodeId,
   * averageHumidity, averageTemperature, temperatureSpread, healthy, reason,
   * sensors: [{ sensorId, humidity, valid, ageMs, retained }], thresholds: {...} } }`
   *
   * ⚠ Sensor ở endpoint này dùng **`sensorId`** + **`humidity`**, khác với
   * shape `IotSensor` của `/api/iot/masters/{id}/sensors` (dùng `nodeId`,
   * `temperature`, `humidity`). Vì vậy phải map riêng, không tái dùng thẳng.
   *
   * Phần `thresholds` là cấu hình auto-control đang áp dụng — BE đã trả sẵn,
   * FE dùng để hiển thị ngưỡng thay vì tự tính.
   */
  async getEnvironment(
    floorId: number,
  ): Promise<FloorEnvironmentResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/environment`,
    )
    return normalizeFloorEnvironment(response.data)
  },

  /**
   * GET /api/iot/floors/{floorId}/auto-control — cấu hình + mode + runtime.
   *
   * Swagger: *"Read saved configuration, mode, cultivation conflicts and
   * suggestions"*. Response gốc là `{ data: { mode, config, run, runtime,
   * environment, ssr, cooldownRemainingMs, lastDecision } }`.
   */
  async getConfig(floorId: number): Promise<AutoControlState | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/auto-control`,
    )
    return ensureObject<AutoControlState>(response.data)
  },

  /**
   * GET /api/iot/floors/{floorId}/auto-control/suggestions — ngưỡng đề xuất.
   *
   * Swagger: *"Uses ACTIVE tray sessions linked to ACTIVE rentals on the same
   * tray; returns sourceProfiles, common, issues, warnings, config. Config is
   * null for missing, conflicting or too narrow conditions. No database writes
   * or device commands. Review preset, set profile_approved=true and PUT config
   * to auto-control."*
   *
   * Đây là nguồn ngưỡng **chính thức** từ BE — FE không tự tính toán.
   */
  async getSuggestions(
    floorId: number,
  ): Promise<AutoControlSuggestions | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/auto-control/suggestions`,
    )
    return ensureObject<AutoControlSuggestions>(response.data)
  },

  /**
   * PUT /api/iot/floors/{floorId}/auto-control — lưu cấu hình, KHÔNG bật AUTO.
   *
   * Swagger: *"Save configuration without starting AUTO. ... Stop before
   * edits. Requires iot.automation.manage permission."*
   *
   * ⚠ Schema có `additionalProperties: false` → không gửi field lạ, nếu không
   * BE trả 400. Nhánh `config_source: 'FLOOR'` yêu cầu `profile_name` +
   * `profile_approved: true` (thiếu → 409 `unapproved profiles` khi start).
   */
  async saveConfig(
    floorId: number,
    payload: AutoMistingConfiguration,
  ): Promise<AutoControlState | null> {
    const response = await apiClient.put<unknown>(
      `/api/iot/floors/${floorId}/auto-control`,
      payload,
    )
    return ensureObject<AutoControlState>(response.data)
  },

  async start(floorId: number): Promise<AutoControlState | null> {
    const response = await apiClient.post<unknown>(
      `/api/iot/floors/${floorId}/auto-control/start`,
    )
    return ensureObject<AutoControlState>(response.data)
  },

  async stop(floorId: number): Promise<AutoControlState | null> {
    const response = await apiClient.post<unknown>(
      `/api/iot/floors/${floorId}/auto-control/stop`,
    )
    return ensureObject<AutoControlState>(response.data)
  },

  async getStatus(floorId: number): Promise<AutoControlState | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/auto-control/status`,
    )
    return ensureObject<AutoControlState>(response.data)
  },

  /**
   * GET /api/iot/floors/{floorId}/auto-control/logs — lịch sử quyết định.
   *
   * Response gốc là `{ data: { limit, offset, logs: [...] } }` — đây là object
   * chứa mảng, không phải mảng trực tiếp, nên phải bóc `logs` thủ công.
   */
  async getLogs(floorId: number, query: AutoControlLogsQuery = {}): Promise<AutoControlLogEntry[]> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/auto-control/logs`,
      { params: { limit: query.limit ?? 50, offset: query.offset ?? 0 } },
    )
    const payload = ensureObject<{ logs?: unknown }>(response.data)
    return ensureArray<AutoControlLogEntry>(payload?.logs ?? response.data)
  },

  async evaluate(
    floorId: number,
  ): Promise<AutoControlEvaluateResult | null> {
    const response = await apiClient.post<unknown>(
      `/api/iot/floors/${floorId}/auto-control/evaluate`,
    )
    const result = ensureObject<AutoControlEvaluateResult>(response.data)
    if (!result) return null

    // BE trả `{ dryRun, decision, environment }` — `environment` là nguồn số
    // đo thật, nên suy ra `metrics` từ đó thay vì để UI tự tính lại.
    const env = result.environment
    return {
      ...result,
      metrics:
        env != null
          ? {
              avgHumidity: env.avgHumidity,
              spreadPercent: env.spread,
              validSensors: env.sensors.filter((s) => s.valid).length,
            }
          : result.metrics,
    }
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Chuẩn hoá `GET /api/iot/floors/{floorId}/environment` về shape nội bộ.
 *
 * BE dùng `sensorId` (không phải `nodeId`) và trả cả `thresholds` — giữ cả hai.
 */
function normalizeFloorEnvironment(raw: unknown): FloorEnvironmentResponse | null {
  const obj = ensureObject<Record<string, unknown>>(raw)
  if (!obj) return null

  return {
    masterId: pickString(obj, 'masterId') ?? '',
    nodeId: pickNumber(obj, 'nodeId') ?? 0,
    avgHumidity: pickNumber(obj, 'averageHumidity', 'avgHumidity'),
    avgTemperature: pickNumber(obj, 'averageTemperature', 'avgTemperature'),
    spread: pickNumber(obj, 'spread', 'spreadPercent'),
    temperatureSpread: pickNumber(obj, 'temperatureSpread'),
    healthy: typeof obj.healthy === 'boolean' ? obj.healthy : null,
    reason: pickString(obj, 'reason'),
    sensors: ensureArray<Record<string, unknown>>(obj.sensors).map(
      (sensor) => ({
        sensorId: pickNumber(sensor, 'sensorId', 'id') ?? 0,
        humidity: pickNumber(sensor, 'humidity'),
        temperature: pickNumber(sensor, 'temperature'),
        valid: typeof sensor.valid === 'boolean' ? sensor.valid : false,
        ageMs: pickNumber(sensor, 'ageMs'),
        retained: typeof sensor.retained === 'boolean' ? sensor.retained : false,
      }),
    ),
    thresholds: ensureObject<AutoMistingConfiguration>(obj.thresholds),
  }
}

function pickString(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}
