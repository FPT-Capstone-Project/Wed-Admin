import type { CultivationSession } from '../../sessions/types/session.types'
import type { AdminCultivationSessionDto } from '../../sessions/types/admin-session.types'
import type { FarmSession } from '../../farm/types/farm.types'
import type {
  AdminOrderDto,
  AdminOrderRow,
  AdminOrderSource,
  AdminOrderStatus,
} from '../types/admin-order.types'

/**
 * Hợp nhất các nguồn dữ liệu thành danh sách đơn duy nhất (key = `order_id`).
 *
 * ## Nguồn
 *
 *   1. `order`   — `GET /api/orders/admin` (nguồn CHÍNH): đơn của **mọi**
 *      khách hàng, đã có tổng tiền / trạng thái thanh toán / trạng thái đơn /
 *      ngày tạo / tên gói / tên nấm.
 *   2. `session` — `GET /api/cultivation-sessions/admin`: bổ sung **trạng thái
 *      phiên canh tác** + `session_id` của đơn đã tạo phiên.
 *   3. `farm`    — `GET /api/farm/sessions`: bổ sung `spawn_issued` (số phôi đã
 *      cấp) + số điện thoại khách.
 *
 * ## Vì sao vẫn cần hợp nhất?
 *
 * `GET /api/orders/admin` gộp **mọi item của 1 đơn** thành 1 record phẳng
 * (tên gói / tên nấm nối bằng dấu phẩy, không có `order_items`) và **không**
 * biết phiên canh tác tương ứng. Endpoint phiên thì ngược lại — biết phiên
 * nhưng không có tiền / thanh toán.
 *
 * → Gộp theo `order_id`, ưu tiên nguồn giàu thông tin hơn; trường nào thiếu
 *   thì lấy từ nguồn còn lại. **Không suy đoán** tổng tiền / tên gói /
 *   ngày tạo đơn từ số lượng khay/phôi.
 */
export function mergeOrderSources(
  adminOrders: AdminOrderDto[],
  adminSessions: AdminCultivationSessionDto[],
  farmSessions: FarmSession[],
): AdminOrderRow[] {
  const map = new Map<number, AdminOrderRow>()

  const ensure = (orderId: number): AdminOrderRow => {
    const existing = map.get(orderId)
    if (existing) return existing
    const created: AdminOrderRow = {
      orderId,
      // ⚠ BE không sinh `order_code` ⇒ hiển thị mã đơn bằng `#<order_id>`.
      orderCode: `#${orderId}`,
      customerId: null,
      customerName: '—',
      customerEmail: '—',
      customerPhone: '—',
      packageName: '—',
      mushroomName: '—',
      quantity: null,
      status: 'PENDING',
      sessionStatus: null,
      sessionId: null,
      paymentStatus: 'UNPAID',
      totalAmount: 0,
      spawnIssued: null,
      createdAt: null,
      updatedAt: null,
      sources: [],
    }
    map.set(orderId, created)
    return created
  }

  const addSource = (row: AdminOrderRow, source: AdminOrderSource) => {
    if (!row.sources.includes(source)) row.sources.push(source)
  }

  // ── 1. Nguồn `order` — `/api/orders/admin` ────────────────────────────
  for (const dto of adminOrders) {
    const orderId = Number(dto.order_id)
    if (!Number.isFinite(orderId) || orderId <= 0) continue

    const row = ensure(orderId)
    addSource(row, 'order')

    row.customerId = dto.customer_id ?? row.customerId
    row.customerName = dto.customer_name ?? row.customerName
    row.customerEmail = dto.customer_email ?? row.customerEmail
    row.packageName = dto.package_name ?? row.packageName
    row.mushroomName = dto.mushroom_name ?? row.mushroomName
    row.quantity = dto.quantity ?? row.quantity
    row.status = (dto.status ?? 'PENDING') as AdminOrderStatus
    row.paymentStatus = dto.payment_status ?? row.paymentStatus
    row.totalAmount = parseMoney(dto.total_amount) ?? row.totalAmount
    row.createdAt = dto.created_at ?? row.createdAt
    row.updatedAt = dto.updated_at ?? row.updatedAt
  }

  // ── 2. Nguồn `session` — `/api/cultivation-sessions/admin` ─────────────
  for (const session of adminSessions) {
    const orderId = Number(session.order_id)
    if (!Number.isFinite(orderId) || orderId <= 0) continue

    const row = ensure(orderId)
    addSource(row, 'session')

    row.sessionId = session.session_id
    row.sessionStatus = session.status
    row.customerId = session.user_id ?? row.customerId
    row.customerName = session.customer_name ?? row.customerName
    row.customerEmail = session.customer_email ?? row.customerEmail
    if (row.packageName === '—') {
      row.packageName = session.package_name ?? row.packageName
    }
    if (row.mushroomName === '—') {
      row.mushroomName = session.mushroom_name ?? row.mushroomName
    }
    // A session timestamp is not the creation timestamp of its order.
    // Keep unknown order dates null when the order endpoint provides no date.

    // Trạng thái đơn suy ra từ trạng thái phiên khi không có nguồn `order`.
    if (!row.sources.includes('order')) {
      row.status = sessionToOrderStatus(session.status)
    }
  }

  // ── 3. Nguồn `farm` — bổ sung `spawn_issued` + SĐT khách ───────────────
  for (const farm of farmSessions) {
    const orderId = Number(farm.order_id)
    if (!Number.isFinite(orderId) || orderId <= 0) continue

    const row = ensure(orderId)
    addSource(row, 'farm')

    row.customerName = farm.customer_name ?? row.customerName
    row.customerEmail = farm.customer_email ?? row.customerEmail
    row.customerPhone = farm.customer_phone ?? row.customerPhone
    if (row.packageName === '—') {
      row.packageName = farm.package_name ?? row.packageName
    }
    if (row.mushroomName === '—') {
      row.mushroomName = farm.mushroom_name ?? row.mushroomName
    }
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
    (a, b) =>
      (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0),
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

/**
 * Parse tiền tệ từ chuỗi (Postgres `numeric`) về number.
 *
 * ⚠ BE trả `total_amount` / `subtotal` / … dưới dạng **chuỗi**.
 */
function parseMoney(value: string | null | undefined): number | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
