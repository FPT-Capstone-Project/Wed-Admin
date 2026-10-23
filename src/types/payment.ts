/**
 * Payments — PayOS DTOs khớp Swagger.
 * Endpoints: /api/payments/orders/{orderId}/payos (create payment link),
 *            /api/payments/orders/{orderId}/status (poll status),
 *            /api/payments/payos/webhook (server-side only).
 */

export type PayosPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED'

export interface PayosCheckoutData {
  paymentId: number
  orderCode: number
  orderId: number
  amount: number
  checkoutUrl: string
  qrCode: string | null
  /** Unix timestamp seconds */
  expiresAt: number
  paymentStatus: PayosPaymentStatus
}

export interface PayosPaymentResponse {
  success: boolean
  message: string
  data: PayosCheckoutData
}

export type PaymentStatusValue =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'

export interface PaymentStatusData {
  orderId: number
  orderStatus:
    | 'PENDING'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'CANCELLED'
  paymentStatus: PaymentStatusValue
  /** PayOS order code for the latest payment */
  paymentCode: string
  amount: number
}

export interface PaymentStatusResponse {
  success: boolean
  data: PaymentStatusData
}

/** UI PaymentStatus (alias cho order.types.ts AppOrder.paymentStatus) */
export type UiPaymentStatus = 'PAID' | 'UNPAID' | 'REFUNDED'

/** Map BE PaymentStatusValue → UI UiPaymentStatus */
export function bePaymentStatusToUi(
  ps: PaymentStatusValue,
): UiPaymentStatus {
  if (ps === 'PAID') return 'PAID'
  if (ps === 'REFUNDED') return 'REFUNDED'
  return 'UNPAID'
}

/** Trạng thái có thể tiếp tục polling (chưa kết thúc) */
export function isPaymentActive(
  ps: PaymentStatusValue | undefined,
): boolean {
  if (!ps) return false
  return ps === 'PENDING' || ps === 'UNPAID'
}
