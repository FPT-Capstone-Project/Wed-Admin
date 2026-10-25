import type { ReactNode } from 'react'
import { Flex, Typography } from 'antd'

export interface PageHeaderProps {
  /** Tiêu đề trang — dùng h1 (heading hierarchy tuần tự, không nhảy cấp). */
  title: ReactNode
  /** Mô tả ngắn dưới tiêu đề. */
  description?: ReactNode
  /** Hành động chính (nút phải). */
  actions?: ReactNode
  /** Nội dung phụ giữa tiêu đề và hành động (ví dụ bộ lọc). */
  extra?: ReactNode
}

/**
 * Header chuẩn cho mọi trang.
 *
 * Giải quyết complaint "mọi thứ cùng độ nổi bật": chỉ tiêu đề + hành động
 * chính được nhấn; phần còn lại giữ ở mức phụ (secondary).
 *
 * Cấu trúc tiêu đề: `h1` (trang) → `h2` (khu vực) → `h3` (nhóm) → `h4`.
 */
export function PageHeader({
  title,
  description,
  actions,
  extra,
}: PageHeaderProps) {
  return (
    <Flex
      vertical
      gap={12}
      style={{ marginBottom: 16 }}
      className="mcms-page-header"
    >
      <Flex
        justify="space-between"
        align="flex-start"
        gap={16}
        wrap
      >
        <Flex vertical gap={4} style={{ minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {description && (
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {description}
            </Typography.Text>
          )}
        </Flex>

        {actions && (
          <Flex gap={8} wrap align="center">
            {actions}
          </Flex>
        )}
      </Flex>

      {extra && (
        <Flex gap={12} wrap align="center">
          {extra}
        </Flex>
      )}
    </Flex>
  )
}
