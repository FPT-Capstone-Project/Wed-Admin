import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { userApi } from '../api/user.api'
import type {
  CreateManagedUserRequest,
  UpdateUserStatusRequest,
  UserAccountDetail,
  UserListQuery,
  UserWithRole,
} from '../../../types/user.types'

/** Query key gốc — dùng để invalidate sau create / update status. */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (query: UserListQuery) => [...userKeys.lists(), query] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (userId: number) => [...userKeys.details(), userId] as const,
}

// ─── Queries ─────────────────────────────────────────────────────────────

/**
 * Danh sách tài khoản.
 *
 * `query` PHẢI được `useMemo` ở component, nếu không object literal mới mỗi
 * render sẽ đổi `queryKey` → refetch vô hạn (xem comment ở `RentalListPage`).
 */
export function useUsers(
  query: UserListQuery = {},
  options?: Partial<UseQueryOptions<UserWithRole[], Error>>,
) {
  return useQuery<UserWithRole[], Error>({
    queryKey: userKeys.list(query),
    queryFn: () => userApi.list(query),
    ...options,
  })
}

/** Chi tiết tài khoản — tự disable khi `userId` không hợp lệ. */
export function useUser(
  userId: number | null,
  options?: Partial<UseQueryOptions<UserAccountDetail, Error>>,
) {
  return useQuery<UserAccountDetail, Error>({
    queryKey: userKeys.detail(userId ?? -1),
    queryFn: async () => {
      const result = await userApi.getById(userId as number)
      if (!result) throw new Error(`Không tìm thấy tài khoản ID ${userId}`)
      return result
    },
    enabled: userId !== null && userId > 0,
    ...options,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────

/**
 * Mọi mutation sau thành công đều invalidate toàn bộ `users` (list + detail)
 * vì status/role của một tài khoản có thể ảnh hưởng nhiều màn hình khác.
 *
 * `throw` đặt trong `mutationFn` để lỗi tới tay UI qua `error`/`onError`.
 */
function useUserMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData | null>,
  fallbackMessage: string,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const result = await mutationFn(variables)
      if (!result) throw new Error(fallbackMessage)
      return result
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    onError: (error, variables, onMutateResult, context) => {
      options?.onError?.(error, variables, onMutateResult, context)
    },
  })
}

/** Tạo tài khoản mới (kèm mật khẩu khởi tạo do Admin đặt). */
export function useCreateUser(
  options?: UseMutationOptions<
    UserAccountDetail,
    Error,
    CreateManagedUserRequest
  >,
) {
  return useUserMutation<UserAccountDetail, CreateManagedUserRequest>(
    (payload) => userApi.create(payload),
    'Không thể tạo tài khoản mới',
    options,
  )
}

/** Bật / tạm khoá tài khoản. */
export function useUpdateUserStatus(
  options?: UseMutationOptions<
    UserWithRole,
    Error,
    { userId: number; payload: UpdateUserStatusRequest }
  >,
) {
  return useUserMutation<
    UserWithRole,
    { userId: number; payload: UpdateUserStatusRequest }
  >(
    ({ userId, payload }) => userApi.updateStatus(userId, payload),
    'Không thể cập nhật trạng thái tài khoản',
    options,
  )
}