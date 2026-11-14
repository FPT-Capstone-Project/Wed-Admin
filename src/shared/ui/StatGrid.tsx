import type { ReactNode } from 'react'

export interface StatGridProps {
  /** Các thẻ thống kê (thường là `StatCard`). */
  children: ReactNode
  /**
   * Số cột tối đa trên màn hình rộng.
   *
   * ⚠ Mặc định 4 ⇒ khớp với bốn thẻ KPI quen thuộc.
   */
  columns?: 2 | 3 | 4
  /** Khoảng cách giữa các thẻ (px). */
  gap?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Lưới CSS cho cụm thẻ thống kê (KPI) đầu trang.
 *
 * ⚠ Vì sao không dùng `<Row>/<Col>` của antd?
 *   `Row` dùng `flex` + `width: 25%` ⇒ khi vùng nội dung hẹp hơn kỳ
 *   vọng, **số tiền dài** (vd "Tổng giá trị: 1.234.567.000 ₫") tràn ra
 *   ngoài thẻ ⇒ bị cắt chữ / tràn ngang.
 *
 *   `display: grid` với `minmax(0, 1fr)` ⇒ mỗi cột co lại đúng bằng
 *   nhau và **không** vượt quá container ⇒ không bao giờ tràn ngang.
 *
 * ⚠ Breakpoint (theo CSS px — đã tính cả Windows Scale 125%–150%):
 *   - `< 640px`  → 1 cột (mobile).
 *   - `≥ 640px` → 2 cột (tablet / laptop nhỏ).
 *   - `≥ 1280px`→ 3 cột (desktop).
 *   - `≥ 1536px`→ 4 cột (desktop rộng).
 *
 *   ⇒ Trên laptop 1280–1536px, 4 thẻ KPI nằm gọn trong 1 hàng mà vẫn
 *   đủ chỗ cho số tiền dài.
 */
export function StatGrid({
  children,
  columns = 4,
  gap = 16,
  className,
  style,
}: StatGridProps) {
  return (
    <div
      className={['mcms-stat-grid', className].filter(Boolean).join(' ')}
      data-columns={columns}
      style={{ '--mcms-stat-grid-gap': `${gap}px`, ...style } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
