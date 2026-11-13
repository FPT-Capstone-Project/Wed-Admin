/**
 * Registry trạng thái — **điểm vào duy nhất** để tra cứu nhãn trạng thái.
 *
 * ## Vì sao cần registry?
 *
 * Trước đây mỗi feature tự khai một bảng `Record<Enum, { label, tone }>` và
 * một hàm fallback riêng. Hệ quả:
 *   - 18 bảng trùng lặp cùng một enum (growth stage có 5 bản khác nhau).
 *   - 30+ chỗ render thẳng enum tiếng Anh ra UI.
 *   - Giá trị lạ từ BE bị lộ nguyên chuỗi "PENDING" cho người dùng.
 *
 * Module này gom toàn bộ về **một** nơi:
 *   - `presentStatus()` — tra cứu **an toàn**, không bao giờ throw.
 *   - `statusLabel()`   — lấy nhãn dạng chuỗi.
 *   - `statusOptions()` — sinh options cho `Select` / bộ lọc.
 *
 * ## Hợp đồng an toàn
 *
 * | Input                  | Output                              |
 * |------------------------|-------------------------------------|
 * | `null` / `undefined`   | `{ label: emptyLabel, tone: 'muted' }` |
 * | `''` / `'   '`         | `{ label: emptyLabel, tone: 'muted' }` |
 * | `'  pending '`         | tra cứu `PENDING` (chuẩn hoá)      |
 * | `'PENDING'`            | nhãn đúng từ từ điển                |
 * | `'FOO_BAR'` (lạ)       | `{ label: 'Chưa xác định (FOO_BAR)', tone: 'muted' }` |
 *
 * ⚠ **Không bao giờ** throw, **không bao giờ** trả về chuỗi tiếng Anh
 *   chưa dịch cho người dùng cuối.
 */

import type { SemanticTone } from '../../../app/theme/tokens'
import type { StatusDictionary, StatusOption, StatusPresentation } from './types'

import {
  AUTO_CONTROL_EVENT_DICTIONARY,
  AUTO_CONTROL_RUN_STATUS_DICTIONARY,
  CONTROL_STATE_DICTIONARY,
  FLOOR_STATUS_DICTIONARY,
  IOT_COMMAND_STATUS_DICTIONARY,
  MASTER_STATUS_DICTIONARY,
  SENSOR_VALIDITY_DICTIONARY,
  SSR_STATE_DICTIONARY,
} from './iot'
import {
  HARVEST_METHOD_DICTIONARY,
  HARVEST_QUALITY_DICTIONARY,
  HARVEST_REQUEST_STATUS_DICTIONARY,
  HARVEST_STATUS_DICTIONARY,
} from './harvest'
import {
  ISSUE_SEVERITY_DICTIONARY,
  ISSUE_STATUS_DICTIONARY,
  MEDIA_STAGE_DICTIONARY,
  TRAY_CONDITION_DICTIONARY,
} from './issue'
import { ORDER_STATUS_DICTIONARY, PAYMENT_STATUS_DICTIONARY } from './order'
import {
  ALERT_CATEGORY_DICTIONARY,
  ALERT_SEVERITY_DICTIONARY,
  ALERT_SOURCE_DICTIONARY,
  NOTIFICATION_TYPE_DICTIONARY,
  REFERENCE_TYPE_DICTIONARY,
} from './reference'
import {
  BILLING_CYCLE_DICTIONARY,
  CATALOG_STATUS_DICTIONARY,
  PACKAGE_STATUS_DICTIONARY,
} from './package'
import {
  CAMERA_STATUS_DICTIONARY,
  LIVE_SESSION_STATUS_DICTIONARY,
} from './camera'
import {
  CULTIVATION_TRAY_STATUS_DICTIONARY,
  RENTAL_HARVEST_STATUS_DICTIONARY,
  ROOM_STATUS_DICTIONARY,
  TRAY_UI_STATUS_DICTIONARY,
} from './room'
import {
  MUSHROOM_GROWTH_PHASE_DICTIONARY,
  SESSION_GROUP_DICTIONARY,
  SESSION_GROWTH_STAGE_DICTIONARY,
  SESSION_HARVEST_STATUS_DICTIONARY,
  SESSION_PROGRESS_STAGE_DICTIONARY,
  SESSION_STATUS_DICTIONARY,
  SESSION_TRAY_ASSIGNMENT_DICTIONARY,
  SPAWN_CONDITION_DICTIONARY,
} from './session'
import { USER_STATUS_DICTIONARY } from './user'

