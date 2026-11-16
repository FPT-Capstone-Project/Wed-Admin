import { NOTIFICATION_TYPE_DICTIONARY } from './status/reference'
import { IOT_TERMS } from './terms'

/** Translate system templates; preserve free-form messages written by people. */
export function localizeNotificationText(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const text = value.trim()
  if (text === 'New mushroom diagnosis request') return 'Yêu cầu chẩn đoán bệnh nấm mới'
  const consultation = text.match(/^New expert consultation requested for issue (\d+)\.$/i)
  if (consultation) return `Có yêu cầu chuyên gia tư vấn cho sự cố #${consultation[1]}.`
  return text
    .replace(/[Mm]ạch master/g, IOT_TERMS.master.label)
    .replace(/\b[Mm]aster\b/g, IOT_TERMS.master.label)
    .replace(/\b[Nn]ode\b/g, IOT_TERMS.node.label)
    .replace(/Farm Operator/g, 'nhân viên vận hành')
    .replace(/MASTER_OFFLINE/g, 'mất kết nối bộ điều khiển')
    .replace(/SENSOR_OFFLINE/g, 'cảm biến mất kết nối')
    .replace(/SENSOR_FAULT/g, 'cảm biến bất thường')
    .replace(/INVALID/g, 'dữ liệu không hợp lệ')
    .replace(/\bAUTO\b/g, 'tự động')
    .replace(/\bMANUAL\b/g, 'thủ công')
}

export function presentNotificationContent(type: string, title?: string | null, message?: string | null) {
  return {
    title: localizeNotificationText(title) ?? NOTIFICATION_TYPE_DICTIONARY[type]?.label ?? 'Thông báo hệ thống',
    message: localizeNotificationText(message) ?? localizeNotificationText(title) ?? 'Thông báo từ hệ thống.',
  }
}
