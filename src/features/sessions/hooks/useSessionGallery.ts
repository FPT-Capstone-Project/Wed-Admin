import { useMemo } from 'react'
import { useSpawnInspections } from '../../farm/hooks/useFarm'
import { useSessionDailyInspections } from './useSessionInspections'
import {
  buildSessionGallery,
  summarizeSessionGallery,
} from '../utils/session-gallery.utils'
import type {
  SessionGalleryPhoto,
  SessionGalleryStats,
} from '../types/session-gallery.types'
import type { DailyInspection } from '../types/session-inspection.types'

/**
 * Thư viện ảnh tổng hợp của 1 phiên — gộp **giai đoạn 1 + giai đoạn 2**.
 *
 * ⚠ Vì sao gộp ở FE?
 *   BE tách ảnh theo 2 bảng (`spawn_inspection_images` và
 *   `cultivation_inspection_images`) và **chưa** có endpoint tổng hợp ⇒
 *   phải gọi 2 endpoint rồi ghép. Xem `utils/session-gallery.utils.ts`.
 *
 * ⚠ **Lazy-load**: cả 2 query chỉ chạy khi `enabled` = `true` ⇒ màn Phiên
 *   chỉ tải ảnh khi user mở tab "Kiểm tra khay" / "Thư viện ảnh" (tránh
 *   tải 2 endpoint nặng mỗi lần mở drawer).
 *
 * ⚠ Hook trả kèm `dailyInspections` (lần kiểm tra khay thô) để tab "Kiểm
 *   tra khay" dùng **chung 1 query** với thư viện ảnh ⇒ không tạo 2
 *   observer trên cùng 1 query key.
 *
 * @param sessionId Id phiên (null ⇒ không gọi API).
 * @param enabled Bật/tắt (theo tab đang active).
 */
export function useSessionGallery(sessionId: number | null, enabled = true) {
  const spawnQuery = useSpawnInspections(sessionId, { enabled })
  const dailyQuery = useSessionDailyInspections(sessionId, {}, { enabled })

  /**
   * Lần kiểm tra khay (giai đoạn 2) — dùng chung với tab "Kiểm tra khay".
   *
   * ⚠ Bọc trong `useMemo` để giữ **referential stability**: nếu không,
   *   `?? []` tạo mảng mới mỗi render ⇒ `useMemo` bên dưới tính lại mỗi
   *   lần render (cảnh báo `react-hooks/exhaustive-deps`).
   */
  const dailyInspections = useMemo<readonly DailyInspection[]>(
    () => dailyQuery.data?.inspections ?? [],
    [dailyQuery.data?.inspections],
  )

  const photos = useMemo(
    () =>
      buildSessionGallery(spawnQuery.data?.inspections ?? [], dailyInspections),
    [spawnQuery.data?.inspections, dailyInspections],
  )

  const stats = useMemo(
    () =>
      summarizeSessionGallery(
        photos,
        spawnQuery.data?.inspections.length ?? 0,
        dailyInspections.length,
      ),
    [photos, spawnQuery.data?.inspections.length, dailyInspections.length],
  )

  return {
    photos,
    stats,
    /** Lần kiểm tra khay (giai đoạn 2) — dùng chung với tab "Kiểm tra khay". */
    dailyInspections,
    isLoading: spawnQuery.isLoading || dailyQuery.isLoading,
    isError: spawnQuery.isError || dailyQuery.isError,
    error: (spawnQuery.error ?? dailyQuery.error ?? null) as Error | null,
    refetch: () => {
      void spawnQuery.refetch()
      void dailyQuery.refetch()
    },
  }
}

export type { SessionGalleryPhoto, SessionGalleryStats }
