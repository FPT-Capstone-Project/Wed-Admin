import type { RentalStatus } from '../types/rental.types'
import { StatusBadge } from '../../../shared/ui'
import type { SemanticTone } from '../../../app/theme/tokens'

interface RentalStatusTagProps {
  status: RentalStatus
}

const RENTAL_STATUS_TONE: Record<
  RentalStatus,
  { tone: SemanticTone; label: string }
> = {
  CONFIRMED: {
    tone: 'warning',
    label: 'Chờ duyệt',
  },
  PREPARING: {
    tone: 'info',
    label: 'Đang chuẩn bị',
  },
  ACTIVE: {
    tone: 'ok',
    label: 'Đang canh tác',
  },
  COMPLETED: {
    tone: 'neutral',
    label: 'Hoàn thành',
  },
  CANCELLED: {
    tone: 'danger',
    label: 'Đã hủy',
  },
}

export function RentalStatusTag({ status }: RentalStatusTagProps) {
  const config = RENTAL_STATUS_TONE[status] ?? {
    tone: 'neutral',
    label: status,
  }

  return <StatusBadge tone={config.tone} label={config.label} />
}
