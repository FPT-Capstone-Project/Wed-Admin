import { StatusBadge } from '../../../shared/ui'
import type { CultivationSessionStatus } from '../types/session.types'
import { presentStatus } from '../../../shared/i18n/status/registry'
import { SESSION_STATUS_DICTIONARY } from '../../../shared/i18n/status/session'

interface SessionStatusTagProps {
  status: CultivationSessionStatus
}

/** Badge trạng thái phiên canh tác — dùng chung cho cột bảng & drawer. */
export function SessionStatusTag({ status }: SessionStatusTagProps) {
  // ⚠ BE có thể trả trạng thái chưa khai báo trong từ điển ⇒ dùng
  //   `presentStatus()` để **không bao giờ** lộ chuỗi tiếng Anh thô.
  const config = presentStatus(SESSION_STATUS_DICTIONARY, status)

  return <StatusBadge tone={config.tone} label={config.label} />
}
