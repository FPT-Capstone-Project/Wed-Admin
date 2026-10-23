/**
 * IoT — DTOs khớp Swagger.
 * Endpoints:
 *   /api/iot/masters
 *   /api/iot/masters/{masterId}/sensors
 *   /api/iot/masters/{masterId}/nodes/{nodeId}/sensors/{sensorId}/history
 *   /api/iot/masters/{masterId}/ssr
 *   /api/iot/masters/{masterId}/ssr/{channel}/commands  (manual SSR)
 *   /api/iot/commands/{commandId}
 *
 * Automatic misting:
 *   /api/iot/floors  (CRUD CultivationFloorMapping)
 *   /api/iot/floors/{floorId}
 *   /api/iot/floors/{floorId}/trays/{trayId}
 *   /api/iot/floors/{floorId}/environment
 *   /api/iot/floors/{floorId}/auto-control            (GET config, PUT save)
 *   /api/iot/floors/{floorId}/auto-control/suggestions
 *   /api/iot/floors/{floorId}/auto-control/start
 *   /api/iot/floors/{floorId}/auto-control/stop
 *   /api/iot/floors/{floorId}/auto-control/status
 *   /api/iot/floors/{floorId}/auto-control/logs
 *   /api/iot/floors/{floorId}/auto-control/evaluate
 */

export type MasterStatus = 'online' | 'offline'

export interface IotMaster {
  id: number
  masterId: string
  cultivationRoomId: number | null
  reportedStatus: MasterStatus | null
  lastSeenAt: string | null
  statusReceivedAt: string | null
  statusRetained: boolean | null
}

export interface IotSensor {
  masterId: string
  /** 1..247 */
  nodeId: number
  /** 1..3 */
  sensorId: number
  temperature: number | null
  humidity: number | null
  ok: boolean
  lastReceivedAt: string | null
  lastValidAt: string | null
  measuredAt: string | null
  retained: boolean
}

export interface IotSensorsResponse {
  masterId: string
  sensors: IotSensor[]
}

export interface IotHistoryReading {
  id: string
  temperature: number | null
  humidity: number | null
  ok: boolean
  receivedAt: string | null
  measuredAt: string | null
  retained: boolean
}

export interface IotHistoryResponse {
  masterId: string
  nodeId: number
  sensorId: number
  limit: number
  offset: number
  readings: IotHistoryReading[]
}

export interface IotHistoryQuery {
  limit?: number
  offset?: number
}

/** SSR channel state */
export interface IotSsrChannelState {
  /** 1..8 */
  channel: number
  desiredState: 'ON' | 'OFF' | null
  reportedState: 'ON' | 'OFF' | null
  lastCommandAt: string | null
  lastReportedAt: string | null
  reportedRetained: boolean | null
  statesMatch: boolean | null
}

export interface IotSsrResponse {
  masterId: string
  channels: IotSsrChannelState[]
}

/** Manual SSR command */
export type IotCommandStatus = 'PENDING' | 'PUBLISHED' | 'FAILED' | 'TIMED_OUT'

export interface IotCommand {
  commandId: string
  masterId: string
  /** 1..8 */
  channel: number
  action: 'ON' | 'OFF'
  status: IotCommandStatus
  requestedBy: number | null
  requestedAt: string | null
  expiresAt: string | null
  publishedAt: string | null
  completedAt: string | null
  errorMessage: string | null
}

export interface CreateIotCommandRequest {
  action: 'ON' | 'OFF'
}

// ─── Automatic misting (CultivationFloorMapping + AutoMistingConfiguration) ─

export type FloorStatus = 'ACTIVE' | 'INACTIVE'

export interface CultivationFloorMapping {
  room_id: number
  floor_number: number
  floor_name: string
  master_id: number
  node_address: number
  misting_ssr_channel: number
  status?: FloorStatus
}

/**
 * Cấu hình auto-misting — schema `PUT /api/iot/floors/{floorId}/auto-control`.
 *
 * ⚠ BE có `additionalProperties: false` và 10 field `required`. Gửi thừa field
 * không có trong schema sẽ bị **400**. Vì vậy `mushroom_type_id` là optional:
 * nó thuộc nhánh `config_source: 'LEGACY'`, còn nhánh `'FLOOR'` (mới, khuyến
 * nghị) thì suy ra loại nấm từ các phiên trồng được gán cho tầng.
 *
 * Nhánh `FLOOR` yêu cầu `profile_name` + `profile_approved: true` — BE trả
 * 409 `unapproved profiles` nếu bật AUTO mà chưa duyệt profile.
 */
export interface AutoMistingConfiguration {
  /** Nhánh LEGACY. Với `config_source: 'FLOOR'` thì BE tự suy ra. */
  mushroom_type_id?: number
  humidity_min: number
  humidity_max: number
  humidity_start_threshold: number
  humidity_stop_threshold: number
  misting_pulse_ms: number
  cooldown_ms: number
  evaluation_interval_ms: number
  sensor_max_age_ms?: number
  required_valid_sensors?: number
  max_sensor_spread_percent: number
  max_activations_per_hour: number
  max_cumulative_on_ms_per_hour: number
  profile_name?: string | null
  profile_approved?: boolean
  /** `FLOOR` = suy ra từ phiên trồng của các khay; `LEGACY` = dùng `mushroom_type_id`. */
  config_source?: 'LEGACY' | 'FLOOR'
  /** Khi true, mọi field nhiệt độ + `cooling_humidity_limit` là bắt buộc. */
  cooling_enabled?: boolean
  temperature_min?: number
  temperature_max?: number
  temperature_start_threshold?: number
  temperature_stop_threshold?: number
  cooling_humidity_limit?: number
  max_temperature_spread_c?: number
}