/** Nhãn mặc định khi BE **không** trả giá trị (null / rỗng). */
export const EMPTY_STATUS_LABEL = 'Chưa xác định'

/**
 * Chuẩn hoá giá trị enum trước khi tra cứu.
 *
 * ⚠ BE trả **không nhất quán**: `online` (master) vs `ON` (rơ-le) vs
 *   `PENDING` (phiên). Chuẩn hoá uppercase + trim giúp 1 từ điển phục vụ
 *   được cả 2 dạng.
 */
function normalizeStatusKey(value: string): string {
  return value.trim().toUpperCase()
}

/**
 * Tra cứu trạng thái — **an toàn tuyệt đối**.
 *
 * @param dictionary  Từ điển trạng thái.
 * @param value       Giá trị thô từ BE (có thể `null` / rỗng / lạ).
 * @param emptyLabel  Nhãn dùng khi không có giá trị. Mặc định `'Chưa xác định'`.
 */
export function presentStatus(
  dictionary: StatusDictionary,
  value: string | null | undefined,
  emptyLabel: string = EMPTY_STATUS_LABEL,
): StatusPresentation {
  if (value === null || value === undefined) {
    return { label: emptyLabel, tone: 'muted' }
  }

  const raw = String(value)
  const trimmed = raw.trim()
  if (!trimmed) {
    return { label: emptyLabel, tone: 'muted' }
  }

  const key = normalizeStatusKey(trimmed)

  // 1) Khớp chính xác (đã chuẩn hoá) — trường hợp phổ biến nhất.
  const exact = dictionary[key]
  if (exact) return exact

  // 2) Khớp theo key gốc (trường hợp từ điển dùng key lowercase, vd
  //    master: `online` / `offline`).
  const original = dictionary[trimmed]
  if (original) return original

  // 3) Khớp không phân biệt hoa/thường — BE có thể trả `OFFLINE` trong khi
  //    từ điển khai báo `offline` (hoặc ngược lại).
  const insensitive = Object.entries(dictionary).find(
    ([dictKey]) => dictKey.toUpperCase() === key,
  )
  if (insensitive) return insensitive[1]

  // 4) Giá trị lạ (BE thêm enum mới) ⇒ **KHÔNG lộ chuỗi gốc**.
  return { label: `${emptyLabel} (${trimmed})`, tone: 'muted' }
}

/**
 * Nhãn hiển thị dạng chuỗi — viết tắt của `presentStatus(...).label`.
 *
 * @param emptyLabel Nhãn dùng khi không có giá trị.
 */
export function statusLabel(
  dictionary: StatusDictionary,
  value: string | null | undefined,
  emptyLabel: string = EMPTY_STATUS_LABEL,
): string {
  return presentStatus(dictionary, value, emptyLabel).label
}

/**
 * Sinh danh sách lựa chọn cho `Select` / bộ lọc.
 *
 * @param dictionary Từ điển trạng thái.
 * @param values     Danh sách giá trị muốn hiển thị. Mặc định = **toàn bộ
 *                   key** của từ điển (theo thứ tự khai báo).
 */
export function statusOptions(
  dictionary: StatusDictionary,
  values?: readonly string[],
): StatusOption[] {
  const keys = values ?? Object.keys(dictionary)
  return keys.map((value) => {
    const presentation = presentStatus(dictionary, value)
    return {
      value,
      label: presentation.label,
      tone: presentation.tone,
    }
  })
}

/**
 * Options cho antd `Select` — chỉ giữ `value` + `label`.
 *
 * ⚠ `tone` là metadata của design system, **không** phải prop của antd
 *   `Select` ⇒ không truyền thẳng vào `options` (sẽ bị render sai).
 */
export function selectOptions(
  dictionary: StatusDictionary,
  values?: readonly string[],
): Array<{ value: string; label: string }> {
  return statusOptions(dictionary, values).map(({ value, label }) => ({
    value,
    label,
  }))
}

