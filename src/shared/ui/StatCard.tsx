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
  /** Icon góc trên bên phải — trang trí, không mang thông tin. */
  icon?: ReactNode
  /** Trạng thái ngữ nghĩa — chấm tròn cạnh nhãn, không tô viền card. */
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
 * Thẻ thống kê chuẩn — phân cấp thị giác theo chuẩn Enterprise IoT.
 *
 * Vấn đề giải quyết: "giao diện thiếu trọng tâm, mọi thứ cùng độ nổi bật".
 * Thẻ này tạo phân cấp rõ:
 *   - **Số liệu = thành phần nổi bật nhất** (28px, đậm, tabular).
 *   - **Nhãn = chữ xám nhỏ** (12px, secondary) → không cạnh tranh với số.
 *   - **Icon = góc trên bên phải, xám muted** → trang trí, không phô.
 *   - **Trạng thái = điểm tròn 6px** cạnh nhãn + màu chữ số liệu.
 *
 * ⚠ **KHÔNG** viền trái 3px màu (chuẩn B2B Industrial IoT: không viền
 *   màu đậm ở cạnh card) và **KHÔNG** tô màu icon theo tone — icon luôn
 *   xám muted để thẻ giữ tính trung tính, chỉ số liệu mới là trọng tâm.
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
      className={['mcms-stat-card', className].filter(Boolean).join(' ')}
      size="small"
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      styles={{ body: { padding: 16 } }}
    >
      <Flex justify="space-between" align="flex-start" gap={8}>
        <Flex vertical gap={6} style={{ minWidth: 0 }}>
          <Flex align="center" gap={6}>
            {palette && (
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  flexShrink: 0,
                  borderRadius: '50%',
                  backgroundColor: palette.dot,
                }}
              />
            )}
            <Typography.Text className="mcms-stat-card-label" type="secondary" style={{ fontSize: 12 }}>
              {title}
            </Typography.Text>
          </Flex>

          <Flex align="baseline" gap={4}>
            <Typography.Text
              strong
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.2,
                color:
                  highlightValue && palette ? palette.text : 'var(--mcms-text)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {value}
            </Typography.Text>
            {suffix && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
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
              fontSize: 18,
              lineHeight: 1,
              color: 'var(--mcms-text-muted)',
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
