import type { ReactNode } from 'react'
import { Button, Tooltip } from 'antd'

export interface ActionButtonProps {
  /** Icon hiển thị trong nút. */
  icon: ReactNode
  /**
   * Nhãn tiếng Việt của hành động — BẮT BUỘC.
   *
   * Đây là nguồn cho tooltip và cho `aria-label`, nên nút icon-only vẫn
   * luôn có tên accessible (WCAG 4.1.2 Name, Role, Value).
   */
  label: string
  /** Chú thích dài hơn khi hover (mặc định = `label`). */
  description?: string
  onClick?: () => void
  /**
   * Loại hành động — quyết định màu.
   *   - `default`   — nút phụ (nền trắng, viền).
   *   - `primary`   — hành động chính của vùng (chỉ 1 nút/vùng).
   *   - `text`      — nút icon-only trong cột hành động hẹp.
   *   - `danger`    — hành động phá hủy (nền trắng, viền đỏ).
   *   - `dangerText`— hành động phá hủy dạng icon-only.
   */
  variant?: 'default' | 'primary' | 'danger' | 'text' | 'dangerText'
  size?: 'small' | 'middle' | 'large'
  disabled?: boolean
  loading?: boolean
  /** Ẩn chữ nhưng giữ tooltip (dùng trong cột hành động hẹp). */
  hideLabel?: boolean
  /** Không render tooltip khi đang disabled (tránh tooltip trôi gây rối). */
  className?: string
}

/**
 * Nút hành động chuẩn — luôn có nhãn tiếng Việt.
 *
 * Vấn đề giải quyết: cột "Thao tác" trong bảng trước đây toàn icon không
 * nhãn → người dùng không biết nút nào làm gì, và screen reader đọc
 * "button" trống.
 *
 * Quy tắc:
 *   - `hideLabel` chỉ dùng khi nằm trong cột hành động hẹp; tooltip vẫn bắt buộc.
 *   - Icon đi kèm nhãn (icon + text) — không dùng emoji.
 *   - Nút chính (`variant="primary"`) chỉ dùng cho 1 hành động chính mỗi vùng.
 */
export function ActionButton({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
  size = 'small',
  disabled = false,
  loading = false,
  hideLabel = false,
  className,
}: ActionButtonProps) {
  const button = (
    <Button
      type={
        variant === 'primary'
          ? 'primary'
          : variant === 'text' || variant === 'dangerText'
            ? 'text'
            : 'default'
      }
      danger={variant === 'danger' || variant === 'dangerText'}
      size={size}
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      aria-label={label}
      className={className}
    >
      {hideLabel ? null : label}
    </Button>
  )

  // Nút có chữ hiển thị → không cần tooltip trùng lặp.
  if (!hideLabel) return button

  return (
    <Tooltip title={description ? `${label} — ${description}` : label}>
      {/* span bao để tooltip bám được cả khi button bị disabled */}
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  )
}
