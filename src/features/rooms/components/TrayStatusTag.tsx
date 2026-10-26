import { StatusBadge } from '../../../shared/ui/StatusBadge'
import type { TrayStatus } from '../../../types/room.types'
import { TRAY_STATUS_CONFIG } from './tray-status.config'

interface TrayStatusTagProps {
  status: TrayStatus
}

/**
 * Badge trạng thái khay — dùng `StatusBadge` chung của app để đảm bảo
 * tương phản WCAG AA (badge preset của antd không đạt).
 */
export function TrayStatusTag({ status }: TrayStatusTagProps) {
  const config = TRAY_STATUS_CONFIG[status]

  return <StatusBadge tone={config.tone} label={config.label} />
}
