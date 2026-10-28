/**
 * Tra cứu tên nhân viên từ `user_id` — dùng cho mục "Nhân viên cấu hình
 * gần nhất" trong chi tiết cấu hình tưới tự động.
 *
 * ⚠ `GET /api/users` của BE **yêu cầu role Admin** (`authorizeRoles(1)`).
 * Route `/devices` mở cho cả Admin lẫn Farm Operator → với Operator,
 * endpoint này trả 403. Vì vậy hook:
 *   - tự tắt (`enabled: false`) khi tài khoản thiếu quyền `user.manage`,
 *   - trả map rỗng → UI fallback sang `Nhân viên #<id>`.
 *
 * ⚠ Retry dùng `retryApiErrors`: 403 **không** được retry (thử lại cũng
 * không thành công), nhưng timeout / 5xx thì **có** — vì backend Render có
 * thể đang "thức dậy" và request chỉ bị timeout chứ chưa tới được server.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { USER_MANAGE } from '../../auth/permissions'
import { useHasPermission } from '../../auth/hooks/usePermission'
import { userApi } from '../../users/api/user.api'
import { retryApiErrors } from '../../../shared/api/retry-policy'

/** `user_id` → tên hiển thị của nhân viên. */
export type UserNameMap = ReadonlyMap<number, string>

/**
 * Map `user_id` → tên nhân viên, chỉ tải khi tài khoản đang đăng nhập có
 * quyền `user.manage`.
 *
 * @param userId `user_id` cần tra cứu (`null` → không tải).
 */
export function useConfiguratorNames(userId: number | null): UserNameMap {
  const canViewUsers = useHasPermission(USER_MANAGE)

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'name-lookup'],
    queryFn: () => userApi.list(),
    enabled: canViewUsers && userId !== null && userId > 0,
    staleTime: 5 * 60_000,
    retry: retryApiErrors,
  })

  return useMemo(() => {
    const map = new Map<number, string>()
    for (const user of users) {
      const name = user.full_name?.trim() || user.email
      if (name) map.set(user.user_id, name)
    }
    return map
  }, [users])
}
