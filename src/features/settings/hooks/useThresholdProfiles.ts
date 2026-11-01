import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { thresholdProfileApi } from '../api/threshold-profile.api'
import type { MushroomThresholdProfile } from '../../../types/setting.types'

/** Query key gốc — dùng để invalidate sau khi nhân viên cập nhật ngưỡng. */
export const thresholdProfileKeys = {
  all: ['threshold-profiles'] as const,
  list: () => [...thresholdProfileKeys.all, 'list'] as const,
}

/**
 * Hồ sơ vi khí hậu — **đọc trực tiếp từ Database**.
 *
 * ⚠ Trước đây trang này lấy dữ liệu từ Zustand store `useSettingStore`
 *   (mock/seed cứng trong `localStorage`) → hiển thị các tên nấm tiếng Việt
 *   không tồn tại trong DB (vd "Nấm Sư Trưng", "Nấm Đầu Khỉ").
 *   Nay đã thay bằng API thật → tên hiển thị luôn khớp `mushroom_types.name`.
 */
export function useThresholdProfiles(
  options?: Partial<UseQueryOptions<MushroomThresholdProfile[], Error>>,
) {
  return useQuery<MushroomThresholdProfile[], Error>({
    queryKey: thresholdProfileKeys.list(),
    queryFn: () => thresholdProfileApi.list(),
    // Ngưỡng canh tác thay đổi hiếm → cache 1 phút, đủ để chuyển trang
    // không phải gọi lại API.
    staleTime: 60_000,
    ...options,
  })
}
