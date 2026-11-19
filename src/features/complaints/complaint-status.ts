import type { SemanticTone } from '../../app/theme/tokens'
import type { ComplaintStatus } from './complaint.types'

export const COMPLAINT_STATUSES = {
  OPEN: { label: 'Khiếu nại mới tạo', tone: 'danger' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'info' },
  WAITING_CUSTOMER: { label: 'Chờ khách hàng bổ sung thông tin', tone: 'warning' },
  RESOLVED: { label: 'Đã giải quyết', tone: 'ok' },
  REJECTED: { label: 'Từ chối khiếu nại', tone: 'muted' },
} satisfies Record<ComplaintStatus, { label: string; tone: SemanticTone }>
export const STATUS_OPTIONS = (Object.keys(COMPLAINT_STATUSES) as ComplaintStatus[]).map(value => ({ value, label: COMPLAINT_STATUSES[value].label }))
export const isFinalComplaint = (status: ComplaintStatus) => status === 'RESOLVED' || status === 'REJECTED'

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
export function complaintDate(value: string | null): string {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) && date.getUTCFullYear() > 1970 ? dateTime.format(date) : '—'
}
