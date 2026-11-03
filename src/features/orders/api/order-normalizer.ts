import type { Order, OrderItem, OrderStatus, PaymentStatus } from '../../../types/order'
type Fields = Record<string, unknown>
function fields(value: unknown): Fields { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Fields : {} }
function text(...values: unknown[]): string | undefined { return values.find((value): value is string => typeof value === 'string' && value.trim() !== '')?.trim() }
function numeric(...values: unknown[]): number | undefined {
  for (const value of values) {
    if ((typeof value === 'number' || typeof value === 'string') && String(value).trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return undefined
}
function timestamp(...values: unknown[]): string | null {
  for (const value of values) {
    if (value === 0 || value === '0' || value == null || value === '') continue
    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()) && date.getFullYear() > 1970) return date.toISOString()
  }
  return null
}
function normalizeItem(raw: unknown): OrderItem {
  const item = fields(raw)
  const pack = fields(item.package)
  const mushroom = fields(item.mushroom_type ?? item.mushroomType)
  return {
    item_id: numeric(item.item_id, item.order_item_id, item.itemId),
    order_id: numeric(item.order_id, item.orderId),
    package_id: numeric(item.package_id, item.rental_package_id, item.packageId),
    mushroom_type_id: numeric(item.mushroom_type_id, item.mushroomTypeId),
    package_name: text(item.package_name, item.packageName, pack.package_name, pack.name),
    mushroom_name: text(item.mushroom_type_name, item.mushroomName, item.mushroom_name, mushroom.name),
    growing_days: numeric(item.growing_days, item.growingDays),
    duration_days: numeric(item.duration_days, item.durationDays),
    unit_price: numeric(item.unit_price, item.unitPrice),
    quantity: numeric(item.quantity),
    subtotal: numeric(item.subtotal, item.total_price, item.totalPrice),
  }
}
export function normalizeOrder(raw: unknown): Order {
  const order = fields(raw)
  const pack = fields(order.package)
  const mushroom = fields(order.mushroom_type ?? order.mushroomType)
  const payment = fields(order.payment)
  const customer = fields(order.customer)
  const itemsValue = order.order_items ?? order.orderItems ?? order.items
  const items = Array.isArray(itemsValue) ? itemsValue.map(normalizeItem) : []
  const status = text(order.status)?.toUpperCase()
  const paymentStatus = text(order.payment_status, order.paymentStatus, payment.status)?.toUpperCase()
  const statuses: readonly string[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED']
  const paymentStatuses: readonly string[] = ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED']
  return {
    order_id: numeric(order.order_id, order.orderId, order.id) ?? 0,
    order_code: text(order.order_code, order.orderCode),
    user_id: numeric(order.user_id, order.userId),
    customer_name: text(order.customer_name, order.customerName, customer.full_name, customer.name),
    customer_email: text(order.customer_email, order.customerEmail, customer.email),
    package_name: text(order.package_name, order.packageName, pack.package_name, pack.name, items[0]?.package_name),
    mushroom_name: text(order.mushroom_type_name, order.mushroomName, order.mushroom_name, mushroom.name, items[0]?.mushroom_name),
    status: status && statuses.includes(status) ? status as OrderStatus : 'PENDING',
    payment_status: paymentStatus && paymentStatuses.includes(paymentStatus) ? paymentStatus as PaymentStatus : 'UNPAID',
    total_amount: numeric(order.total_price, order.totalAmount, order.total_amount, order.amount, order.total) ?? 0,
    created_at: timestamp(order.created_at, order.createdAt, order.order_date),
    updated_at: timestamp(order.updated_at, order.updatedAt) ?? undefined,
    items,
  }
}
