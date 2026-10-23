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