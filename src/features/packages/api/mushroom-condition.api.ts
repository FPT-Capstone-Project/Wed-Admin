import { apiClient } from '../../../shared/api/client'
import { ensureArray, ensureObject } from '../../../shared/api/response-normalizer'
import type {
  CreateMushroomConditionRequest,
  MushroomCondition,
  MushroomConditionListQuery,
  UpdateMushroomConditionRequest,
} from '../../../types/mushroom-condition'

export const mushroomConditionApi = {
  async list(
    query: MushroomConditionListQuery = {},
  ): Promise<MushroomCondition[]> {
    const response = await apiClient.get<unknown>(
      '/api/mushroom-conditions',
      { params: query },
    )
    return ensureArray<MushroomCondition>(response.data)
  },

  async getById(id: number): Promise<MushroomCondition | null> {
    const response = await apiClient.get<unknown>(
      `/api/mushroom-conditions/${id}`,
    )
    return ensureObject<MushroomCondition>(response.data)
  },

  async create(
    payload: CreateMushroomConditionRequest,
  ): Promise<MushroomCondition | null> {
    const response = await apiClient.post<unknown>(
      '/api/mushroom-conditions',
      payload,
    )
    return ensureObject<MushroomCondition>(response.data)
  },

  async update(
    id: number,
    payload: UpdateMushroomConditionRequest,
  ): Promise<MushroomCondition | null> {
    const response = await apiClient.put<unknown>(
      `/api/mushroom-conditions/${id}`,
      payload,
    )
    return ensureObject<MushroomCondition>(response.data)
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/api/mushroom-conditions/${id}`)
  },
}
