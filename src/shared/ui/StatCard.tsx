import type { CSSProperties, ReactNode } from 'react'
import { Card, Flex, Tooltip, Typography } from 'antd'
import { tones, type SemanticTone } from '../../app/theme/tokens'

export interface StatCardProps {
  /** Nhãn chỉ số. */
  title: ReactNode
  /** Giá trị chính — hiển thị bằng số tabular để không nhảy layout. */
  value: ReactNode
  /** Đơn vị đo, hiển thị cạnh giá trị. */
  suffix?: ReactNode
  /** Icon góc trên — trang trí, không mang thông tin. */
  icon?: ReactNode
  /** Trạng thái ngữ nghĩa — tô điểm/viền trái để phân cấp thị giác. */
  tone?: SemanticTone
  /** Diễn giải ngắn dưới giá trị. */
  description?: ReactNode
  /** Nội dung bổ sung dưới phần diễn giải (ví dụ biến động so với kỳ trước). */
  extra?: ReactNode
  /** Chú thích khi hover vào giá trị. */
  hint?: string
  /** Đổi màu chữ giá trị theo trạng thái (dùng cho số liệu cảnh báo). */
  highlightValue?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Thẻ thống kê chuẩn.
 *
 * Vấn đề giải quyết: "giao diện thiếu trọng tâm, mọi thứ cùng độ nổi bật".
 * Thẻ này tạo phân cấp rõ:
 *   - Con số = thành phần nổi bật nhất (32px, bold, tabular).
 *   - Nhãn = phụ (14px, secondary).
 *   - Trạng thái = dải màu 3px bên trái + điểm tròn.
 *
 * Màu số liệu dùng palette đã verify WCAG AA (không dùng màu raw như
 * `#52c41a` — chỉ đạt 2.27:1 trên nền trắng).
 */
export function StatCard({
  title,
  value,
  suffix,
  icon,
  tone,
  description,
  extra,
  hint,
  highlightValue = false,
  className,
  style,
}: StatCardProps) {
  const palette = tone ? tones[tone] : null

  return (
    <Card
      className={className}
      size="small"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderLeft: palette ? `3px solid ${palette.solid}` : undefined,
        ...style,
      }}
      styles={{ body: { padding: 16 } }}
    >
      <Flex justify="space-between" align="flex-start" gap={8}>
        <Flex vertical gap={6} style={{ minWidth: 0 }}>
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {title}
          </Typography.Text>

          <Flex align="baseline" gap={4}>
            <Typography.Text
              strong
              style={{
                fontSize: 32,
                lineHeight: 1.2,
                color:
                  highlightValue && palette ? palette.text : 'var(--mcms-text)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </Typography.Text>
            {suffix && (
              <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                {suffix}
              </Typography.Text>
            )}
          </Flex>

          {description && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {description}
            </Typography.Text>
          )}

          {extra && (
            <div style={{ marginTop: 6 }}>{extra}</div>
          )}
        </Flex>

        {icon && (
          <span
            aria-hidden="true"
            style={{
              fontSize: 20,
              color: palette ? palette.solid : 'var(--mcms-text-muted)',
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
      </Flex>

      {hint && (
        <Tooltip title={hint}>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', marginTop: 4 }}
          >
            {hint}
          </Typography.Text>
        </Tooltip>
      )}
    </Card>
  )
}
