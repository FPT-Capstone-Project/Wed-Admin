import { useMemo } from 'react'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchAllAdminOrders } from '../../orders/api/order.api'
import type { AdminOrderDto } from '../../orders/types/admin-order.types'
import { countOrdersByPackage } from '../utils/package-order-count.utils'
import type { RentalPackage } from '../../../types/rental-package'

/** Query key cho bộ đếm đơn hàng theo gói thuê. */
export const rentalPackageOrderCountKeys = {
  all: ['rental-packages', 'order-counts'] as const,
}

/**
 * Đếm số đơn hàng theo **gói thuê** (dùng cho cột "Đơn hàng" + disable nút
 * Xóa).
 *
 * ## Vì sao phải tự đếm?
 *
 * ⚠ `GET /api/rental-packages` **không** trả trường đếm đơn:
 *   - BE chỉ SELECT `package_id, package_name, description, duration_days,
 *     price, status` (xem `Backend/src/models/rentalPackage.model.js`).
 *   - OpenAPI schema `RentalPackage` cũng không khai báo `order_count`.
 *   ⇒ `record.order_count` luôn `undefined` ⇒ cột "Đơn hàng" hiển thị 0 đơn
 *     và nút Xóa **không** bị disable ⇒ user bấm xoá ⇒ BE ném lỗi khoá ngoại
 *     (500/409).
 *
 * ⚠ `GET /api/orders/admin` **không** trả `package_id`:
 *   - BE gộp item của 1 đơn thành 1 record phẳng, tên gói nối bằng dấu phẩy
 *     (`string_agg(rp.package_name, ', ')`).
 *   ⇒ Ta khớp theo **tên gói** (đã chuẩn hoá) — xem `countOrdersByPackage`.
 *
 * ## Nguồn dữ liệu
 *
 * ⚠ Dùng `GET /api/orders/admin` (**không** phải `/api/orders`) vì
 *   `/api/orders` chỉ trả đơn của **chính user đang đăng nhập** ⇒ Admin sẽ
 *   thấy 0 đơn ⇒ đếm sai.
 *
 * ⚠ Không dùng `useAdminOrders` vì hook đó kéo thêm **toàn bộ phiên canh tác**
 *   (để suy ra trạng thái đơn) ⇒ quá nặng cho 1 con số đếm. Ở đây chỉ cần
 *   danh sách đơn.
 */
export function useRentalPackageOrderCounts(
  packages: readonly RentalPackage[],
  options?: Partial<UseQueryOptions<Map<number, number>, Error>>,
) {
  const hasPackages = packages.length > 0

  /**
   * ⚠ **Chữ ký danh sách gói** — đưa vào query key để khi gói thuê được
   *   thêm / sửa tên ⇒ bộ đếm được tính lại (tên gói là khoá khớp).
   */
  const packagesSignature = useMemo(
    () =>
      packages
        .map((pkg) => `${pkg.package_id}:${pkg.package_name}`)
        .sort()
        .join('|'),
    [packages],
  )

  const query = useQuery<Map<number, number>, Error>({
    queryKey: [...rentalPackageOrderCountKeys.all, packagesSignature],
    queryFn: async () => {
      const orders: AdminOrderDto[] = await fetchAllAdminOrders({
        pageSize: 100,
      })
      return countOrdersByPackage(orders, packages)
    },
    enabled: hasPackages,
    staleTime: 60_000,
    retry: false,
    ...options,
  })

  /**
   * ⚠ **Số đơn dùng để disable nút Xóa** — ưu tiên số đếm từ API đơn hàng.
   *
   *   Fallback về `package.order_count` (trường mà BE **có thể** bổ sung sau
   *   này) khi query đơn hàng lỗi ⇒ vẫn không bỏ sót trường hợp BE đã trả.
   */
  const counts = useMemo(() => {
    const map = new Map<number, number>(query.data ?? [])
    for (const pkg of packages) {
      if (map.has(pkg.package_id)) continue
      const fromPackage = pkg.order_count
      if (typeof fromPackage === 'number' && fromPackage > 0) {
        map.set(pkg.package_id, fromPackage)
      }
    }
    return map
  }, [query.data, packages])

  return {
    /** Map `package_id` → số đơn (chỉ chứa gói **có** đơn ≥ 1). */
    counts,
    /** Số đơn của 1 gói (0 nếu không có). */
    getOrderCount: (packageId: number) => counts.get(packageId) ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  }
}
