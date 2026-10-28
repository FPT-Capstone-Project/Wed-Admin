import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  AutoControlConfigurationResponse,
  AutoControlLogsQuery,
  AutoControlLogsResponse,
  AutoControlSuggestions,
  AutoMistingConfiguration,
  CultivationFloorMapping,
  FloorEnvironmentResponse,
  IotHistoryQuery,
  IotHistoryResponse,
  IotMaster,
  IotSensor,
  IotSensorsResponse,
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
}

// ─── Automatic Misting (READ-ONLY) ─────────────────────────────────────
//
// ⚠ Web admin chỉ GIÁM SÁT. Mọi endpoint ghi (tạo/sửa tầng, gán khay, lưu
// cấu hình auto-control, start/stop/evaluate) do **nhân viên (staff)** thực
// hiện trên mobile app — xem `features/auth/permissions.ts`
// (`iot.automation.manage`). Vì vậy FE không còn bọc các endpoint đó.
export const autoMistingApi = {
  async listFloors(): Promise<CultivationFloorMapping[]> {
    const response = await apiClient.get<unknown>('/api/iot/floors')
    return ensureArray<CultivationFloorMapping>(response.data)
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
   * GET /api/iot/floors/{floorId}/auto-control — cấu hình tự động hiện tại.
   *
   * ⚠ Endpoint này **KHÔNG** yêu cầu `iot.automation.manage` (chỉ cần đăng
   * nhập) → Admin web đọc được để hiển thị, không sửa được.
   *
   * BE (`service.configuration`) trả:
   * `{ config, mode, cultivation, suggestions, floorSuggestion }`.
   */
  async getAutoControlConfiguration(
    floorId: number,
  ): Promise<AutoControlConfigurationResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/auto-control`,
    )
    return ensureObject<AutoControlConfigurationResponse>(response.data)
  },

  /**
   * GET /api/iot/floors/{floorId}/auto-control/status — trạng thái chạy.
   *
   * BE trả `{ mode, run, runtime, environment, ssr, cooldownRemainingMs,
   * lastDecision }` — dùng để biết tầng đang AUTO hay MANUAL.
   */
  async getAutoControlStatus(
    floorId: number,
  ): Promise<AutoControlConfigurationResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/auto-control/status`,
    )
    return ensureObject<AutoControlConfigurationResponse>(response.data)
  },

  /**
   * GET /api/iot/floors/{floorId}/auto-control/logs — nhật ký kích hoạt.
   *
   * BE trả `{ limit, offset, logs }` với `logs` là `SELECT *` từ
   * `iot_auto_control_logs` (đã sắp xếp mới nhất trước).
   *
   * @param query `limit` (1..1000) và `offset` (>= 0)
   */
  async getAutoControlLogs(
    floorId: number,
    query: AutoControlLogsQuery = {},
  ): Promise<AutoControlLogsResponse | null> {
    const response = await apiClient.get<unknown>(
      `/api/iot/floors/${floorId}/auto-control/logs`,
      { params: query },
    )
    const obj = ensureObject<AutoControlLogsResponse>(response.data)
    if (!obj) return null
    return {
      limit: obj.limit ?? query.limit ?? 100,
      offset: obj.offset ?? query.offset ?? 0,
      logs: ensureArray(obj.logs),
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
