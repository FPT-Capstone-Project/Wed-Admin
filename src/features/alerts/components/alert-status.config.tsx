import type { ReactNode } from 'react'
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { SemanticTone } from '../../../app/theme/tokens'
import type {
  OperationalAlertCategory,
  OperationalAlertSeverity,
  OperationalAlertSource,
} from '../types/alert.types'
import {
  ALERT_CATEGORY_DICTIONARY,
  ALERT_SEVERITY_DICTIONARY,
  ALERT_SOURCE_DICTIONARY,
} from '../../../shared/i18n/status/reference'

/**
 * Cấu hình hiển thị cảnh báo vận hành (read-only).
 *
 * ⚠ Nhãn + tone lấy từ **module trung tâm** `src/shared/i18n/status/reference.ts`
 *   ⇒ chỉ 1 nguồn sự thật cho cảnh báo.
 *
 * ⚠ `icon` vẫn nằm ở feature layer vì là **JSX** (module trung tâm là
 *   `.ts` thuần, không chứa React).
 *
 * Nguồn: `features/alerts/types/alert.types.ts` — model thống nhất từ
 * nhật ký auto-control + thông báo nghiệp vụ.
 */

export interface AlertSeverityConfig {
  label: string
  tone: SemanticTone
  icon: ReactNode
}

/** Icon đi kèm theo mức độ cảnh báo. */
const ALERT_SEVERITY_ICONS: Record<OperationalAlertSeverity, ReactNode> = {
  CRITICAL: <SafetyOutlined />,
  WARNING: <ExclamationCircleOutlined />,
  INFO: <InfoCircleOutlined />,
}

/** Mức độ → nhãn + màu + icon. */
export const ALERT_SEVERITY_CONFIG: Record<
  OperationalAlertSeverity,
  AlertSeverityConfig
> = {
  CRITICAL: {
    label: ALERT_SEVERITY_DICTIONARY.CRITICAL.label,
    tone: ALERT_SEVERITY_DICTIONARY.CRITICAL.tone,
    icon: ALERT_SEVERITY_ICONS.CRITICAL,
  },
  WARNING: {
    label: ALERT_SEVERITY_DICTIONARY.WARNING.label,
    tone: ALERT_SEVERITY_DICTIONARY.WARNING.tone,
    icon: ALERT_SEVERITY_ICONS.WARNING,
  },
  INFO: {
    label: ALERT_SEVERITY_DICTIONARY.INFO.label,
    tone: ALERT_SEVERITY_DICTIONARY.INFO.tone,
    icon: ALERT_SEVERITY_ICONS.INFO,
  },
}

/** Nhóm cảnh báo → nhãn tiếng Việt. */
export const ALERT_CATEGORY_LABELS: Record<OperationalAlertCategory, string> = {
  AUTO_CONTROL_FAULT: ALERT_CATEGORY_DICTIONARY.AUTO_CONTROL_FAULT.label,
  DEVICE_OFFLINE: ALERT_CATEGORY_DICTIONARY.DEVICE_OFFLINE.label,
  SENSOR_FAULT: ALERT_CATEGORY_DICTIONARY.SENSOR_FAULT.label,
  RETRY_WAIT: ALERT_CATEGORY_DICTIONARY.RETRY_WAIT.label,
  MUSHROOM_DISEASE: ALERT_CATEGORY_DICTIONARY.MUSHROOM_DISEASE.label,
  DEVICE_ISSUE: ALERT_CATEGORY_DICTIONARY.DEVICE_ISSUE.label,
  SENSOR_ALERT: ALERT_CATEGORY_DICTIONARY.SENSOR_ALERT.label,
  OPERATOR_MESSAGE: ALERT_CATEGORY_DICTIONARY.OPERATOR_MESSAGE.label,
}

/** Nguồn phát sinh → nhãn tiếng Việt. */
export const ALERT_SOURCE_LABELS: Record<OperationalAlertSource, string> = {
  IOT_AUTO_CONTROL: ALERT_SOURCE_DICTIONARY.IOT_AUTO_CONTROL.label,
  NOTIFICATION: ALERT_SOURCE_DICTIONARY.NOTIFICATION.label,
}
