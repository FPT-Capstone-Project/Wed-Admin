import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CreateCultivationTrayRequest,
  CultivationTray,
  CultivationTrayListQuery,
  UpdateCultivationTrayRequest,
} from '../../../types/cultivation'

export const cultivationTrayApi = {
  async list(query: CultivationTrayListQuery = {}): Promise<CultivationTray[]> {
    const response = await apiClient.get<unknown>(
      '/api/cultivation-trays',
      { params: query },
    )
    return ensureArray<CultivationTray>(response.data)
  },

  async getById(id: number): Promise<CultivationTray | null> {
    const response = await apiClient.get<unknown>(
      `/api/cultivation-trays/${id}`,
    )
    return ensureObject<CultivationTray>(response.data)
  },

  async create(
    payload: CreateCultivationTrayRequest,
  ): Promise<CultivationTray | null> {
    const response = await apiClient.post<unknown>(
      '/api/cultivation-trays',
      payload,
    )
    return ensureObject<CultivationTray>(response.data)
  },

  async update(
    id: number,
    payload: UpdateCultivationTrayRequest,
  ): Promise<CultivationTray | null> {
    const response = await apiClient.put<unknown>(
      `/api/cultivation-trays/${id}`,
      payload,
    )
    return ensureObject<CultivationTray>(response.data)
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/cultivation-trays/${id}`)
  },
}