/**
 * Response `GET /api/iot/floors/{floorId}/auto-control`.
 *
 * Swagger: *"State includes mode, run, runtime, environment, ssr,
 * cooldownRemainingMs and lastDecision"*.
 */
export type AutoControlMode = 'MANUAL' | 'AUTO'

export interface AutoControlRun {
  id?: number
  status: 'RUNNING' | 'STOPPED'
  /** BE có thể chạy thử không gửi lệnh thật — `dry_run: true`. */
  dry_run?: boolean
  started_by?: number
}

export interface AutoControlRuntime {
  control_state: string
  pulse_deadline_at?: string | null
  last_error?: string | null
}

export interface AutoControlSsrState {
  desired_state: 'ON' | 'OFF'
  reported_state: 'ON' | 'OFF'
}

export interface AutoControlState {
  mode: AutoControlMode
  config?: AutoMistingConfiguration | null
  run?: AutoControlRun | null
  runtime?: AutoControlRuntime | null
  environment?: unknown
  ssr?: AutoControlSsrState | null
  cooldownRemainingMs?: number | null
  lastDecision?: AutoControlDecision | null
}

/** Quyết định thuật toán — dùng cho `lastDecision` và response của `/evaluate`. */
export interface AutoControlDecision {
  action: 'ON' | 'OFF' | 'NONE'
  state: string
  reason: string
}

export interface AutoControlEvaluateResult {
  dryRun: boolean
  decision: AutoControlDecision
  /** Một số response cũ chỉ có `matched` — giữ để tương thích UI cũ. */
  matched?: boolean
  reason?: string
  metrics?: {
    avgHumidity: number | null
    spreadPercent: number | null
    validSensors: number
  }
}

/** Trang log quyết định — `GET /api/iot/floors/{floorId}/auto-control/logs`. */
export interface AutoControlLogEntry {
  event_type: string
  reason: string
}

/**
 * Sensor của `GET /api/iot/floors/{floorId}/environment`.
 *
 * ⚠ Endpoint này dùng `sensorId` + `humidity`, **khác** shape `IotSensor` của
 * `/api/iot/masters/{id}/sensors` (dùng `nodeId` + `temperature`).
 */
export interface FloorEnvironmentSensor {
  /** 1..3 */
  sensorId: number
  humidity: number | null
  valid: boolean
  /** Tuổi dữ liệu (ms) — BE dùng để đánh giá độ mới. */
  ageMs: number | null
  retained: boolean
}

export interface FloorEnvironmentResponse {
  masterId: string
  nodeId: number
  avgHumidity: number | null
  avgTemperature: number | null
  temperatureSpread: number | null
  /** `null` khi BE không trả. */
  healthy: boolean | null
  reason: string | null
  sensors: FloorEnvironmentSensor[]
  /** Cấu hình auto-control đang áp dụng — BE trả sẵn. */
  thresholds: AutoMistingConfiguration | null
}

export interface AutoControlLogsResponse {
  limit: number
  offset: number
  logs: AutoControlLogEntry[]
}

export interface AutoControlLogsQuery {
  limit?: number
  offset?: number
}

/**
 * Response `GET /api/iot/floors/{floorId}/auto-control/suggestions`.
 *
 * Swagger: *"Uses ACTIVE tray sessions linked to ACTIVE rentals on the same
 * tray; returns sourceProfiles, common, issues, warnings, config. Config is
 * null for missing, conflicting or too narrow conditions. No database writes
 * or device commands."*
 */
export interface AutoControlSuggestionProfile {
  /** Tên profile nấm dùng làm nguồn. */
  profileName?: string | null
  mushroomTypeId?: number | null
  /** Số khay đang dùng profile này. */
  trayCount?: number
}

export interface AutoControlSuggestionConflict {
  /** `true` khi ngưỡng các profile nguồn không giao nhau. */
  conflicting?: boolean
  /** true khi khoảng ngưỡng hẹp quá để dùng chung. */
  tooNarrow?: boolean
  message?: string
  [key: string]: unknown
}

export interface AutoControlSuggestions {
  sourceProfiles: AutoControlSuggestionProfile[]
  /** Khoảng ngưỡng chung của mọi profile nguồn. */
  common?: Record<string, number | null> | null
  /** Xung đột nuôi trồng — BE trả `config: null` khi có conflict. */
  issues: AutoControlSuggestionConflict[]
  warnings: string[]
  /**
   * Cấu hình đề xuất đã sẵn sàng để `PUT /auto-control`.
   * `null` khi thiếu dữ liệu / xung đột / khoảng ngưỡng quá hẹp.
   */
  config: AutoMistingConfiguration | null
}