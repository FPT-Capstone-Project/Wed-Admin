import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { rentalApi, type RentalListResult } from '../api/rental.api'
import type {
  CancelRentalRequest,
  CompleteRentalRequest,
  CreateRentalFromOrderRequest,
  RecordRentalHarvestRequest,
  RecordRentalProgressRequest,
  Rental,
  RentalListQuery,
  StartCultivationSessionRequest,
  UpdateRentalRequest,
} from '../types/rental.types'

// ─── Query Keys ──────────────────────────────────────────────────────────
export const rentalKeys = {
  all: ['rentals'] as const,
  list: (query: RentalListQuery) => [...rentalKeys.all, 'list', query] as const,
  detail: (rentalId: number) => [...rentalKeys.all, 'detail', rentalId] as const,
}

// ─── Queries ─────────────────────────────────────────────────────────────

/**
 * Danh sách vụ thuê — có phân trang + bộ lọc.
 * `query` nên được `useMemo` ở component để giữ referential stability,
 * tránh vòng render vô hạn với object literal.
 */
export function useRentals(
  query: RentalListQuery = {},
  options?: Partial<UseQueryOptions<RentalListResult, Error>>,
) {
  return useQuery<RentalListResult, Error>({
    queryKey: rentalKeys.list(query),
    queryFn: () => rentalApi.list(query),
    placeholderData: (prev) => prev,
    ...options,
  })
}

/** Chi tiết một vụ thuê. Tự disable khi `rentalId` không hợp lệ. */
export function useRental(
  rentalId: number | null,
  options?: Partial<UseQueryOptions<Rental, Error>>,
) {
  return useQuery<Rental, Error>({
    queryKey: rentalKeys.detail(rentalId ?? -1),
    queryFn: async () => {
      const result = await rentalApi.getById(rentalId as number)
      if (!result) throw new Error(`Không tìm thấy vụ thuê ID ${rentalId}`)
      return result
    },
    enabled: rentalId !== null && rentalId > 0,
    ...options,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────
/**
 * Base: mọi mutation sau khi thành công đều invalidate toàn bộ rentals,
 * vì mọi hành động đều làm thay đổi trạng thái rental + khay liên quan.
 *
 * `throw` đặt trong `mutationFn` (không phải `onSuccess`) để lỗi được
 * React Query bắt và truyền về `error` cho UI hiển thị.
 */
function useRentalMutation<TVariables>(
  mutationFn: (v: TVariables) => Promise<Rental | null>,
  fallbackMessage: string,
  options?: UseMutationOptions<Rental, Error, TVariables>,
) {
  const queryClient = useQueryClient()
  return useMutation<Rental, Error, TVariables>({
    mutationFn: async (v) => {
      const result = await mutationFn(v)
      if (!result) throw new Error(fallbackMessage)
      return result
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rentalKeys.all })
    },
    ...options,
  })
}

/** Tạo rental thủ công từ đơn đã thanh toán (dùng khi webhook không tạo). */
export function useCreateRentalFromOrder(
  options?: UseMutationOptions<Rental, Error, CreateRentalFromOrderRequest>,
) {
  return useRentalMutation<CreateRentalFromOrderRequest>(
    (payload) => rentalApi.createFromOrder(payload),
    'Không thể tạo vụ thuê từ đơn hàng',
    options,
  )
}

/** Bắt đầu canh tác: gán khay, tạo session ACTIVE, đánh dấu khay OCCUPIED. */
export function useStartCultivationSession(
  options?: UseMutationOptions<
    Rental,
    Error,
    { rentalId: number; payload: StartCultivationSessionRequest }
  >,
) {
  return useRentalMutation<{ rentalId: number; payload: StartCultivationSessionRequest }>(
    ({ rentalId, payload }) => rentalApi.startCultivationSession(rentalId, payload),
    'Không thể khởi tạo phiên canh tác',
    options,
  )
}

/** Ghi nhận tiến độ canh tác (giai đoạn + %). */
export function useRecordRentalProgress(
  options?: UseMutationOptions<
    Rental,
    Error,
    { rentalId: number; payload: RecordRentalProgressRequest }
  >,
) {
  return useRentalMutation<{ rentalId: number; payload: RecordRentalProgressRequest }>(
    ({ rentalId, payload }) => rentalApi.recordProgress(rentalId, payload),
    'Không thể ghi nhận tiến độ',
    options,
  )
}

/** Ghi nhận thu hoạch. Chỉ hợp lệ khi giai đoạn hiện tại là HARVEST. */
export function useRecordRentalHarvest(
  options?: UseMutationOptions<
    Rental,
    Error,
    { rentalId: number; payload: RecordRentalHarvestRequest }
  >,
) {
  return useRentalMutation<{ rentalId: number; payload: RecordRentalHarvestRequest }>(
    ({ rentalId, payload }) => rentalApi.recordHarvest(rentalId, payload),
    'Không thể ghi nhận thu hoạch',
    options,
  )
}

/** Hoàn tất vụ thuê (sau khi đã thu hoạch). */
export function useCompleteRental(
  options?: UseMutationOptions<
    Rental,
    Error,
    { rentalId: number; payload?: CompleteRentalRequest }
  >,
) {
  return useRentalMutation<{ rentalId: number; payload?: CompleteRentalRequest }>(
    ({ rentalId, payload }) => rentalApi.complete(rentalId, payload),
    'Không thể hoàn tất vụ thuê',
    options,
  )
}

/**
 * Huỷ vụ thuê — ⚠ CHỈ Admin (role_id 1).
 * Farm Operator sẽ nhận 403 từ BE; UI cần ẩn nút này với role Operator.
 */
export function useCancelRental(
  options?: UseMutationOptions<
    Rental,
    Error,
    { rentalId: number; payload: CancelRentalRequest }
  >,
) {
  return useRentalMutation<{ rentalId: number; payload: CancelRentalRequest }>(
    ({ rentalId, payload }) => rentalApi.cancel(rentalId, payload),
    'Không thể huỷ vụ thuê',
    options,
  )
}

/** Duyệt rental (CONFIRMED → PREPARING) hoặc chỉnh khay / thời hạn. */
export function useUpdateRental(
  options?: UseMutationOptions<
    Rental,
    Error,
    { rentalId: number; payload: UpdateRentalRequest }
  >,
) {
  return useRentalMutation<{ rentalId: number; payload: UpdateRentalRequest }>(
    ({ rentalId, payload }) => rentalApi.update(rentalId, payload),
    'Không thể cập nhật vụ thuê',
    options,
  )
}