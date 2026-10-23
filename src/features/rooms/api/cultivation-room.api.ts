import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CreateCultivationRoomRequest,
  CultivationRoom,
  CultivationRoomListQuery,
  UpdateCultivationRoomRequest,
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

  async create(
    payload: CreateCultivationRoomRequest,
  ): Promise<CultivationRoom | null> {
    const response = await apiClient.post<unknown>(
      '/api/cultivation-rooms',
      payload,
    )
    return ensureObject<CultivationRoom>(response.data)
  },

  async update(
    id: number,
    payload: UpdateCultivationRoomRequest,
  ): Promise<CultivationRoom | null> {
    const response = await apiClient.put<unknown>(
      `/api/cultivation-rooms/${id}`,
      payload,
    )
    return ensureObject<CultivationRoom>(response.data)
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/cultivation-rooms/${id}`)
  },
}
