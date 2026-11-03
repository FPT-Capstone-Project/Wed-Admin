import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CultivationRoom,
  CultivationRoomListQuery,
} from '../../../types/cultivation'

export interface RoomRequest { roomCode: string; roomName: string; capacity: number; description?: string }
export const cultivationRoomApi = {
  async create(payload: RoomRequest): Promise<void> { await apiClient.post('/api/cultivation-rooms', payload) },
  async update(id: number, payload: RoomRequest): Promise<void> { await apiClient.put(`/api/cultivation-rooms/${id}`, payload) },
  async remove(id: number): Promise<void> { await apiClient.delete(`/api/cultivation-rooms/${id}`) },
  async generateTrays(id: number): Promise<void> { await apiClient.post(`/api/iot/floors/${id}/trays/generate`) },
  async clearTrays(id: number): Promise<void> { await apiClient.delete(`/api/iot/floors/${id}/trays`) },
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
