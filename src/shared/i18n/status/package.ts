/**
 * Từ điển trạng thái — **gói thuê & giống nấm** (package & mushroom).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái gói thuê (`rental_packages.status`).
 *   - Trạng thái giống nấm (`mushroom_types.status`).
 *   - Chu kỳ tính tiền (`billing_cycle`).
 *
 * ⚠ Vì sao gộp gói + nấm? Cả hai dùng **cùng một bộ trạng thái**
 *   (`ACTIVE` / `INACTIVE`) và cùng cách hiển thị ("Đang áp dụng" /
 *   "Ngừng áp dụng") ⇒ 1 từ điển, không tạo 2 bảng trùng nhau.
 *
 * ⚠ Vì sao KHÔNG dùng "Đang nhận đơn" / "Tạm ngưng"?
 *   Đây là **danh mục** (giống nấm, gói thuê), không phải trạng thái nhận
 *   đơn. `ACTIVE` = danh mục đang được phép dùng; `INACTIVE` = đã ngừng
 *   áp dụng (không hiện cho khách, không tạo vụ mới) — đúng với ý nghĩa
 *   cột `status` trong DB (`CHECK (status IN ('ACTIVE','INACTIVE'))`).
 */

import type { StatusPresentation } from './types'
/** Trạng thái gói thuê / giống nấm. */
export type CatalogStatusKey = 'ACTIVE' | 'INACTIVE'

/** Trạng thái gói thuê khi có chương trình ưu đãi (`packages.status`). */
export type PackageStatusKey = 'ACTIVE' | 'INACTIVE' | 'PROMOTION'

/** Chu kỳ tính tiền của gói. */
export type BillingCycleKey =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'CROP_CYCLE'
  | 'QUARTERLY'
  | 'YEARLY'

/**
 * Trạng thái gói thuê / giống nấm.
 *
 * ⚠ `ACTIVE` = đang áp dụng; `INACTIVE` = ngừng áp dụng.
 */
export const CATALOG_STATUS_DICTIONARY: Record<
  CatalogStatusKey,
  StatusPresentation
> = {
  ACTIVE: { tone: 'ok', label: 'Đang áp dụng' },
  INACTIVE: { tone: 'muted', label: 'Ngừng áp dụng' },
}

/**
 * Trạng thái gói thuê (bản đầy đủ — có thêm `PROMOTION`).
 *
 * ⚠ Nhãn khớp với màn hình "Gói thuê" (`pages/packages`).
 */
export const PACKAGE_STATUS_DICTIONARY: Record<
  PackageStatusKey,
  StatusPresentation
> = {
  ACTIVE: { tone: 'ok', label: 'Đang áp dụng' },
  INACTIVE: { tone: 'muted', label: 'Ngừng áp dụng' },
  PROMOTION: { tone: 'info', label: 'Gói ưu đãi' },
}

/** Chu kỳ tính tiền — dùng cho cột "Chu kỳ" & dropdown. */
export const BILLING_CYCLE_DICTIONARY: Record<
  BillingCycleKey,
  StatusPresentation
> = {
  WEEKLY: { tone: 'neutral', label: 'Theo tuần' },
  BIWEEKLY: { tone: 'neutral', label: 'Theo 2 tuần' },
  MONTHLY: { tone: 'neutral', label: 'Theo tháng' },
  CROP_CYCLE: { tone: 'neutral', label: 'Theo vụ mùa' },
  QUARTERLY: { tone: 'neutral', label: 'Theo quý' },
  YEARLY: { tone: 'neutral', label: 'Theo năm' },
}
