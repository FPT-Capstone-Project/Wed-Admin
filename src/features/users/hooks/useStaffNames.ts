/**
 * Tra cứu **tên nhân viên** từ `user_id` — dùng chung cho các màn hình hiển
 * thị ai đã xác nhận / thu hoạch (WF-04, trang Thu hoạch, trang Yêu cầu
 * nhận nấm).
 *
 * ⚠ BE (`Backend/src/models/harvest.model.js`, `harvestRequest.model.js`)
 *   **chỉ trả về ID** cho `hr.confirmed_by` / `h.harvested_by` — không có
 *   trường `*_name` ⇒ FE đối chiếu ID với danh sách tài khoản qua
 *   `GET /api/users`.
 *
 * ⚠ `GET /api/users` yêu cầu role Admin (`authorizeRoles(1)`) ⇒ hook tự
 *   tắt (`enabled: false`) khi tài khoản thiếu quyền `user.manage`; khi đó
 *   UI báo chưa có thông tin, không hiển thị ID kỹ thuật.
 *
 * ⚠ Hook dùng chung query key `['users', 'name-lookup']` với
 *   `useConfiguratorNames` ⇒ React Query **dùng chung cache**, chỉ gọi
 *   API 1 lần cho toàn bộ app.
 */
import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
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
export function useStaffNames(
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

  const directory = useQuery({
    queryKey: ['users', 'name-lookup'],
    queryFn: () => userApi.list(),
    enabled: canViewUsers && ids.length > 0,
    staleTime: 5 * 60_000,
    retry: retryApiErrors,
  })

  const missingIds = ids.filter(id => directory.isSuccess && !directory.data.some(user => user.user_id === id))
  const details = useQueries({
    queries: missingIds.map(id => ({
      queryKey: ['users', 'name-lookup', id],
      queryFn: () => userApi.getById(id),
      enabled: canViewUsers,
      staleTime: 5 * 60_000,
      retry: retryApiErrors,
    })),
  })

  return (() => {
    const map = new Map<number, string>()
    for (const user of [...(directory.data ?? []), ...details.flatMap(query => query.data ? [query.data] : [])]) {
      const name = user.full_name?.trim() || user.email
      if (name) map.set(user.user_id, name)
    }
    for (const id of ids) {
      if (!map.has(id)) {
        const detail = details[missingIds.indexOf(id)]
        map.set(id, directory.isLoading || detail?.isLoading
          ? 'Đang tải tên nhân viên…'
          : 'Chưa có thông tin nhân viên')
      }
    }
    return map
  })()
}

/**
 * Tên hiển thị của 1 nhân viên — không hiển thị ID kỹ thuật khi không
 * tra cứu được (thiếu quyền, user đã bị xoá, hoặc ID không hợp lệ).
 */
export function resolveStaffName(
  map: StaffNameMap,
  userId: number | null | undefined,
  fallback = 'Chưa có thông tin nhân viên',
): string {
  if (typeof userId !== 'number' || userId <= 0) return '—'
  return map.get(userId) ?? fallback
}
