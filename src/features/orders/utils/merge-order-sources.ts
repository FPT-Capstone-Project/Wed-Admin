import type { CultivationSession } from '../../sessions/types/session.types'
import type { AdminCultivationSessionDto } from '../../sessions/types/admin-session.types'
import type { FarmSession } from '../../farm/types/farm.types'
import {
  deriveOrderStatus,
  pickRepresentativeSession,
} from './derive-order-status.ts'
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
 * (tên gói / tên nấm nối bằng dấu phẳng, không có `order_items`) và **không**
 * biết phiên canh tác tương ứng. Endpoint phiên thì ngược lại — biết phiên
 * nhưng không có tiền / thanh toán.
 *
 * → Gộp theo `order_id`, ưu tiên nguồn giàu thông tin hơn; trường nào thiếu
 *   thì lấy từ nguồn còn lại. **Không suy đoán** tổng tiền / tên gói /
 *   ngày tạo đơn từ số lượng khay/phôi.
 *
 * ## Trạng thái đơn — dẫn xuất từ phiên
 *
 * ⚠ BE có lỗi: luồng bàn giao thu hoạch (`harvestRequest.model.js` →
 *   `complete()`) set `cultivation_sessions.status = 'COMPLETED'` nhưng
 *   **không** update `orders.status` ⇒ đơn kẹt "Đang xử lý" vĩnh viễn.
 *
 * → Ở đây ta **dẫn xuất** trạng thái đơn từ trạng thái phiên: nếu đơn có nguồn
 *   `order` và **mọi** phiên của đơn đã `COMPLETED` ⇒ hiển thị `COMPLETED`.
 *   Xem `derive-order-status.ts` để biết đầy đủ quy tắc.
 *
 * @param sessionsComplete `true` khi đã tải **đủ** phiên của mọi đơn. Nếu
 *   `false` ⇒ không được kết luận "tất cả phiên đã hoàn tất" (có thể còn
 *   phiên chưa tải về ⇒ sẽ kết luận sai).
 */
export function mergeOrderSources(
  adminOrders: AdminOrderDto[],
  adminSessions: AdminCultivationSessionDto[],
  farmSessions: FarmSession[],
  sessionsComplete = true,
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
      statusDerived: false,
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

  // ── 0. Gom phiên theo `order_id` ──────────────────────────────────────
  //
  // ⚠ Một đơn có thể sinh **nhiều** phiên (nhiều gói / nhiều item) ⇒ phải gom
  //   lại thành nhóm trước, không được lấy "phiên cuối gặp" làm đại diện.
  const sessionsByOrder = new Map<number, AdminCultivationSessionDto[]>()
  for (const session of adminSessions) {
    const orderId = Number(session.order_id)
    if (!Number.isFinite(orderId) || orderId <= 0) continue
    const bucket = sessionsByOrder.get(orderId)
    if (bucket) bucket.push(session)
    else sessionsByOrder.set(orderId, [session])
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
  for (const [orderId, sessions] of sessionsByOrder) {
    const row = ensure(orderId)
    addSource(row, 'session')

    const representative = pickRepresentativeSession(sessions)
    const first = sessions[0]

    row.sessionId = representative?.session_id ?? row.sessionId
    row.sessionStatus = representative?.status ?? row.sessionStatus
    row.customerId = first.user_id ?? row.customerId
    row.customerName = first.customer_name ?? row.customerName
    row.customerEmail = first.customer_email ?? row.customerEmail
    if (row.packageName === '—') {
      row.packageName = first.package_name ?? row.packageName
    }
    if (row.mushroomName === '—') {
      row.mushroomName = first.mushroom_name ?? row.mushroomName
    }
    // A session timestamp is not the creation timestamp of its order.
    // Keep unknown order dates null when the order endpoint provides no date.

    // Trạng thái đơn suy ra từ trạng thái phiên khi không có nguồn `order`.
    if (!row.sources.includes('order')) {
      row.status = sessionToOrderStatus(
        representative?.status ?? 'PENDING',
      )
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

  // ── 4. Trạng thái dẫn xuất — sửa lỗi đơn kẹt "Đang xử lý" ────────────
  //
  // ⚠ Chỉ áp dụng cho đơn **có** nguồn `order` (đơn không có nguồn order thì
  //   trạng thái đã được suy ra từ phiên ở bước 2).
  for (const [orderId, sessions] of sessionsByOrder) {
    const row = map.get(orderId)
    if (!row || !row.sources.includes('order')) continue

    const derived = deriveOrderStatus(row.status, sessions, sessionsComplete)
    if (derived !== row.status) {
      row.status = derived
      row.statusDerived = true
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
