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
   * ⚠ BE trả 409 ("Rental package is referenced by an order...") khi xoá gói
   *   đã phát sinh đơn ⇒ FE dùng số này để **làm mờ nút Xóa** kèm giải
   *   thích, thay vì để user bấm rồi mới nhận lỗi.
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
