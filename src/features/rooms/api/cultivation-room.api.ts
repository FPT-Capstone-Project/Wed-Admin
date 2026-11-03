import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CultivationRoom,
  CultivationRoomListQuery,
} from '../../../types/cultivation'

/**
 * Cultivation Rooms API — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PUT/DELETE ở đây: Admin web chỉ quan
 *   sát phòng & khay, mọi thao tác thêm / sửa / xoá hạ tầng do **nhân viên
 *   (staff)** thực hiện trên mobile app.
 */
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
