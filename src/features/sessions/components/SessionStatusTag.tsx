import { StatusBadge } from '../../../shared/ui'
import type { CultivationSessionStatus } from '../types/session.types'
import { SESSION_STATUS_CONFIG } from './session-status.config'

interface SessionStatusTagProps {
  status: CultivationSessionStatus
}

/** Badge trạng thái phiên canh tác — dùng chung cho cột bảng & drawer. */
export function SessionStatusTag({ status }: SessionStatusTagProps) {
  const config = SESSION_STATUS_CONFIG[status] ?? {
    tone: 'neutral' as const,
    label: status,
    shortLabel: status,
    step: 0,
  }

  return <StatusBadge tone={config.tone} label={config.label} />
}
