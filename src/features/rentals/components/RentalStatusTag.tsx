import type { RentalStatus } from '../types/rental.types'
import { StatusBadge } from '../../../shared/ui'
import { RENTAL_STATUS_CONFIG } from './rental-status.config'

interface RentalStatusTagProps {
  status: RentalStatus
}

export function RentalStatusTag({ status }: RentalStatusTagProps) {
  const config = RENTAL_STATUS_CONFIG[status] ?? {
    tone: 'neutral',
    label: status,
  }

  return <StatusBadge tone={config.tone} label={config.label} />
}
