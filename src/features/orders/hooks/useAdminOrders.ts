import { useMemo } from 'react'
import { useOrders } from './useOrders'
import { useSessions } from '../../sessions/hooks/useSessions'
import { useFarmSessions } from '../../farm/hooks/useFarm'
import type { Order } from '../../../types/order'
import type { CultivationSession } from '../../sessions/types/session.types'
import type { FarmSession } from '../../farm/types/farm.types'
import type {
  AdminOrderRow,
  AdminOrderSource,
  AdminOrderStatus,
} from '../types/admin-order.types'

/**
 * Hợp nhất danh sách đơn cho Web Admin — **chỉ đọc**.
 *
 * ⚠ `GET /api/orders` của BE chỉ trả đơn của chính user đang đăng nhập →
 *   Admin cần thêm 2 nguồn:
 *     - `GET /api/cultivation-sessions/admin`
 *     - `GET /api/farm/sessions`
 *   cả hai đều chứa `order_id`, `customer_name`, `customer_email`,
 *   `package_name`, `mushroom_name`.
 *
 * Gộp theo `order_id`; khi trùng, ưu tiên field "đầy đủ hơn"
 * (ví dụ `total_amount` chỉ có ở nguồn `order`).
 *
 * ## Về lỗi 404 của API phụ
 *
 * ⚠ `GET /api/cultivation-sessions/admin` có thể **không tồn tại** trên bản
 *   deploy hiện tại (BE trả 404). `GET /api/farm/sessions` cũng có thể 404
 *   khi chưa có luồng farm.
 *
 * → 2 nguồn phụ này **không được** làm hỏng cả bảng danh sách. Hook dùng
 *   `retry: false` cho 2 nguồn phụ và chỉ coi `useOrders()` (nguồn chính) là
 *   lỗi → UI vẫn hiển thị được 2 đơn đã lấy được từ `/api/orders`.
 */
export function useAdminOrders(): {
  orders: AdminOrderRow[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  // ── Nguồn chính: `/api/orders` ──────────────────────────────────────
  const ordersQuery = useOrders()

  // ── Nguồn phụ: `/api/cultivation-sessions/admin` ─────────────────────
  // ⚠ 404 (endpoint chưa có trên server) → không retry, không làm đỏ bảng.
  const sessionsQuery = useSessions(
    { page: 1, pageSize: 100 },
    { retry: false, staleTime: 60_000 },
  )

  // ── Nguồn phụ: `/api/farm/sessions` ──────────────────────────────────
  const farmQuery = useFarmSessions(undefined, {
    retry: false,
    staleTime: 60_000,
  })

  const orders = useMemo(
    () =>
      mergeOrderSources(
        ordersQuery.data ?? [],
        sessionsQuery.data?.items ?? [],
        farmQuery.data ?? [],
      ),
    [ordersQuery.data, sessionsQuery.data?.items, farmQuery.data],
  )

  // ⚠ Chỉ nguồn CHÍNH mới quyết định trạng thái lỗi của trang.
  //   Lỗi của API phụ chỉ làm mất thông tin bổ sung, không được chặn bảng.
  const isLoading = ordersQuery.isLoading
  const isError = ordersQuery.isError
  const error = ordersQuery.error ?? null

  return {
    orders,
    isLoading,
    isError,
    error,
    refetch: () => {
      void ordersQuery.refetch()
      void sessionsQuery.refetch()
      void farmQuery.refetch()
    },
  }
}

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
      createdAt: new Date(0).toISOString(),
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

    const firstItem = be.items?.[0]
    if (firstItem) {
      row.packageName = firstItem.package_name ?? row.packageName
      row.mushroomName = firstItem.mushroom_name ?? row.mushroomName
    }
  }

  // ── 2. Nguồn `session` (cultivation-sessions/admin) ──────────────────
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
    row.packageName = session.package_name ?? row.packageName
    row.mushroomName = session.mushroom_name ?? row.mushroomName
    row.createdAt = session.created_at ?? row.createdAt

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
    row.packageName = farm.package_name ?? row.packageName
    row.mushroomName = farm.mushroom_name ?? row.mushroomName
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
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
    case 'HARVESTING':
      return 'PROCESSING'
    case 'PENDING':
    case 'SPAWN_RESTING':
    case 'MYCELIAL_DEVELOPMENT':
    default:
      return 'PENDING'
  }
}
