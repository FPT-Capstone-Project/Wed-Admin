/**
 * Rental Packages — DTOs khớp với Swagger schemas.
 * Endpoint: /api/rental-packages
 */

export type RentalPackageStatus = 'ACTIVE' | 'INACTIVE'

export interface RentalPackage {
  package_id: number
  package_name: string
  description: string | null
  duration_days: number
  price: number
  status: RentalPackageStatus
  /**
   * Số đơn hàng đang tham chiếu gói này.
   *
   * ⚠ **BE hiện KHÔNG trả trường này** cho `GET /api/rental-packages` (model
   *   chỉ SELECT `package_id, package_name, description, duration_days, price,
   *   status`; OpenAPI schema `RentalPackage` cũng không khai báo) ⇒ luôn
   *   `undefined`.
   *
   * ⇒ FE tự đếm từ `GET /api/orders/admin` (khớp theo tên gói) — xem
   *   `features/packages/utils/package-order-count.utils.ts` và
   *   `features/packages/hooks/useRentalPackageOrderCounts.ts`.
   *
   * ⚠ Field này được giữ lại làm **fallback** phòng khi BE bổ sung sau này.
   */
  order_count?: number | null
}

/** POST /api/rental-packages */
export interface CreateRentalPackageRequest {
  packageName: string
  description?: string
  durationDays: number
  price: number
  status?: RentalPackageStatus
}

/** PUT /api/rental-packages/{id} */
export interface UpdateRentalPackageRequest {
  packageName?: string
  description?: string
  durationDays?: number
  price?: number
  status?: RentalPackageStatus
}

export interface RentalPackageListQuery {
  status?: RentalPackageStatus
}
