import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { rentalPackageApi } from '../api/rental-package.api'
import type {
  CreateRentalPackageRequest,
  RentalPackage,
  RentalPackageListQuery,
  UpdateRentalPackageRequest,
} from '../../../types/rental-package'

/** Query key gốc — dùng để invalidate sau create/update/delete. */
export const rentalPackageKeys = {
  all: ['rental-packages'] as const,
  lists: () => [...rentalPackageKeys.all, 'list'] as const,
  list: (query: RentalPackageListQuery) =>
    [...rentalPackageKeys.lists(), query] as const,
  details: () => [...rentalPackageKeys.all, 'detail'] as const,
  detail: (id: number) => [...rentalPackageKeys.details(), id] as const,
}

// ─── Queries ────────────────────────────────────────────────────────────

export function useRentalPackages(
  query: RentalPackageListQuery = {},
  options?: Partial<UseQueryOptions<RentalPackage[], Error>>,
) {
  return useQuery<RentalPackage[], Error>({
    queryKey: rentalPackageKeys.list(query),
    queryFn: () => rentalPackageApi.list(query),
    ...options,
  })
}

export function useRentalPackage(
  id: number | null,
  options?: Partial<UseQueryOptions<RentalPackage, Error>>,
) {
  return useQuery<RentalPackage, Error>({
    queryKey: rentalPackageKeys.detail(id ?? -1),
    queryFn: async () => {
      const result = await rentalPackageApi.getById(id as number)
      if (!result) throw new Error(`Không tìm thấy gói thuê ID ${id}`)
      return result
    },
    enabled: id !== null && id > 0,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────

function useRentalMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables, onMutateResult, context) => {
      void queryClient.invalidateQueries({ queryKey: rentalPackageKeys.all })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    onError: (err, variables, onMutateResult, context) => {
      options?.onError?.(err, variables, onMutateResult, context)
    },
  })
}

export function useCreateRentalPackage(
  options?: UseMutationOptions<
    RentalPackage,
    Error,
    CreateRentalPackageRequest
  >,
) {
  return useRentalMutation<RentalPackage, CreateRentalPackageRequest>(
    async (payload) => {
      const result = await rentalPackageApi.create(payload)
      if (!result) throw new Error('Không thể tạo gói thuê mới')
      return result
    },
    options,
  )
}

export function useUpdateRentalPackage(
  options?: UseMutationOptions<
    RentalPackage,
    Error,
    { id: number; payload: UpdateRentalPackageRequest }
  >,
) {
  return useRentalMutation<
    RentalPackage,
    { id: number; payload: UpdateRentalPackageRequest }
  >(async ({ id, payload }) => {
    const result = await rentalPackageApi.update(id, payload)
    if (!result) throw new Error(`Không thể cập nhật gói thuê ID ${id}`)
    return result
  }, options)
}

export function useDeleteRentalPackage(
  options?: UseMutationOptions<void, Error, number>,
) {
  return useRentalMutation<void, number>((id) => rentalPackageApi.remove(id), {
    ...options,
  })
}
