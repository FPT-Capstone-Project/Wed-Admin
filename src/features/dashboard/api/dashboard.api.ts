import { apiClient } from '../../../shared/api/client'
import { ensureObject } from '../../../shared/api/response-normalizer'
import type {
  DashboardAnalyticsData,
  DashboardAnalyticsResponse,
} from '../../../types/dashboard'

/**
 * Dashboard Analytics API — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PUT/PATCH/DELETE ở đây.
 *
 * Nguồn số liệu duy nhất cho KPI trang Tổng quan:
 *   - `GET /api/analytics/dashboard` → `{ data: { revenue, trays_used,
 *     harvest_quality } }`
 *
 * ⚠ Endpoint này **thay thế** hoàn toàn luồng cũ gộp 8 endpoint bằng
 *   `Promise.all` (kèm vòng lặp `/environment` theo tầng và
 *   `/spawn-inspections` theo phiên) → loại bỏ rủi ro N+1 request và
 *   cascade failure (một tầng/phien lỗi làm hỏng cả trang).
 *
 * Phân quyền (Swagger): `403` nếu không phải Admin / Farm Operator.
 */

const DASHBOARD_ANALYTICS_URL = '/api/analytics/dashboard'

/**
 * Tải toàn bộ số liệu KPI của trang Tổng quan — **một request duy nhất**.
 *
 * Tầng API chịu trách nhiệm bóc wrapper `data` (BE trả `{ data: {...} }`)
 * và chuẩn hoá các field số về `number` (BE có thể trả số dạng chuỗi).
 *
 * @throws AxiosError khi request lỗi (401/403/404/5xx) → React Query xử lý.
 */
export async function fetchDashboardMetrics(): Promise<DashboardAnalyticsData> {
  const response = await apiClient.get<unknown>(DASHBOARD_ANALYTICS_URL)

  // `ensureObject` bóc 1 cấp wrapper `data`/`content`; nếu BE trả thẳng
  // object (không wrapper) thì trả chính nó.
  const body = ensureObject<DashboardAnalyticsResponse['data'] & Record<string, unknown>>(
    response.data,
  )

  if (!body) {
    throw new Error('Dữ liệu tổng quan không đúng định dạng.')
  }

  return normalizeDashboardMetrics(body)
}

/**
 * Chuẩn hoá payload về shape domain.
 *
 * ⚠ Mọi field đều có fallback an toàn (`0`) — không bao giờ trả `NaN` /
 *   `undefined` ra UI. Thiếu `harvest_quality` ⇒ cả hai tỷ lệ = 0.
 */
function normalizeDashboardMetrics(
  raw: Partial<DashboardAnalyticsData> & Record<string, unknown>,
): DashboardAnalyticsData {
  const revenue = (raw.revenue ?? {}) as Record<string, unknown>
  const harvest = (raw.harvest_quality ?? {}) as Record<string, unknown>

  return {
    revenue: {
      value: toFiniteNumber(revenue.value),
      currency:
        typeof revenue.currency === 'string' && revenue.currency.trim()
          ? revenue.currency
          : 'VND',
    },
    trays_used: toFiniteNumber(raw.trays_used),
    harvest_quality: {
      usable_rate: toFiniteNumber(harvest.usable_rate),
      waste_rate: toFiniteNumber(harvest.waste_rate),
    },
  }
}

/** Đọc số hợp lệ (chấp nhận chuỗi số) — fallback `0`. */
function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}
