import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  fetchSessionDailyInspections,
  fetchTrayDailyInspections,
} from '../api/session-inspection.api'
import type {
  DailyInspectionQuery,
  SessionDailyInspectionResult,
  TrayDailyInspectionResult,
} from '../types/session-inspection.types'

/**
 * Hooks kiểm tra khay hằng ngày (giai đoạn 2) — **chỉ đọc**.
 *
 * ⚠ Đây là nguồn ảnh **giai đoạn 2** (trồng trên khay), bổ sung cho
 *   `useSpawnInspections` (giai đoạn 1 — nghỉ ủ phôi).
 */

/** Query keys */
export const sessionInspectionKeys = {
  all: ['session-inspections'] as const,
  session: (sessionId: number) =>
    [...sessionInspectionKeys.all, 'session', sessionId] as const,
  tray: (sessionId: number, sessionTrayId: number) =>
    [...sessionInspectionKeys.all, 'tray', sessionId, sessionTrayId] as const,
}

/**
 * Lịch sử kiểm tra của **toàn bộ khay** trong 1 phiên (kèm ảnh).
 *
 * Nguồn: `GET /api/cultivation-sessions/{sessionId}/daily-inspections`
 *
 * ⚠ Hook tự disable khi `sessionId` không hợp lệ.
 */
export function useSessionDailyInspections(
  sessionId: number | null,
  query: DailyInspectionQuery = {},
  options?: Partial<
    UseQueryOptions<SessionDailyInspectionResult, Error>
  >,
) {
  return useQuery<SessionDailyInspectionResult, Error>({
    queryKey: sessionInspectionKeys.session(sessionId ?? -1),
    queryFn: () => fetchSessionDailyInspections(sessionId as number, query),
    enabled: sessionId !== null && sessionId > 0,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Lịch sử kiểm tra của **1 khay** trong 1 phiên (kèm ảnh).
 *
 * Nguồn:
 * `GET /api/cultivation-sessions/{sessionId}/trays/{sessionTrayId}/daily-inspections`
 *
 * ⚠ `sessionTrayId` là `cultivation_session_trays.session_tray_id` —
 *   KHÔNG phải `cultivation_trays.tray_id` vật lý.
 *
 * ⚠ Hook tự disable khi thiếu `sessionId` hoặc `sessionTrayId`.
 */
export function useTrayDailyInspections(
  sessionId: number | null,
  sessionTrayId: number | null,
  query: DailyInspectionQuery = {},
  options?: Partial<UseQueryOptions<TrayDailyInspectionResult, Error>>,
) {
  return useQuery<TrayDailyInspectionResult, Error>({
    queryKey: sessionInspectionKeys.tray(
      sessionId ?? -1,
      sessionTrayId ?? -1,
    ),
    queryFn: () =>
      fetchTrayDailyInspections(
        sessionId as number,
        sessionTrayId as number,
        query,
      ),
    enabled:
      sessionId !== null &&
      sessionId > 0 &&
      sessionTrayId !== null &&
      sessionTrayId > 0,
    staleTime: 30_000,
    ...options,
  })
}
