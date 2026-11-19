import { StatusBadge } from '../../../shared/ui'
import { COMPLAINT_STATUSES } from '../complaint-status'
import type { ComplaintStatus } from '../complaint.types'

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const config = COMPLAINT_STATUSES[status]
  return config ? <StatusBadge {...config} /> : <StatusBadge tone="muted" label="Chưa xác định" />
}