/* ─── Registry tập trung ───────────────────────────────────────────────── */

/**
 * Tất cả từ điển trạng thái, đánh số theo **tên miền nghiệp vụ**.
 *
 * ⚠ Dùng để:
 *   - tra cứu động theo tên (vd: `STATUS_REGISTRY.session`).
 *   - kiểm tra tự động rằng không còn từ điển trùng lặp ở feature layer.
 */
export const STATUS_REGISTRY = {
  session: {
    status: SESSION_STATUS_DICTIONARY,
    group: SESSION_GROUP_DICTIONARY,
    growthStage: SESSION_GROWTH_STAGE_DICTIONARY,
    progressStage: SESSION_PROGRESS_STAGE_DICTIONARY,
    harvestStatus: SESSION_HARVEST_STATUS_DICTIONARY,
    spawnCondition: SPAWN_CONDITION_DICTIONARY,
    trayAssignment: SESSION_TRAY_ASSIGNMENT_DICTIONARY,
    growthPhase: MUSHROOM_GROWTH_PHASE_DICTIONARY,
  },
  harvest: {
    status: HARVEST_STATUS_DICTIONARY,
    method: HARVEST_METHOD_DICTIONARY,
    requestStatus: HARVEST_REQUEST_STATUS_DICTIONARY,
    quality: HARVEST_QUALITY_DICTIONARY,
  },
  order: {
    status: ORDER_STATUS_DICTIONARY,
    payment: PAYMENT_STATUS_DICTIONARY,
  },
  iot: {
    master: MASTER_STATUS_DICTIONARY,
    floor: FLOOR_STATUS_DICTIONARY,
    ssr: SSR_STATE_DICTIONARY,
    controlState: CONTROL_STATE_DICTIONARY,
    runStatus: AUTO_CONTROL_RUN_STATUS_DICTIONARY,
    commandStatus: IOT_COMMAND_STATUS_DICTIONARY,
    sensorValidity: SENSOR_VALIDITY_DICTIONARY,
    event: AUTO_CONTROL_EVENT_DICTIONARY,
  },
  issue: {
    status: ISSUE_STATUS_DICTIONARY,
    severity: ISSUE_SEVERITY_DICTIONARY,
    mediaStage: MEDIA_STAGE_DICTIONARY,
    condition: TRAY_CONDITION_DICTIONARY,
  },
  user: {
    status: USER_STATUS_DICTIONARY,
  },
  room: {
    status: ROOM_STATUS_DICTIONARY,
    cultivationTray: CULTIVATION_TRAY_STATUS_DICTIONARY,
    tray: TRAY_UI_STATUS_DICTIONARY,
    rentalHarvest: RENTAL_HARVEST_STATUS_DICTIONARY,
  },
  reference: {
    referenceType: REFERENCE_TYPE_DICTIONARY,
    notificationType: NOTIFICATION_TYPE_DICTIONARY,
    alertSeverity: ALERT_SEVERITY_DICTIONARY,
    alertCategory: ALERT_CATEGORY_DICTIONARY,
    alertSource: ALERT_SOURCE_DICTIONARY,
    package: PACKAGE_STATUS_DICTIONARY,
  },
  camera: {
    status: CAMERA_STATUS_DICTIONARY,
    liveSession: LIVE_SESSION_STATUS_DICTIONARY,
  },
  catalog: {
    status: CATALOG_STATUS_DICTIONARY,
    billingCycle: BILLING_CYCLE_DICTIONARY,
  },
} as const

/** Tên miền có trong registry. */
export type StatusDomain = keyof typeof STATUS_REGISTRY

/**
 * Tra cứu từ điển theo tên miền — dùng khi nơi gọi không import trực tiếp
 * từ điển cụ thể (vd: bảng cấu hình động).
 */
export function dictionaryFor(
  domain: StatusDomain,
  key: keyof (typeof STATUS_REGISTRY)[StatusDomain],
): StatusDictionary {
  return STATUS_REGISTRY[domain][key] as StatusDictionary
}

export type { StatusDictionary, StatusOption, StatusPresentation }
export type { SemanticTone }
