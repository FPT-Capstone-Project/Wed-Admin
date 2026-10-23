import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CreateRentalPackageRequest,
  RentalPackage,
  RentalPackageListQuery,
  UpdateRentalPackageRequest,
} from '../../../types/rental-package'

export const rentalPackageApi = {
  async list(query: RentalPackageListQuery = {}): Promise<RentalPackage[]> {
    const response = await apiClient.get<unknown>(
      '/api/rental-packages',
      { params: query },
    )
    return ensureArray<RentalPackage>(response.data)
  },

  async getById(id: number): Promise<RentalPackage | null> {
    const response = await apiClient.get<unknown>(
      `/api/rental-packages/${id}`,
    )
    return ensureObject<RentalPackage>(response.data)
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
