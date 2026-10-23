import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { mushroomConditionApi } from '../api/mushroom-condition.api'
import type {
  CreateMushroomConditionRequest,
  MushroomCondition,
  MushroomConditionListQuery,
  UpdateMushroomConditionRequest,
} from '../../../types/mushroom-condition'

/** Query key gốc — dùng để invalidate sau create/update/delete. */
export const mushroomConditionKeys = {
  all: ['mushroom-conditions'] as const,
  lists: () => [...mushroomConditionKeys.all, 'list'] as const,
  list: (query: MushroomConditionListQuery) =>
    [...mushroomConditionKeys.lists(), query] as const,
  details: () => [...mushroomConditionKeys.all, 'detail'] as const,
  detail: (id: number) => [...mushroomConditionKeys.details(), id] as const,
}

// ─── Queries ────────────────────────────────────────────────────────────

export function useMushroomConditions(
  query: MushroomConditionListQuery = {},
  options?: Partial<UseQueryOptions<MushroomCondition[], Error>>,
) {
  return useQuery<MushroomCondition[], Error>({
    queryKey: mushroomConditionKeys.list(query),
    queryFn: () => mushroomConditionApi.list(query),
    ...options,
  })
}

export function useMushroomCondition(
  id: number | null,
  options?: Partial<UseQueryOptions<MushroomCondition, Error>>,
) {
  return useQuery<MushroomCondition, Error>({
    queryKey: mushroomConditionKeys.detail(id ?? -1),
    queryFn: async () => {
      const result = await mushroomConditionApi.getById(id as number)
      if (!result) throw new Error(`Không tìm thấy thông số canh tác ID ${id}`)
      return result
    },
    enabled: id !== null && id > 0,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────

function useConditionMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables, onMutateResult, context) => {
      void queryClient.invalidateQueries({ queryKey: mushroomConditionKeys.all })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    onError: (err, variables, onMutateResult, context) => {
      options?.onError?.(err, variables, onMutateResult, context)
    },
  })
}

export function useCreateMushroomCondition(
  options?: UseMutationOptions<
    MushroomCondition,
    Error,
    CreateMushroomConditionRequest
  >,
) {
  return useConditionMutation<MushroomCondition, CreateMushroomConditionRequest>(
    async (payload) => {
      const result = await mushroomConditionApi.create(payload)
      if (!result) throw new Error('Không thể tạo thông số canh tác mới')
      return result
    },
    options,
  )
}

export function useUpdateMushroomCondition(
  options?: UseMutationOptions<
    MushroomCondition,
    Error,
    { id: number; payload: UpdateMushroomConditionRequest }
  >,
) {
  return useConditionMutation<
    MushroomCondition,
    { id: number; payload: UpdateMushroomConditionRequest }
  >(async ({ id, payload }) => {
    const result = await mushroomConditionApi.update(id, payload)
    if (!result) throw new Error(`Không thể cập nhật thông số canh tác ID ${id}`)
    return result
  }, options)
}

export function useDeleteMushroomCondition(
  options?: UseMutationOptions<void, Error, number>,
) {
  return useConditionMutation<void, number>((id) => mushroomConditionApi.remove(id), {
    ...options,
  })
}
