/**
 * Tra cứu **tên nhân viên** từ `user_id` cho trang "Quản lý Thu hoạch".
 *
 * ⚠ BE (`Backend/src/models/harvest.model.js`) **chỉ trả về ID** cho
 *   `hr.confirmed_by` và `h.harvested_by` — không có trường `*_name`.
 *   ⇒ FE đối chiếu ID với danh sách tài khoản qua `GET /api/users`.
 *
 * ⚠ `GET /api/users` yêu cầu role Admin (`authorizeRoles(1)`) ⇒ hook tự
 *   tắt (`enabled: false`) khi tài khoản thiếu quyền `user.manage`; khi đó
 *   map rỗng và UI fallback về `Nhân viên #<id>`.
 *
 * ⚠ Hook dùng chung query key `['users', 'name-lookup']` với
 *   `useConfiguratorNames` ⇒ React Query **dùng chung cache**, chỉ gọi
 *   API 1 lần cho toàn bộ app.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { USER_MANAGE } from '../../auth/permissions'
import { useHasPermission } from '../../auth/hooks/usePermission'
import { userApi } from '../../users/api/user.api'
import { retryApiErrors } from '../../../shared/api/retry-policy'

/** `user_id` → tên hiển thị của nhân viên. */
export type StaffNameMap = ReadonlyMap<number, string>

/**
 * Map `user_id` → tên nhân viên (chỉ tải khi tài khoản có quyền
 * `user.manage`).
 *
 * @param userIds Danh sách ID cần tra cứu (rỗng → không tải).
 */
export function useHarvestStaffNames(
  userIds: Array<number | null | undefined>,
): StaffNameMap {
  const canViewUsers = useHasPermission(USER_MANAGE)

  const ids = useMemo(
    () =>
      Array.from(
        new Set(
          userIds.filter(
            (id): id is number => typeof id === 'number' && id > 0,
          ),
        ),
      ),
    [userIds],
  )

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'name-lookup'],
    queryFn: () => userApi.list(),
    enabled: canViewUsers && ids.length > 0,
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

/**
 * Tên hiển thị của 1 nhân viên — fallback về `Nhân viên #<id>` khi không
 * tra cứu được (thiếu quyền, user đã bị xoá, hoặc ID không hợp lệ).
 */
export function resolveStaffName(
  map: StaffNameMap,
  userId: number | null | undefined,
  fallbackPrefix = 'Nhân viên',
): string {
  if (typeof userId !== 'number' || userId <= 0) return '—'
  return map.get(userId) ?? `${fallbackPrefix} #${userId}`
}
