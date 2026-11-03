import type { Order } from '../../../types/order'
import type { CultivationSession } from '../../sessions/types/session.types'
import type { FarmSession } from '../../farm/types/farm.types'
import type { AdminOrderRow, AdminOrderSource, AdminOrderStatus } from '../types/admin-order.types'
/** Hợp nhất 3 mảng nguồn thành danh sách đơn duy nhất (key = `order_id`). */
export function mergeOrderSources(
  beOrders: Order[],
  sessions: CultivationSession[],
  farmSessions: FarmSession[],
): AdminOrderRow[] {
  const map = new Map<number, AdminOrderRow>()

  const ensure = (orderId: number): AdminOrderRow => {
    const existing = map.get(orderId)
    if (existing) return existing
    const created: AdminOrderRow = {
      orderId,
      orderCode: `#${orderId}`,
      customerName: '—',
      customerEmail: '—',
      customerPhone: '—',
      packageName: '—',
      mushroomName: '—',
      status: 'PENDING',
      sessionStatus: null,
      sessionId: null,
      paymentStatus: 'UNPAID',
      totalAmount: 0,
      spawnIssued: null,
      createdAt: null,
      sources: [],
    }
    map.set(orderId, created)
    return created
  }

  const addSource = (row: AdminOrderRow, source: AdminOrderSource) => {
    if (!row.sources.includes(source)) row.sources.push(source)
  }

  // ── 1. Nguồn `order` — giàu `total_amount` + `status` chuẩn của BE ──
  for (const be of beOrders) {
    const orderId = Number(be.order_id)
    if (!Number.isFinite(orderId) || orderId <= 0) continue

    const row = ensure(orderId)
    addSource(row, 'order')

    row.status = (be.status ?? 'PENDING') as AdminOrderStatus
    row.customerName = be.customer_name ?? row.customerName
    row.customerEmail = be.customer_email ?? row.customerEmail
    row.paymentStatus = be.payment_status ?? row.paymentStatus
    row.totalAmount = be.total_amount ?? row.totalAmount
    row.orderCode = be.order_code ?? row.orderCode
    row.createdAt = be.created_at ?? row.createdAt

    row.packageName = be.package_name ?? row.packageName
    row.mushroomName = be.mushroom_name ?? row.mushroomName
    const firstItem = be.items?.[0]
    if (firstItem) {
      row.packageName = be.package_name ?? firstItem.package_name ?? row.packageName
      row.mushroomName = be.mushroom_name ?? firstItem.mushroom_name ?? row.mushroomName
    }
  }

  // ── 2. Nguồn `session` (farm/sessions) ──────────────────
  for (const session of sessions) {
    const orderId = Number(session.order_id)
    if (!Number.isFinite(orderId) || orderId <= 0) continue

    const row = ensure(orderId)
    addSource(row, 'session')

    row.sessionId = session.session_id
    row.sessionStatus = session.status
    row.customerName = session.customer_name ?? row.customerName
    row.customerEmail = session.customer_email ?? row.customerEmail
    row.customerPhone = session.customer_phone ?? row.customerPhone
    if (row.packageName === '—') row.packageName = session.package_name ?? row.packageName
    if (row.mushroomName === '—') row.mushroomName = session.mushroom_name ?? row.mushroomName
    // A session timestamp is not the creation timestamp of its order.
    // Keep unknown order dates null when the order endpoint provides no date.

    // Trạng thái đơn suy ra từ trạng thái phiên khi không có nguồn `order`.
    if (!row.sources.includes('order')) {
      row.status = sessionToOrderStatus(session.status)
    }
  }

  // ── 3. Nguồn `farm` — bổ sung `spawn_issued` + tên nấm ────────────────
  for (const farm of farmSessions) {
    const orderId = Number(farm.order_id)
    if (!Number.isFinite(orderId) || orderId <= 0) continue

    const row = ensure(orderId)
    addSource(row, 'farm')

    row.customerName = farm.customer_name ?? row.customerName
    row.customerEmail = farm.customer_email ?? row.customerEmail
    row.customerPhone = farm.customer_phone ?? row.customerPhone
    if (row.packageName === '—') row.packageName = farm.package_name ?? row.packageName
    if (row.mushroomName === '—') row.mushroomName = farm.mushroom_name ?? row.mushroomName
    row.spawnIssued = farm.spawn_issued ?? row.spawnIssued

    if (row.sessionId == null) {
      row.sessionId = farm.session_id
      row.sessionStatus = farm.status
    }
    if (!row.sources.includes('order') && !row.sources.includes('session')) {
      row.status = sessionToOrderStatus(farm.status)
    }
  }

  return [...map.values()].sort(
    (a, b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0),
  )
}

/**
 * Suy ra trạng thái đơn từ trạng thái phiên canh tác.
 *
 * Ánh xạ theo vòng đời thật:
 *   PENDING / SPAWN_RESTING / MYCELIAL_DEVELOPMENT → PENDING (chờ xử lý)
 *   READY_FOR_CULTIVATION / CULTIVATING / HARVESTING → PROCESSING
 *   COMPLETED → COMPLETED
 *   CANCELLED → CANCELLED
 */
function sessionToOrderStatus(
  status: CultivationSession['status'],
): AdminOrderStatus {
  switch (status) {
    case 'COMPLETED':
      return 'COMPLETED'
    case 'CANCELLED':
      return 'CANCELLED'
    case 'READY_FOR_CULTIVATION':
    case 'CULTIVATING':
    case 'HARVEST_READY':
    case 'HARVESTING':
      return 'PROCESSING'
    case 'PENDING':
    case 'SPAWN_RESTING':
    case 'MYCELIAL_DEVELOPMENT':
    default:
      return 'PENDING'
  }
}
