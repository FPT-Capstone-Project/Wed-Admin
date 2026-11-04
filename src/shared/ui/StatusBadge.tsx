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
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: dotColor,
            ...style,
          }}
        />
      </Tooltip>
    )
  }

  // Dạng đầy đủ — chấm tròn trạng thái + chữ đậm trên nền rất nhạt, không viền.
  const badge = (
    <span
      className={className ? `mcms-status-badge ${className}` : 'mcms-status-badge'}
      tabIndex={title ? 0 : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '1px 8px',
        borderRadius: 'var(--mcms-radius-sm)',
        color: palette.text,
        backgroundColor: palette.badgeBg,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '20px',
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
          width: 6,
          height: 6,
          flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: dotColor,
        }}
      />
      {icon && <span aria-hidden="true">{icon}</span>}
      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</span>
    </span>
  )

  if (!title) return badge

  return <Tooltip title={title} trigger={['hover', 'focus']}>{badge}</Tooltip>
}

/** Metadata describes a role/category; it must not imply operational health. */
export type MetadataBadgeProps = Omit<StatusBadgeProps, 'tone' | 'dot'>

export function MetadataBadge({ label, icon, title, className, style }: MetadataBadgeProps) {
  const badge = (
    <span
      className={['mcms-metadata-badge', className].filter(Boolean).join(' ')}
      tabIndex={title ? 0 : undefined}
      style={style}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</span>
    </span>
  )

  return title ? <Tooltip title={title} trigger={['hover', 'focus']}>{badge}</Tooltip> : badge
}
