/**
 * Từ điển trạng thái — **đơn hàng & thanh toán** (order).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái đơn (`orders.status` — 5 giá trị).
 *   - Trạng thái thanh toán (`orders.payment_status` — 6 giá trị).
 */

import type { StatusDictionary, StatusPresentation } from './types'

/** Trạng thái đơn hàng (`orders.status`). */
export type OrderStatusKey =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'

/** Trạng thái thanh toán (`orders.payment_status`). */
export type PaymentStatusKey =
  | 'PAID'
  | 'UNPAID'
  | 'REFUNDED'
  | 'PENDING'
  | 'FAILED'
  | 'REFUND_PENDING'

/**
 * Trạng thái đơn hàng.
 *
 * ⚠ `COMPLETED` dùng tone `muted` (xám) — đơn đã xong không còn hành
 *   động nào ⇒ hạn chế màu để bảng không bị "nhiễu" màu.
 */
export const ORDER_STATUS_DICTIONARY: Record<OrderStatusKey, StatusPresentation> =
  {
    PENDING: { tone: 'warning', label: 'Chờ xử lý' },
    CONFIRMED: { tone: 'info', label: 'Đã xác nhận' },
    PROCESSING: { tone: 'ok', label: 'Đang xử lý' },
    COMPLETED: { tone: 'muted', label: 'Hoàn thành' },
    CANCELLED: { tone: 'danger', label: 'Đã hủy' },
  }

/**
 * Trạng thái thanh toán.
 *
 * ⚠ `PENDING` (đang xử lý) dùng tone `info` còn `REFUND_PENDING` dùng
 *   `warning` — cả hai đều là "chờ" nhưng khác hướng ⇒ phải phân biệt.
 */
export const PAYMENT_STATUS_DICTIONARY: StatusDictionary = {
  PAID: { tone: 'ok', label: 'Đã thanh toán' },
  UNPAID: { tone: 'warning', label: 'Chưa thanh toán' },
  REFUNDED: { tone: 'danger', label: 'Đã hoàn tiền' },
  PENDING: { tone: 'info', label: 'Đang xử lý' },
  FAILED: { tone: 'danger', label: 'Thất bại' },
  REFUND_PENDING: { tone: 'warning', label: 'Chờ hoàn tiền' },
}
