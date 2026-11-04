import { normalizeOrder } from './order-normalizer'
import { apiClient } from '../../../shared/api/client'
import { cleanQueryParams, unwrapListResponse } from '../../../shared/api/list-response'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import { isNotFoundError } from '../../../shared/api/safe-fetch'
import type { Order } from '../../../types/order'
import type { AdminOrderDto } from '../types/admin-order.types'

/**
 * Order API — **read-only cho admin web**.
 *
 * Luồng tạo / hủy / thanh toán đơn do **app người dùng** thực hiện
 * (POST /api/orders/cultivation, PATCH /api/orders/{id}/cancel,
 * POST /api/payments/orders/{id}/payos).
 *
 * Admin web chỉ cần đọc để theo dõi vận hành, nên các mutation cố ý
 * KHÔNG được export ở đây để tránh gọi nhầm từ giao diện quản trị.
 */
export const orderApi = {
  /** GET /api/orders (orders của user hiện tại)
   *
   *  LUÔN unwrap response về Order[] an toàn — chấp nhận:
   *  - `Order[]` (mảng trực tiếp)
   *  - `{ data: Order[] }`
   *  - `{ content: Order[] }`
   *  - ... → fallback `[]`
   */
  async list(): Promise<Order[]> {
    const response = await apiClient.get<unknown>('/api/orders')
    return ensureArray<unknown>(response.data).map(normalizeOrder)
  },
  /** GET /api/orders/{orderId}
   *  Unwrap về Order | null an toàn.
   */
  async getById(orderId: number): Promise<Order | null> {
    try {
      const response = await apiClient.get<unknown>(`/api/orders/${orderId}`)
      const raw = ensureObject<unknown>(response.data)
      return raw ? normalizeOrder(raw) : null
    } catch (error) {
      // 404 → đơn không tồn tại (hoặc không thuộc user đang đăng nhập).
      if (isNotFoundError(error)) return null
      throw error
    }
  },
}

/** Tham số phân trang server-side cho endpoint quản trị. */
export interface AdminOrderQuery {
  page?: number
  pageSize?: number
}

/** Metadata phân trang server-side (BE trả kèm `data`). */
export interface AdminOrderPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Kết quả `GET /api/orders/admin`. */
export interface AdminOrderResult {
  items: AdminOrderDto[]
  pagination: AdminOrderPagination
}

/**
 * GET /api/orders/admin — danh sách đơn của **tất cả khách hàng**.
 *
 * ⚠ Chỉ role 1 (Admin) và 2 (Farm Operator) được gọi.
 *
 * Response (Swagger):
 *   `{ data: AdminOrderDto[], pagination: { page, pageSize, total, totalPages } }`
 *
 * ⚠ BE trả về `total_price` / `subtotal` / `discount` / `shipping_fee` /
 *   `total_amount` dưới dạng **chuỗi** (Postgres `numeric`) ⇒ chuẩn hoá về
 *   `number` ngay tại tầng API để UI không phải tự parse.
 */
export async function fetchAdminOrders(
  query: AdminOrderQuery = {},
): Promise<AdminOrderResult> {
  const params = cleanQueryParams({
    page: query.page,
    pageSize: query.pageSize,
  })

  const response = await apiClient.get<unknown>('/api/orders/admin', { params })
  const unwrapped = unwrapListResponse<unknown>(response.data)

  return {
    items: unwrapped.data.map(normalizeAdminOrderDto),
    pagination: {
      page: unwrapped.pagination.page,
      pageSize: unwrapped.pagination.pageSize,
      total: unwrapped.pagination.total,
      totalPages: unwrapped.pagination.totalPages,
    },
  }
}

/**
 * GET /api/orders/admin — lấy **toàn bộ** đơn của mọi khách hàng.
 *
 * ⚠ Vì sao cần? Endpoint quản trị **không** hỗ trợ lọc theo trạng thái
 *   hay từ khóa ⇒ UI cần toàn bộ tập dữ liệu để lọc tab trạng thái +
 *   tìm kiếm ở client. Hàm này tự đọc `pagination.totalPages` rồi gọi tiếp
 *   các trang còn lại (giới hạn tối đa để tránh kéo vô hạn).
 *
 * ⚠ `pageSize` tối đa của BE là 100 ⇒ mỗi request lấy được nhiều nhất
 *   100 đơn.
 */
export async function fetchAllAdminOrders(
  options: { pageSize?: number; maxPages?: number } = {},
): Promise<AdminOrderDto[]> {
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 100))
  const maxPages = Math.max(1, options.maxPages ?? 20)

  const first = await fetchAdminOrders({ page: 1, pageSize })
  const totalPages = Math.min(first.pagination.totalPages, maxPages)
  if (totalPages <= 1) return first.items

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminOrders({ page: index + 2, pageSize }),
    ),
  )

  return [first.items, ...rest.map((result) => result.items)].flat()
}

/**
 * Chuẩn hoá 1 record của `GET /api/orders/admin` về `AdminOrderDto`.
 *
 * ⚠ BE gộp nhiều item của 1 đơn thành 1 record phẳng (tên gói / tên nấm
 *   nối bằng dấu phẩy) ⇒ không có `order_items` để đọc.
 */
export function normalizeAdminOrderDto(raw: unknown): AdminOrderDto {
  const order = ensureObject<Record<string, unknown>>(raw) ?? {}
  const payment = ensureObject<Record<string, unknown>>(order.payment) ?? {}

  const status = text(order.status)?.toUpperCase()
  const orderStatuses: readonly string[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
  ]
  const paymentStatus = text(
    order.payment_status,
    order.paymentStatus,
    payment.status,
  )?.toUpperCase()
  const paymentStatuses: readonly string[] = [
    'UNPAID',
    'PENDING',
    'PAID',
    'FAILED',
    'REFUND_PENDING',
    'REFUNDED',
  ]

  return {
    order_id: numeric(order.order_id, order.orderId, order.id) ?? 0,
    customer_id: numeric(order.customer_id, order.customerId, order.user_id, order.userId),
    customer_name: text(order.customer_name, order.customerName),
    customer_email: text(order.customer_email, order.customerEmail),
    package_name: text(order.package_name, order.packageName),
    mushroom_name: text(order.mushroom_name, order.mushroomName),
    quantity: numeric(order.quantity),
    total_price: text(order.total_price, order.totalPrice),
    subtotal: text(order.subtotal),
    discount: text(order.discount),
    shipping_fee: text(order.shipping_fee, order.shippingFee),
    total_amount: text(order.total_amount, order.totalAmount, order.total_price),
    status:
      status && orderStatuses.includes(status)
        ? (status as AdminOrderDto['status'])
        : 'PENDING',
    payment_status:
      paymentStatus && paymentStatuses.includes(paymentStatus)
        ? (paymentStatus as AdminOrderDto['payment_status'])
        : null,
    created_at: timestamp(order.created_at, order.createdAt, order.order_date),
    updated_at: timestamp(order.updated_at, order.updatedAt),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function numeric(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    if (
      (typeof value === 'number' || typeof value === 'string') &&
      String(value).trim() !== '' &&
      Number.isFinite(Number(value))
    ) {
      return Number(value)
    }
  }
  return null
}

function timestamp(...values: unknown[]): string | null {
  for (const value of values) {
    if (value === 0 || value === '0' || value == null || value === '') continue
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      !(value instanceof Date)
    ) {
      continue
    }
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()) && date.getFullYear() > 1970) {
      return date.toISOString()
    }
  }
  return null
}
