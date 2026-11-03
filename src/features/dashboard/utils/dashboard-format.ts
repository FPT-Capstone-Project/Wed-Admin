/**
 * Format helper cho KPI Dashboard.
 *
 * ⚠ Tách riêng khỏi `features/analytics/utils/executive-report.utils.ts` để
 *   feature `dashboard` không phụ thuộc vào feature `analytics` (tránh phụ
 *   thuộc vòng).
 */

/**
 * Format số tiền theo đơn vị do BE trả (`revenue.currency`).
 *
 * ⚠ `Intl.NumberFormat` ném `RangeError` nếu `currency` không hợp lệ (BE
 *   có thể trả mã lạ) ⇒ bọc `try/catch` và fallback sang định dạng số
 *   kèm "đ".
 */
export function formatDashboardCurrency(
  value: number,
  currency = 'VND',
): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0

  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(safe)
  } catch {
    return `${safe.toLocaleString('vi-VN')} đ`
  }
}

/**
 * Format tỷ lệ phần trăm — tối đa 1 chữ số thập phân, không bao giờ in `NaN`.
 */
export function formatDashboardPercent(value: number): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `${safe.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`
}
