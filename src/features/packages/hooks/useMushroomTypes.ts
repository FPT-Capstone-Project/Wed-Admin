import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { getApiErrorMessage } from '../../../shared/api/error'
import { mushroomTypeApi } from '../api/mushroom-type.api'
import type {
  CreateMushroomTypeFormPayload,
  MushroomType,
  MushroomTypeListQuery,
  UpdateMushroomTypeFormPayload,
} from '../../../types/mushroom-type'

/** Query key gốc — dùng để invalidate sau create/update/delete. */
export const mushroomTypeKeys = {
  all: ['mushroom-types'] as const,
  lists: () => [...mushroomTypeKeys.all, 'list'] as const,
  list: (query: MushroomTypeListQuery) =>
    [...mushroomTypeKeys.lists(), query] as const,
  details: () => [...mushroomTypeKeys.all, 'detail'] as const,
  detail: (id: number) => [...mushroomTypeKeys.details(), id] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────

export function useMushroomTypes(
  query: MushroomTypeListQuery = {},
  options?: Partial<UseQueryOptions<MushroomType[], Error>>,
) {
  return useQuery<MushroomType[], Error>({
    queryKey: mushroomTypeKeys.list(query),
    queryFn: () => mushroomTypeApi.list(query),
    ...options,
  })
}

export function useMushroomType(
  id: number | null,
  options?: Partial<UseQueryOptions<MushroomType, Error>>,
) {
  return useQuery<MushroomType, Error>({
    queryKey: mushroomTypeKeys.detail(id ?? -1),
    queryFn: async () => {
      const result = await mushroomTypeApi.getById(id as number)
      if (!result) throw new Error(`Không tìm thấy loại nấm ID ${id}`)
      return result
    },
    enabled: id !== null && id > 0,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────

function useMushroomMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables, onMutateResult, context) => {
      void queryClient.invalidateQueries({ queryKey: mushroomTypeKeys.all })
      // Gọi onSuccess của component SAU khi invalidate,
      // tránh override → UI tự đóng modal + hiện toast, list vẫn refetch.
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    onError: (err, variables, onMutateResult, context) => {
      // Tương tự cho onError — component có thể muốn hiển thị toast riêng.
      options?.onError?.(err, variables, onMutateResult, context)
    },
  })
}

export function useCreateMushroomType(
  options?: UseMutationOptions<
    MushroomType,
    Error,
    CreateMushroomTypeFormPayload
  >,
) {
  return useMushroomMutation<MushroomType, CreateMushroomTypeFormPayload>(
    async (payload) => {
      const result = await mushroomTypeApi.create(payload)
      if (!result) throw new Error('Không thể tạo loại nấm mới')
      return result
    },
    options,
  )
}

export function useUpdateMushroomType(
  options?: UseMutationOptions<
    MushroomType,
    Error,
    { id: number; payload: UpdateMushroomTypeFormPayload }
  >,
) {
  return useMushroomMutation<
    MushroomType,
    { id: number; payload: UpdateMushroomTypeFormPayload }
  >(async ({ id, payload }) => {
    const result = await mushroomTypeApi.update(id, payload)
    if (!result) throw new Error(`Không thể cập nhật loại nấm ID ${id}`)
    return result
  }, options)
}

export function useDeleteMushroomType(
  options?: UseMutationOptions<void, Error, number>,
) {
  return useMushroomMutation<void, number>((id) => mushroomTypeApi.remove(id), {
    ...options,
  })
}

/**
 * Helper: lấy error message tiếng Việt (tiện cho component message.error).
 */
export function friendlyError(error: unknown): string {
  return getApiErrorMessage(error)
}