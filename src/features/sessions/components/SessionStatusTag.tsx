import { StatusBadge } from '../../../shared/ui'
import type { CultivationSessionStatus } from '../types/session.types'
import { normalizeSessionStatus } from '../utils/session-state.utils'
import { SESSION_STATUS_DICTIONARY } from '../../../shared/i18n/status/session'

interface SessionStatusTagProps {
  status: CultivationSessionStatus
}

/** Badge trạng thái phiên canh tác — dùng chung cho cột bảng & drawer. */
export function SessionStatusTag({ status }: SessionStatusTagProps) {
  // ⚠ BE có thể trả trạng thái chưa khai báo trong từ điển ⇒ dùng
  //   `presentStatus()` để **không bao giờ** lộ chuỗi tiếng Anh thô.
  const config = normalizeSessionStatus(status) === 'CULTIVATING'
    ? { tone: 'ok' as const, label: 'Đang canh tác' }
    : SESSION_STATUS_DICTIONARY[normalizeSessionStatus(status)]

  return <StatusBadge tone={config.tone} label={config.label} />
}
