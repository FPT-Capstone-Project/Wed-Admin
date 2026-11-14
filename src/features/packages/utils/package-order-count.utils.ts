/**
 * Đếm số đơn hàng theo **gói thuê** — dùng để hiển thị cột "Đơn hàng" và
 * **disable nút Xóa** (tránh lỗi khoá ngoại 500 từ BE).
 *
 * ## Vì sao phải tự đếm?
 *
 * ⚠ `GET /api/rental-packages` **không** trả trường đếm đơn:
 *   - BE chỉ SELECT `package_id, package_name, description, duration_days,
 *     price, status` (xem `Backend/src/models/rentalPackage.model.js`).
 *   - OpenAPI schema `RentalPackage` cũng không khai báo `order_count`.
 *
 * ⚠ `GET /api/orders/admin` **không** trả `package_id`:
 *   - BE gộp nhiều item của 1 đơn thành 1 record phẳng, tên gói được nối
 *     bằng dấu phẩy (`string_agg(rp.package_name, ', ')`).
 *
 * ⇒ Ta **đếm ở FE** bằng cách khớp `package_name` của đơn với
 *   `package_name` của gói thuê.
 */

/** Gói thuê — chỉ cần 2 trường để đếm. */
export interface CountablePackage {
  package_id: number
  package_name: string
}

/** Đơn hàng — chỉ cần tên gói (đã gộp nhiều item bằng dấu phẩy). */
export interface CountableOrder {
  package_name?: string | null
}

/**
 * ⚠ **Chuẩn hoá tên gói** để so khớp không bị lệch do khoảng trắng / hoa
 *   thường / ký tự thừa.
 */
function normalizeName(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Đếm số đơn theo `package_id`.
 *
 * ⚠ **Cách khớp:**
 *   1. BE nối tên gói của các item trong 1 đơn bằng `', '` ⇒ ta tách ra
 *      từng tên rồi khớp **chính xác** (đã chuẩn hoá) với tên gói thuê.
 *   2. Nếu không tách/khớp được (đơn cũ thiếu `package_id`, chỉ có tên) ⇒
 *      thử khớp **cả chuỗi** `package_name` với tên gói (fallback theo tên).
 *   3. Đơn không có tên gói ⇒ **bỏ qua** (không suy đoán).
 *
 * @returns Map `package_id` → số đơn (chỉ chứa gói **có** đơn ≥ 1).
 */
export function countOrdersByPackage(
  orders: readonly CountableOrder[],
  packages: readonly CountablePackage[],
): Map<number, number> {
  const counts = new Map<number, number>()
  if (orders.length === 0 || packages.length === 0) return counts

  // ⚠ Map tên (đã chuẩn hoá) → gói — tra O(1).
  const packagesByName = new Map<string, CountablePackage[]>()
  for (const pkg of packages) {
    const key = normalizeName(pkg.package_name)
    if (!key) continue
    const bucket = packagesByName.get(key)
    if (bucket) bucket.push(pkg)
    else packagesByName.set(key, [pkg])
  }
  if (packagesByName.size === 0) return counts

  /** Tăng bộ đếm cho 1 gói (không cần biết tên). */
  const bump = (pkg: CountablePackage) => {
    counts.set(pkg.package_id, (counts.get(pkg.package_id) ?? 0) + 1)
  }

  for (const order of orders) {
    const rawName = order.package_name
    if (typeof rawName !== 'string' || rawName.trim() === '') continue

    let matched = false

    // 1) Tách tên gói theo dấu phẩy (BE nối bằng ", ").
    for (const part of rawName.split(',')) {
      const key = normalizeName(part)
      if (!key) continue
      const bucket = packagesByName.get(key)
      if (!bucket) continue
      // ⚠ 1 đơn có thể chứa nhiều item cùng gói ⇒ chỉ tính **1 lần** cho mỗi gói.
      for (const pkg of bucket) bump(pkg)
      matched = true
    }

    // 2) Fallback: khớp cả chuỗi (đơn cũ chỉ có 1 tên gói).
    if (!matched) {
      const bucket = packagesByName.get(normalizeName(rawName))
      if (bucket) {
        for (const pkg of bucket) bump(pkg)
      }
    }
  }

  return counts
}
