import { Tag } from 'antd'
import type { RentalStatus } from '../types/rental.types'
import { RENTAL_STATUS_CONFIG } from './rental-status.config'

interface RentalStatusTagProps {
  status: RentalStatus
}

export function RentalStatusTag({ status }: RentalStatusTagProps) {
  const config = RENTAL_STATUS_CONFIG[status] ?? {
    color: 'default',
    label: status,
    badge: 'default',
  }

  return <Tag color={config.color}>{config.label}</Tag>
}