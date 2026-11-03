import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { customerOrderApi } from '../api/customer-order.api'
import type {
  CustomerCultivationProgress,
  CustomerCultivationStatus,
  CustomerSpawnInspectionDetail,
  CustomerSpawnInspections,
} from '../types/customer.types'

/**
 * Hooks xem dữ liệu theo đơn (phía khách) — **chỉ đọc**.
 *
 * ⚠ Không có `useMutation` nào: Web Admin không tạo tiến độ, không tạo
 *   kiểm tra phôi, không nhập thu hoạch, không chuyển giai đoạn.
 *
 * ⚠ BE cho phép Admin đọc **bất kỳ** đơn nào → dùng để dựng lại danh sách
 *   đơn khách đã đặt + timeline + lịch sử kiểm tra phôi trong Drawer.
 */

/** Query keys */
export const customerOrderKeys = {
  all: ['customer-orders'] as const,
  status: (orderId: number) =>
    [...customerOrderKeys.all, 'cultivation-status', orderId] as const,
  progress: (orderId: number) =>
    [...customerOrderKeys.all, 'cultivation-progress', orderId] as const,
  inspections: (orderId: number) =>
    [...customerOrderKeys.all, 'spawn-inspections', orderId] as const,
  inspection: (orderId: number, inspectionId: number) =>
    [...customerOrderKeys.all, 'spawn-inspections', orderId, inspectionId] as const,
}

/** Trạng thái canh tác hiện tại của đơn. */
export function useOrderCultivationStatus(
  orderId: number | null,
  options?: Partial<UseQueryOptions<CustomerCultivationStatus | null, Error>>,
) {
  return useQuery<CustomerCultivationStatus | null, Error>({
    queryKey: customerOrderKeys.status(orderId ?? -1),
    queryFn: async () => customerOrderApi.getCultivationStatus(orderId as number),
    enabled: orderId !== null && orderId > 0,
    ...options,
  })
}

/** Timeline tiến độ canh tác của đơn. */
export function useOrderCultivationProgress(
  orderId: number | null,
  options?: Partial<UseQueryOptions<CustomerCultivationProgress | null, Error>>,
) {
  return useQuery<CustomerCultivationProgress | null, Error>({
    queryKey: customerOrderKeys.progress(orderId ?? -1),
    queryFn: async () =>
      customerOrderApi.getCultivationProgress(orderId as number),
    enabled: orderId !== null && orderId > 0,
    ...options,
  })
}

/** Lịch sử kiểm tra phôi của đơn (kèm ảnh). */
export function useOrderSpawnInspections(
  orderId: number | null,
  options?: Partial<UseQueryOptions<CustomerSpawnInspections | null, Error>>,
) {
  return useQuery<CustomerSpawnInspections | null, Error>({
    queryKey: customerOrderKeys.inspections(orderId ?? -1),
    queryFn: async () =>
      customerOrderApi.getSpawnInspections(orderId as number),
    enabled: orderId !== null && orderId > 0,
    ...options,
  })
}

/** Chi tiết 1 lần kiểm tra phôi của đơn. */
export function useOrderSpawnInspection(
  orderId: number | null,
  inspectionId: number | null,
  options?: Partial<UseQueryOptions<CustomerSpawnInspectionDetail | null, Error>>,
) {
  return useQuery<CustomerSpawnInspectionDetail | null, Error>({
    queryKey: customerOrderKeys.inspection(
      orderId ?? -1,
      inspectionId ?? -1,
    ),
    queryFn: async () =>
      customerOrderApi.getSpawnInspection(
        orderId as number,
        inspectionId as number,
      ),
    enabled:
      orderId !== null && orderId > 0 && inspectionId !== null && inspectionId > 0,
    ...options,
  })
}
