import type { AdminOrderDto } from '../../orders/types/admin-order.types'

/** Count each paid order once; aggregate names cannot support item-level allocation. */
export function buildPaidOrderRevenue(orders: AdminOrderDto[]) {
  const seen = new Set<number>()
  const species = new Map<string, number>()
  const events: { date: string; amount: number }[] = []
  let total = 0
  for (const order of orders) {
    if (order.payment_status !== 'PAID' || seen.has(order.order_id)) continue
    seen.add(order.order_id)
    const amount = Number(order.total_amount)
    if (order.total_amount == null || !order.total_amount.trim() || !Number.isFinite(amount) || amount < 0) {
      throw new Error(`Đơn #${order.order_id} đã thanh toán nhưng thiếu tổng tiền hợp lệ.`)
    }
    const names = [...new Set((order.mushroom_name ?? '').split(',').map(name => name.trim()).filter(Boolean))]
    const name = names.length === 1 ? names[0] : 'Khác'
    species.set(name, (species.get(name) ?? 0) + amount)
    events.push({ date: order.created_at ?? '', amount })
    total += amount
  }
  return { total, events, species: [...species].map(([species, revenue]) => ({ species, revenue })) }
}
