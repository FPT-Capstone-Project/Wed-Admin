import type { CSSProperties, ReactNode } from 'react'
import { Tooltip } from 'antd'
import { tones, toneLabels, type SemanticTone } from '../../app/theme/tokens'

export interface StatusBadgeProps {
  /** Trạng thái ngữ nghĩa — quyết định màu. */
  tone: SemanticTone
  /** Nhãn hiển thị. Bắt buộc: badge KHÔNG được chỉ dựa vào màu. */
  label: ReactNode
  /** Icon đi kèm nhãn — tăng khả năng nhận dạng cho người mù màu. */
  icon?: ReactNode
  /**
   * Giải thích bổ sung khi hover (ví dụ "3 cảm biến mất tín tín hiệu").
   * Không bắt buộc — chỉ dùng khi nhãn không đủ rõ.
   */
  title?: ReactNode
  /** Hiển thị dạng điểm tròn chỉ (dùng trong legend/chart) — luôn kèm tooltip nhãn. */
  dot?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Badge trạng thái dùng chung cho toàn app — dạng **"Status Dot"**.
 *
 * Dùng palette riêng để kiểm tra chính xác cặp chữ/nền/chấm của MCMS.
 *
 * ⚠ Chuẩn Enterprise IoT — **Status Dot**:
 *   - **Chấm tròn 6px**: xanh = ổn định, đỏ = cảnh báo/mất kết nối,
 *     vàng = chờ xử lý.
 *   - Chữ semibold cùng tông trên nền nhạt theo trạng thái.
 *   - Không viền, bo góc 4px.
 *   - KHÔNG viền màu sặc sỡ, KHÔNG bo tròn pill.
 *
 * Component này dùng palette đã verify trong `tokens.ts`:
 *   Mọi cặp chữ/nền badge đạt AA qua verify-tokens.ts.
 *
 * Quy tắc bắt buộc (WCAG 1.4.1 — không dùng màu đơn độc để truyền đạt):
 *   - Luôn có `label` dạng chữ.
 *   - Nên kèm `icon` để phân biệt nhanh bằng hình dạng.
 */
export function StatusBadge({
  tone,
  label,
  icon,
  title,
  dot = false,
  className,
  style,
}: StatusBadgeProps) {
  const palette = tones[tone]
  const dotColor = palette.dot
  const accessibleLabel = typeof label === 'string' ? label : toneLabels[tone]

  // Dạng điểm tròn — luôn bọc Tooltip vì không có chữ bên cạnh.
  if (dot) {
    return (
      <Tooltip title={title ?? accessibleLabel}>
        <span
          role="img"
          aria-label={accessibleLabel}
          className={['mcms-status-dot', className].filter(Boolean).join(' ')}
          tabIndex={0}
          style={{
            display: 'inline-block',
            width: 'var(--mcms-badge-dot-size)',
            height: 'var(--mcms-badge-dot-size)',
            borderRadius: '50%',
            backgroundColor: dotColor,
            ...style,
          }}
        />
      </Tooltip>
    )
  }

  // Dạng đầy đủ — chấm tròn trạng thái + chữ đậm trên nền rất nhạt, không viền.
  /*
   * ⚠ `whiteSpace` được truyền xuống **cả span nhãn** bên trong.
   *
   *   Mặc định badge cho phép xuống dòng (`normal`) vì nhãn dài có thể
   *   cần 2 dòng trong các bảng hẹp. Nhưng ở cột "Trạng thái" của bảng
   *   thiết bị, "Đang hoạt động" bị gãy thành 2 dòng làm hàng lệch ⇒
   *   truyền `whiteSpace: 'nowrap'` để giữ nhãn trên **1 hàng ngang**.
   */
  const labelWrap = style?.whiteSpace
  const badge = (
    <span
      className={className ? `mcms-status-badge ${className}` : 'mcms-status-badge'}
      tabIndex={title ? 0 : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--mcms-badge-gap)',
        padding: 'var(--mcms-badge-padding-block) var(--mcms-badge-padding-inline)',
        borderRadius: 'var(--mcms-radius-sm)',
        color: palette.text,
        backgroundColor: palette.badgeBg,
        fontSize: 'var(--mcms-font-small)',
        fontWeight: 600,
        lineHeight: 'var(--mcms-badge-line-height)',
        minWidth: 0,
        maxWidth: '100%',
        whiteSpace: 'normal',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 'var(--mcms-badge-dot-size)',
          height: 'var(--mcms-badge-dot-size)',
          flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: dotColor,
        }}
      />
      {icon && <span aria-hidden="true">{icon}</span>}
      <span
        style={{
          minWidth: 0,
          overflowWrap: 'anywhere',
          ...(labelWrap ? { whiteSpace: labelWrap } : null),
        }}
      >
        {label}
      </span>
    </span>
  )

  if (!title) return badge

  return <Tooltip title={title} trigger={['hover', 'focus']}>{badge}</Tooltip>
}

/** Metadata describes a role/category; it must not imply operational health. */
export type MetadataBadgeProps = Omit<StatusBadgeProps, 'tone' | 'dot'>

export function MetadataBadge({ label, icon, title, className, style }: MetadataBadgeProps) {
  // ⚠ `whiteSpace` truyền xuống span nhãn ⇒ cho phép siết nhãn dài về 1
  //   dòng (xem `StatusBadge`).
  const labelWrap = style?.whiteSpace
  const badge = (
    <span
      className={['mcms-metadata-badge', className].filter(Boolean).join(' ')}
      tabIndex={title ? 0 : undefined}
      style={style}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span
        style={{
          minWidth: 0,
          overflowWrap: 'anywhere',
          ...(labelWrap ? { whiteSpace: labelWrap } : null),
        }}
      >
        {label}
      </span>
    </span>
  )

  return title ? <Tooltip title={title} trigger={['hover', 'focus']}>{badge}</Tooltip> : badge
}
