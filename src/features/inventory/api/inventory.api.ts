import { apiClient } from '../../../shared/api/client'
import { cleanQueryParams, unwrapListResponse } from '../../../shared/api/list-response'
import type { AdjustInventory, CreateInventory, ExportQuery, InventoryQuery } from '../types/inventory.types'
import { mapExport, mapInventory } from '../utils/inventory.utils'

function paginated(raw: unknown, query: { page?: number; limit?: number }) {
  // Không suy ra total từ một trang khi backend quên metadata phân trang.
  const pagination = (raw as { pagination?: Record<string, unknown> } | null)?.pagination
  if (!pagination || !['page', 'limit', 'total', 'totalPages'].every(key => typeof pagination[key] === 'number' && Number.isSafeInteger(pagination[key]) && Number(pagination[key]) >= 0)) {
    throw new Error('Dữ liệu phân trang kho phôi chưa đầy đủ.')
  }
  return unwrapListResponse<unknown>(raw, { page: query.page, pageSize: query.limit })
}

export const inventoryApi = {
  async list(query: InventoryQuery = {}, signal?: AbortSignal) {
    const response = await apiClient.get<unknown>('/api/inventory/admin', { params: cleanQueryParams(query), signal, skipGlobalErrorToast: true })
    const result = paginated(response.data, query)
    return { ...result, data: result.data.map(mapInventory) }
  },
  async exports(query: ExportQuery = {}, signal?: AbortSignal) {
    const response = await apiClient.get<unknown>('/api/inventory/admin/exports', { params: cleanQueryParams(query), signal, skipGlobalErrorToast: true })
    const result = paginated(response.data, query)
    return { ...result, data: result.data.map(mapExport) }
  },
  async create(payload: CreateInventory) {
    await apiClient.post('/api/inventory/admin', payload, { skipGlobalErrorToast: true })
  },
  async adjust(id: number, payload: AdjustInventory) {
    await apiClient.patch(`/api/inventory/admin/${id}`, payload, { skipGlobalErrorToast: true })
  },
  async remove(id: number) {
    await apiClient.delete(`/api/inventory/admin/${id}`, { skipGlobalErrorToast: true })
  },
}
