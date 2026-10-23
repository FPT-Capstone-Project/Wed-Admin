/**
 * Mapper layer giữa Backend Order (snake_case, status BE)
 * và UI AppOrder (camelCase, status UI với PENDING_TRAY_ASSIGNMENT/GROWING/...).
 *
 * BE status:
 *   PENDING | CONFIRMED | PROCESSING | COMPLETED | CANCELLED
 *   (kèm payment_status: UNPAID|PENDING|PAID|FAILED|REFUND_PENDING|REFUNDED)
 *
 * UI status:
 *   PENDING_TRAY_ASSIGNMENT | ASSIGNED | GROWING | READY_TO_HARVEST
 *   | COMPLETED | CANCELLED
 *
 * Mapping chiến lược (best-effort):
 *   PENDING  → PENDING_TRAY_ASSIGNMENT (chờ admin gán khay)
 *   CONFIRMED → ASSIGNED (đã gán khay)
 *   PROCESSING → GROWING (đang sinh trưởng)
 *   COMPLETED → READY_TO_HARVEST (đến độ thu hoạch)
 *   (Note: nếu BE có status COMPLETED/CANCELLED khác UI cần xử lý riêng)
 */
import type { Order, OrderItem as BeOrderItem } from './order'
import type {
  AppOrder,
  OrderItem as UiOrderItem,
  OrderStatus as UiOrderStatus,
  DeliveryMethod,
} from './order.types'

function beStatusToUi(status?: Order['status']): UiOrderStatus {
  switch (status) {
    case 'PENDING':
      return 'PENDING_TRAY_ASSIGNMENT'
    case 'CONFIRMED':
      return 'ASSIGNED'
    case 'PROCESSING':
      return 'GROWING'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'CANCELLED':
      return 'CANCELLED'
    default:
      return 'PENDING_TRAY_ASSIGNMENT'
  }
}

function bePaymentStatusToUi(
  ps?: Order['payment_status'],
): AppOrder['paymentStatus'] {
  if (!ps) return 'UNPAID'
  switch (ps) {
    case 'PAID':
      return 'PAID'
    case 'UNPAID':
    case 'PENDING':
    case 'FAILED':
    case 'REFUND_PENDING':
    case 'REFUNDED':
    default:
      return ps === 'REFUNDED' ? 'REFUNDED' : 'UNPAID'
  }
}

function beItemToUiItem(item: BeOrderItem, index: number): UiOrderItem {
  return {
    mushroomType: item.mushroom_type_name ?? `Loại nấm #${index + 1}`,
    weeks: Math.max(1, Math.round((item.growing_days ?? 0) / 7)),
    quantity: item.quantity ?? 1,
    unitPrice: item.unit_price ?? 0,
  }
}

/**
 * Chuyển đổi 1 Order BE → AppOrder UI.
 * Nhận `Order | null` — trả về null-safe fallback nếu Order không hợp lệ.
 */
export function beOrderToUiOrder(be: Order | null): AppOrder | null {
  if (!be || typeof be !== 'object') return null

  const items: UiOrderItem[] = Array.isArray(be.items)
    ? be.items.map(beItemToUiItem)
    : []

  return {
    id: String(be.order_id ?? 0),
    orderCode: be.order_code ?? `#${be.order_id ?? '?'}`,
    tenantId: be.user_id ? String(be.user_id) : '',
    tenantName: be.customer_name ?? `Khách hàng #${be.order_id ?? '?'}`,
    tenantPhone: '',
    tenantAddress: '',
    items,
    deliveryMethod: 'PICKUP' as DeliveryMethod,
    deliveryFee: 0,
    totalAmount: be.total_amount ?? 0,
    paymentMethod: 'ONLINE_APP',
    paymentStatus: bePaymentStatusToUi(be.payment_status),
    status: beStatusToUi(be.status),
    trayId: undefined,
    batchId: undefined,
    createdAt: be.created_at ?? new Date().toISOString(),
    updatedAt: be.updated_at ?? be.created_at ?? new Date().toISOString(),
  }
}

/**
 * Chuyển đổi Order[] BE → AppOrder[] UI.
 * Nhận `unknown` (đã ensureArray ở api layer) — an toàn với mọi response shape.
 */
export function beOrdersToUiOrders(orders: unknown): AppOrder[] {
  if (!Array.isArray(orders)) return []

  return orders
    .map((o) => beOrderToUiOrder(o as Order))
    .filter((o): o is AppOrder => o !== null)
}
