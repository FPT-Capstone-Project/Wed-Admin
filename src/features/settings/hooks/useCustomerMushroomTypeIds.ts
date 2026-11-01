import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { orderApi } from '../../orders/api/order.api'
import { orderKeys, useOrders } from '../../orders/hooks/useOrders'

/**
 * Danh sách `mushroom_type_id` mà khách hàng đang thuê.
 *
 * ⚠ Nguồn dữ liệu: **Database** (không dùng store mock).
 *   - `GET /api/orders` → các đơn của chính khách đang đăng nhập.
 *   - `GET /api/orders/{id}` → chi tiết đơn, có `items[].mushroom_type_id`
 *     (BE join `order_items` → `mushroom_types`).
 *
 * ⚠ Vì sao lọc theo **id** chứ không theo tên?
 *   Tên giống nấm là dữ liệu người dùng tự nhập trong DB
 *   (`mushroom_types.name`) → so khớp chuỗi rất dễ vỡ (viết hoa/thường,
 *   đổi tên trong DB...). Id thì ổn định tuyệt đối.
 *
 * ⚠ Vì sao phải gọi N+1 request?
 *   `GET /api/orders` (BE `findAllByUserId`) chỉ SELECT header của đơn,
 *   **không** join `order_items` → không có `mushroom_type_id`.
 *   Chỉ `GET /api/orders/{id}` mới trả kèm items.
 */
export function useCustomerMushroomTypeIds(enabled: boolean): number[] {
  const { data: orders = [] } = useOrders({
    enabled,
    staleTime: 60_000,
  })

  const orderIds = useMemo(
    () => orders.map((order) => order.order_id).filter((id) => id > 0),
    [orders],
  )

  const detailQueries = useQueries({
    queries: orderIds.map((orderId) => ({
      queryKey: orderKeys.detail(orderId),
      queryFn: () => orderApi.getById(orderId),
      enabled: enabled && orderId > 0,
      staleTime: 60_000,
    })),
  })

  return useMemo(() => {
    const ids = new Set<number>()

    for (const query of detailQueries) {
      const items = query.data?.items ?? []
      for (const item of items) {
        if (typeof item.mushroom_type_id === 'number') {
          ids.add(item.mushroom_type_id)
        }
      }
    }

    return [...ids]
  }, [detailQueries])
}
