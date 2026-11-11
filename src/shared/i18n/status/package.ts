/**
 * Từ điển trạng thái — **gói thuê & giống nấm** (package & mushroom).
 *
 * ⚠ Nguồn sự thật duy nhất cho:
 *   - Trạng thái gói thuê (`rental_packages.status`).
 *   - Trạng thái giống nấm (`mushroom_types.status`).
 *   - Chu kỳ tính tiền (`billing_cycle`).
 *
 * ⚠ Vì sao gộp gói + nấm? Cả hai dùng **cùng một bộ trạng thái**
 *   (`ACTIVE` / `INACTIVE`) và cùng cách hiển thị ("Đang nhận đơn" /
 *   "Tạm ngưng") ⇒ 1 từ điển, không tạo 2 bảng trùng nhau.
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
 * ⚠ `ACTIVE` = đang nhận đơn; `INACTIVE` = tạm ngưng.
 */
export const CATALOG_STATUS_DICTIONARY: Record<
  CatalogStatusKey,
  StatusPresentation
> = {
  ACTIVE: { tone: 'ok', label: 'Đang nhận đơn' },
  INACTIVE: { tone: 'muted', label: 'Tạm ngưng' },
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
  ACTIVE: { tone: 'ok', label: 'Đang nhận đơn' },
  INACTIVE: { tone: 'muted', label: 'Tạm ngưng' },
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
