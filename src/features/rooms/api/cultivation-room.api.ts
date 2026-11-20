import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CultivationRoom,
  CultivationRoomListQuery,
} from '../../../types/cultivation'

export const cultivationRoomApi = {
  async list(query: CultivationRoomListQuery = {}): Promise<CultivationRoom[]> {
    const response = await apiClient.get<unknown>(
      '/api/cultivation-rooms',
      { params: query },
    )
    return ensureArray<CultivationRoom>(response.data)
  },

  async getById(id: number): Promise<CultivationRoom | null> {
    const response = await apiClient.get<unknown>(
      `/api/cultivation-rooms/${id}`,
    )
    return ensureObject<CultivationRoom>(response.data)
  },
}
