/**
 * Dashboard Analytics — DTO khớp `GET /api/analytics/dashboard`.
 *
 * ⚠ Đây là nguồn số liệu **duy nhất** cho khu vực KPI của trang Tổng quan
 *   (`features/dashboard`). Trước đây trang này tự gộp 8 endpoint GET bằng
 *   `Promise.all` (kèm vòng lặp gọi `/environment` theo từng tầng và
 *   `/spawn-inspections` theo từng phiên) → rủi ro N+1 request + cascade
 *   failure. Nay BE gom sẵn toàn bộ số liệu trong **một** endpoint.
 *
 * Response thật (Swagger `GET /api/analytics/dashboard`):
 * ```json
 * {
 *   "data": {
 *     "revenue": { "value": 128500000, "currency": "VND" },
 *     "trays_used": 36,
 *     "harvest_quality": { "usable_rate": 93, "waste_rate": 7 }
 *   }
 * }
 * ```
 *
 * Quy ước BE (xem mô tả Swagger):
 *   - `revenue.value` = tổng `orders.total_amount` của các đơn `PAID`
 *     (không phân biệt trạng thái đơn), **toàn bộ thời gian** (không lọc ngày).
 *   - `trays_used` = số lần gán khay trong phiên `CULTIVATING`, `HARVEST_READY`,
 *     `HARVESTING` hoặc `COMPLETED` (khay `ACTIVE`/`RELEASED`; phiên huỷ và
 *     phiên chưa canh tác bị loại). Dùng lại nhiều lần vẫn tính từng lần.
 *   - `harvest_quality.usable_rate` / `waste_rate` = phần trăm khối lượng
 *     thu hoạch đạt / bị loại, làm tròn tối đa 2 chữ số thập phân và **không**
 *     chuẩn hoá để cộng lại đúng 100.
 *   - Metric rỗng hoặc tổng khối lượng bằng 0 → trả `0`.
 */

/** Đơn vị tiền tệ — BE hiện chỉ trả `VND`. */
export type DashboardCurrency = 'VND'

/** Doanh thu tổng (VND) — không có bộ lọc thời gian. */
export interface DashboardRevenue {
  /** Giá trị doanh thu (đơn vị `currency`). */
  value: number
  /** Đơn vị tiền tệ. */
  currency: DashboardCurrency | string
}

/** Chất lượng thu hoạch — tỷ lệ % theo khối lượng. */
export interface DashboardHarvestQuality {
  /** Tỷ lệ khối lượng thu hoạch đạt (0–100). */
  usable_rate: number
  /** Tỷ lệ khối lượng thu hoạch bị loại (0–100). */
  waste_rate: number
}

/** Payload `data` của endpoint — shape đã bóc wrapper. */
export interface DashboardAnalyticsData {
  revenue: DashboardRevenue
  /** Số lần khay được sử dụng (số lượng gán khay trong các phiên đã tính). */
  trays_used: number
  harvest_quality: DashboardHarvestQuality
}

/**
 * Response thô của `GET /api/analytics/dashboard`.
 *
 * ⚠ Tầng API (`features/dashboard/api/dashboard.api.ts`) bóc wrapper `data`
 *   ngay trong `queryFn` ⇒ hook trả `DashboardAnalyticsData`, không phải type
 *   này. Type này giữ để khớp contract Swagger.
 */
export interface DashboardAnalyticsResponse {
  data: DashboardAnalyticsData
}
