import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CreateRentalPackageRequest,
  RentalPackage,
  RentalPackageListQuery,
  UpdateRentalPackageRequest,
} from '../../../types/rental-package'

/**
 * ⚠ BE trả `rental_packages.price` dạng **chuỗi** (Postgres `numeric`,
 *   vd `"1300000.00"`) ⇒ chuẩn hoá về `number` ngay tại biên để:
 *   - khớp với type `RentalPackage.price: number`,
 *   - các phép tính doanh thu (trang Báo cáo) không ra 0 đ.
 */
function normalizeRentalPackage(item: RentalPackage): RentalPackage {
  return {
    ...item,
    price: Number(item.price),
    duration_days: Number(item.duration_days),
  }
}

export const rentalPackageApi = {
  async list(query: RentalPackageListQuery = {}): Promise<RentalPackage[]> {
    const response = await apiClient.get<unknown>(
      '/api/rental-packages',
      { params: query },
    )
    return ensureArray<RentalPackage>(response.data).map(normalizeRentalPackage)
  },

  async getById(id: number): Promise<RentalPackage | null> {
    const response = await apiClient.get<unknown>(
      `/api/rental-packages/${id}`,
    )
    const item = ensureObject<RentalPackage>(response.data)
    return item ? normalizeRentalPackage(item) : null
  },

  async create(payload: CreateRentalPackageRequest): Promise<RentalPackage | null> {
    const response = await apiClient.post<unknown>(
      '/api/rental-packages',
      payload,
    )
    return ensureObject<RentalPackage>(response.data)
  },

  async update(
    id: number,
    payload: UpdateRentalPackageRequest,
  ): Promise<RentalPackage | null> {
    const response = await apiClient.put<unknown>(
      `/api/rental-packages/${id}`,
      payload,
    )
    return ensureObject<RentalPackage>(response.data)
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/rental-packages/${id}`)
  },
}
