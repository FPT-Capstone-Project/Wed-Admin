import type { ReactNode } from 'react'
import { Button, Empty, Flex, Typography } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

export interface EmptyStateProps {
  /** Tiêu đề — giải thích trạng thái bằng ngôn ngữ đời thường. */
  title: ReactNode
  /** Mô tả hướng dẫn người dùng làm gì tiếp theo. */
  description?: ReactNode
  /** Icon — trang trí, không mang thông tin. */
  icon?: ReactNode
  /** Hành động chính để thoát khỏi trạng thái rỗng. */
  action?: ReactNode
  /** Nút phụ. */
  secondaryAction?: ReactNode
  className?: string
}

/**
 * Trạng thái rỗng chuẩn.
 *
 * Quy tắc (UX: `empty-states`):
 *   - Nói rõ ĐANG TRỐNG vì lý do gì, không chỉ "Không có dữ liệu".
 *   - Luôn đưa ra hành động tiếp theo nếu có thể.
 *   - Không dùng emoji làm icon.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <Empty
      className={className}
      image={icon ?? <InboxOutlined style={{ color: 'var(--mcms-text-muted)' }} />}
      styles={{ image: { height: 56, fontSize: 40, opacity: 0.55 } }}
      description={
        <Flex vertical gap={4} align="center">
          <Typography.Text strong style={{ fontSize: 15 }}>
            {title}
          </Typography.Text>
          {description && (
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {description}
            </Typography.Text>
          )}
        </Flex>
      }
    >
      {(action || secondaryAction) && (
        <Flex gap={8} justify="center" wrap>
          {action}
          {secondaryAction}
        </Flex>
      )}
    </Empty>
  )
}

export interface EmptyStateActionProps {
  children: ReactNode
  onClick?: () => void
  type?: 'primary' | 'default'
}

/** Nút hành động cho EmptyState — tách riêng để giữ API gọn. */
export function EmptyStateAction({
  children,
  onClick,
  type = 'primary',
}: EmptyStateActionProps) {
  return (
    <Button type={type} onClick={onClick}>
      {children}
    </Button>
  )
}
