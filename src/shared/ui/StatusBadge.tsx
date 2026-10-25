import type { CSSProperties, ReactNode } from 'react'
import { Tag, Tooltip } from 'antd'
import { tones, toneLabels, type SemanticTone } from '../../app/theme/tokens'

export interface StatusBadgeProps {
  /** Trạng thái ngữ nghĩa — quyết định màu. */
  tone: SemanticTone
  /** Nhãn hiển thị. Bắt buộc: badge KHÔNG được chỉ dựa vào màu. */
  label: ReactNode
  /** Icon đi kèm nhãn — tăng khả năng nhận dạng cho người mù màu. */
  icon?: ReactNode
  /**
   * Giải thích bổ sung khi hover (ví dụ "3 cảm biến mất tín hiệu").
   * Không bắt buộc — chỉ dùng khi nhãn không đủ rõ.
   */
  title?: ReactNode
  /** Hiển thị dạng điểm tròn chỉ (dùng trong legend/chart) — luôn kèm tooltip nhãn. */
  dot?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Badge trạng thái dùng chung cho toàn app.
 *
 * Vì sao không dùng `<Tag color="success">` của antd?
 *   Badge preset của antd **FAIL WCAG AA**:
 *     success  3.37:1 (cần ≥ 4.5)
 *     warning  2.76:1
 *     default  3.22:1
 *   → chữ trên badge khó đọc, đúng complaint "badge tương phản yếu".
 *
 * Component này dùng palette đã verify trong `tokens.ts`:
 *     ok 4.55 · info 4.88 · warning 4.61 · danger 4.61 · muted 4.61
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

  // Dạng điểm tròn — luôn bọc Tooltip vì không có chữ bên cạnh.
  if (dot) {
    return (
      <Tooltip title={title ?? (typeof label === 'string' ? label : toneLabels[tone])}>
        <span
          role="img"
          aria-label={typeof label === 'string' ? label : toneLabels[tone]}
          className={className}
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: palette.solid,
            border: `1px solid ${palette.border}`,
            ...style,
          }}
        />
      </Tooltip>
    )
  }

  const badge = (
    <Tag
      className={className ? `mcms-status-badge ${className}` : 'mcms-status-badge'}
      variant="filled"
      icon={icon}
      style={{
        color: palette.text,
        backgroundColor: palette.bg,
        borderColor: palette.border,
        fontWeight: 600,
        ...style,
      }}
    >
      {label}
    </Tag>
  )

  if (!title) return badge

  return <Tooltip title={title}>{badge}</Tooltip>
}
