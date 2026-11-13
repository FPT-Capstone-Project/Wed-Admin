/**
 * Barrel export của module trạng thái trung tâm.
 *
 * ⚠ Import từ đây thay vì import thẳng từng file con, để đổi cấu trúc
 *   nội bộ không phá vỡ import cũ.
 */

export type {
  StatusDictionary,
  StatusOption,
  StatusPresentation,
} from './types'

export {
  presentStatus,
  statusLabel,
  statusOptions,
  selectOptions,
  dictionaryFor,
  STATUS_REGISTRY,
  EMPTY_STATUS_LABEL,
} from './registry'

export type { StatusDomain } from './registry'

export {
  SESSION_STATUS_DICTIONARY,
  SESSION_GROUP_DICTIONARY,
  SESSION_GROWTH_STAGE_DICTIONARY,
  SESSION_HARVEST_STATUS_DICTIONARY,
  SESSION_HARVESTED_PRESENTATION,
  SESSION_PROGRESS_STAGE_DICTIONARY,
  SESSION_TRAY_ASSIGNMENT_DICTIONARY,
  SPAWN_CONDITION_DICTIONARY,
  MUSHROOM_GROWTH_PHASE_DICTIONARY,
  resolveSessionGroup,
  resolveGrowthPhase,
  resolveGrowthPhaseFromStage,
  resolveGrowthPhaseFromStatus,
  resolveSessionHarvestStatus,
} from './session'
export type {
  SessionStatusKey,
  SessionStatusGroupKey,
  SessionGrowthStageKey,
  SessionHarvestStatusKey,
  SessionTrayAssignmentStatusKey,
  SpawnConditionKey,
  SessionStatusPresentation,
  MushroomGrowthPhaseKey,
} from './session'

export {
  HARVEST_STATUS_DICTIONARY,
  HARVEST_METHOD_DICTIONARY,
  HARVEST_REQUEST_STATUS_DICTIONARY,
  HARVEST_QUALITY_DICTIONARY,
} from './harvest'
export type {
  HarvestStatusKey,
  HarvestMethodKey,
  HarvestRequestStatusKey,
} from './harvest'

export {
  ORDER_STATUS_DICTIONARY,
  PAYMENT_STATUS_DICTIONARY,
} from './order'
export type { OrderStatusKey, PaymentStatusKey } from './order'

export {
  MASTER_STATUS_DICTIONARY,
  FLOOR_STATUS_DICTIONARY,
  SSR_STATE_DICTIONARY,
  CONTROL_STATE_DICTIONARY,
  AUTO_CONTROL_RUN_STATUS_DICTIONARY,
  IOT_COMMAND_STATUS_DICTIONARY,
  AUTO_CONTROL_EVENT_DICTIONARY,
  AUTO_CONTROL_ACTION_DICTIONARY,
  SENSOR_VALIDITY_DICTIONARY,
  RENTAL_SESSION_STATUS_DICTIONARY,
  RENTAL_SESSION_STATUS_ANTD_COLORS,
  RENTAL_SESSION_STATUS_LEGACY_CONFIG,
} from './iot'
export type {
  MasterStatusKey,
  FloorStatusKey,
  SsrStateKey,
  ControlStateKey,
  AutoControlRunStatusKey,
  IotCommandStatusKey,
  SensorValidityKey,
  RentalSessionLegacyOption,
} from './iot'

export {
  ISSUE_STATUS_DICTIONARY,
  ISSUE_SEVERITY_DICTIONARY,
  MEDIA_STAGE_DICTIONARY,
  TRAY_CONDITION_DICTIONARY,
} from './issue'
export type {
  IssueStatusKey,
  IssueSeverityKey,
  MediaStageKey,
} from './issue'

export {
  ROLE_OPTIONS,
  ROLE_OPTION_BY_ID,
  getRoleOption,
  getRoleLabel,
  USER_STATUS_DICTIONARY,
  USER_STATUS_ANTD_COLORS,
  USER_STATUS_LEGACY_CONFIG,
  USER_STATUS_OPTIONS,
  nextToggleStatus,
} from './user'
export type {
  RoleOption,
  UserRoleKey,
  UserStatusKey,
  UserStatusLegacyOption,
} from './user'

export {
  ROOM_STATUS_DICTIONARY,
  CULTIVATION_TRAY_STATUS_DICTIONARY,
  TRAY_UI_STATUS_DICTIONARY,
  RENTAL_HARVEST_STATUS_DICTIONARY,
} from './room'
export type {
  RoomStatusKey,
  CultivationTrayStatusKey,
  TrayUiStatusKey,
  RentalHarvestStatusKey,
} from './room'

export {
  REFERENCE_TYPE_DICTIONARY,
  NOTIFICATION_TYPE_DICTIONARY,
  ALERT_SEVERITY_DICTIONARY,
  ALERT_CATEGORY_DICTIONARY,
  ALERT_SOURCE_DICTIONARY,
} from './reference'
export type {
  ReferenceTypeKey,
  NotificationTypeKey,
  AlertSeverityKey,
  AlertCategoryKey,
  AlertSourceKey,
} from './reference'

export {
  CAMERA_STATUS_DICTIONARY,
  LIVE_SESSION_STATUS_DICTIONARY,
} from './camera'
export type { CameraStatusKey, LiveSessionStatusKey } from './camera'

export {
  CATALOG_STATUS_DICTIONARY,
  PACKAGE_STATUS_DICTIONARY,
  BILLING_CYCLE_DICTIONARY,
} from './package'
export type {
  CatalogStatusKey,
  PackageStatusKey,
  BillingCycleKey,
} from './package'
