import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CreateMushroomTypeFormPayload,
  CreateMushroomTypeRequest,
  MushroomType,
  MushroomTypeListQuery,
  UpdateMushroomTypeFormPayload,
  UpdateMushroomTypeRequest,
} from '../../../types/mushroom-type'

/**
 * Mushroom Types service.
 *
 * POST/PUT dùng multipart/form-data (Swagger chỉ định rõ).
 * GET/DELETE dùng JSON.
 */

function toFormData(payload: CreateMushroomTypeRequest | UpdateMushroomTypeRequest) {
  const form = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, String(value))
  })
  return form
}

/**
 * BE có thể trả `price` / `growing_days` dạng string (vd. "120000") khi đọc
 * từ Decimal/serialized JSON. Chuẩn hoá về number ngay tại biên để các rule
 * `type: 'number'` của AntD Form không bị fail âm thầm.
 */
function normalizeMushroomType(item: MushroomType): MushroomType {
  return {
    ...item,
    growing_days: Number(item.growing_days),
    price: Number(item.price),
  }
}

export const mushroomTypeApi = {
  /** GET /api/mushroom-types?status= */
  async list(query: MushroomTypeListQuery = {}): Promise<MushroomType[]> {
    const response = await apiClient.get<unknown>(
      '/api/mushroom-types',
      { params: query },
    )
    return ensureArray<MushroomType>(response.data).map(normalizeMushroomType)
  },

  /** GET /api/mushroom-types/{id} */
  async getById(id: number): Promise<MushroomType | null> {
    const response = await apiClient.get<unknown>(
      `/api/mushroom-types/${id}`,
    )
    const item = ensureObject<MushroomType>(response.data)
    return item ? normalizeMushroomType(item) : null
  },

  /** POST /api/mushroom-types (multipart) */
  async create(payload: CreateMushroomTypeFormPayload): Promise<MushroomType | null> {
    const form = toFormData(payload.values)
    if (payload.image) {
      form.append('image', payload.image)
    }
    const response = await apiClient.post<unknown>(
      '/api/mushroom-types',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    const item = ensureObject<MushroomType>(response.data)
    return item ? normalizeMushroomType(item) : null
  },

  /** PUT /api/mushroom-types/{id} (multipart) */
  async update(
    id: number,
    payload: UpdateMushroomTypeFormPayload,
  ): Promise<MushroomType | null> {
    const form = toFormData(payload.values)
    if (payload.image) {
      form.append('image', payload.image)
    }
    const response = await apiClient.put<unknown>(
      `/api/mushroom-types/${id}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    const item = ensureObject<MushroomType>(response.data)
    return item ? normalizeMushroomType(item) : null
  },

  /** DELETE /api/mushroom-types/{id} */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/mushroom-types/${id}`)
  },
}
