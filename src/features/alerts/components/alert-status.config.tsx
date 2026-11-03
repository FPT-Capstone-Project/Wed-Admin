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

/**
 * Cấu hình hiển thị cảnh báo vận hành (read-only).
 *
 * Nguồn: `features/alerts/types/alert.types.ts` — model thống nhất từ
 * nhật ký auto-control + thông báo nghiệp vụ.
 */

export interface AlertSeverityConfig {
  label: string
  tone: SemanticTone
  icon: ReactNode
}

/** Mức độ → nhãn + màu + icon. */
export const ALERT_SEVERITY_CONFIG: Record<
  OperationalAlertSeverity,
  AlertSeverityConfig
> = {
  CRITICAL: {
    label: 'Nghiêm trọng',
    tone: 'danger',
    icon: <SafetyOutlined />,
  },
  WARNING: {
    label: 'Cảnh báo',
    tone: 'warning',
    icon: <ExclamationCircleOutlined />,
  },
  INFO: {
    label: 'Thông tin',
    tone: 'info',
    icon: <InfoCircleOutlined />,
  },
}

/** Nhóm cảnh báo → nhãn tiếng Việt. */
export const ALERT_CATEGORY_LABELS: Record<OperationalAlertCategory, string> = {
  AUTO_CONTROL_FAULT: 'Lỗi hệ thống tưới tự động',
  DEVICE_OFFLINE: 'Thiết bị mất kết nối',
  SENSOR_FAULT: 'Cảm biến bất thường',
  RETRY_WAIT: 'Tạm dừng do lỗi cảm biến',
  MUSHROOM_DISEASE: 'Nấm bệnh / mốc',
  DEVICE_ISSUE: 'Sự cố thiết bị',
  OPERATOR_MESSAGE: 'Thông báo từ nhân viên',
}

/** Nguồn phát sinh → nhãn tiếng Việt. */
export const ALERT_SOURCE_LABELS: Record<OperationalAlertSource, string> = {
  IOT_AUTO_CONTROL: 'Nhật ký IoT',
  NOTIFICATION: 'Thông báo hệ thống',
}
