import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { farmApi } from '../api/farm.api'
import type {
  FarmSession,
  SpawnInspectionHistory,
} from '../types/farm.types'

/**
 * Hooks luồng Farm Spawn Workflow — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không ghi kiểm tra phôi, không
 *   chuyển giai đoạn, không cấp phôi thay thế, không upload ảnh.
 */

/** Query keys */
export const farmKeys = {
  all: ['farm'] as const,
  sessions: (status?: string) => [...farmKeys.all, 'sessions', status ?? ''] as const,
  session: (sessionId: number) => [...farmKeys.all, 'session', sessionId] as const,
  inspections: (sessionId: number) =>
    [...farmKeys.all, 'spawn-inspections', sessionId] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────

/**
 * Danh sách phiên trong luồng farm.
 *
 * Nguồn quan trọng cho trang Đơn hàng: response có `order_id`,
 * `customer_name`, `customer_email`, `package_name`, `mushroom_name` →
 * Admin thấy được toàn bộ đơn khách đã đặt (vì `GET /api/orders` chỉ trả
 * đơn của chính user đăng nhập).
 */
export function useFarmSessions(
  status?: string,
  options?: Partial<UseQueryOptions<FarmSession[], Error>>,
) {
  return useQuery<FarmSession[], Error>({
    queryKey: farmKeys.sessions(status),
    queryFn: () => farmApi.list(status),
    staleTime: 30_000,
    ...options,
  })
}

/** Chi tiết 1 phiên farm (kèm `spawn_issued`). */
export function useFarmSession(
  sessionId: number | null,
  options?: Partial<UseQueryOptions<FarmSession | null, Error>>,
) {
  return useQuery<FarmSession | null, Error>({
    queryKey: farmKeys.session(sessionId ?? -1),
    queryFn: async () => farmApi.getById(sessionId as number),
    enabled: sessionId !== null && sessionId > 0,
    ...options,
  })
}

/**
 * Lịch sử kiểm tra phôi của 1 phiên.
 *
 * Response gồm các field tổng hợp (`totalChecked`, `normalQuantity`,
 * `warningQuantity`, `abnormalQuantity`, `replacementQuantity`) cùng danh
 * sách lần kiểm tra, mỗi lần có `images[]` (URL Cloudinary).
 */
export function useSpawnInspections(
  sessionId: number | null,
  options?: Partial<UseQueryOptions<SpawnInspectionHistory | null, Error>>,
) {
  return useQuery<SpawnInspectionHistory | null, Error>({
    queryKey: farmKeys.inspections(sessionId ?? -1),
    queryFn: async () => farmApi.getSpawnInspections(sessionId as number),
    enabled: sessionId !== null && sessionId > 0,
    ...options,
  })
}
