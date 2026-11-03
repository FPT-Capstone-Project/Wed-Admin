import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CultivationTray,
  CultivationTrayListQuery,
} from '../../../types/cultivation'

/**
 * Cultivation Trays API — **100% READ-ONLY**.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG thêm hàm POST/PUT/DELETE ở đây: Admin web chỉ quan
 *   sát khay, mọi thao tác thêm / sửa / xoá hạ tầng do **nhân viên (staff)**
 *   thực hiện trên mobile app.
 */
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
}
