import type { CSSProperties } from 'react'
import { Avatar, Tooltip } from 'antd'
import { getUserInitials } from './user-avatar.utils'

export interface UserAvatarProps {
  /** Họ tên hiển thị — dùng để sinh chữ cái đầu. */
  name: string
  /** Kích thước avatar (px). */
  size?: number
  /** Chú thích khi hover (mặc định = tên). */
  title?: string
  className?: string
  style?: CSSProperties
}

/**
 * Avatar chữ cái đầu cho khách hàng — đồng bộ với avatar tài khoản.
 *
 * Màu lấy từ token (`--mcms-primary-soft` / `--mcms-primary`) nên tự động
 * đồng bộ theme và đạt tương phản WCAG AA.
 */
export function UserAvatar({
  name,
  size = 32,
  title,
  className,
  style,
}: UserAvatarProps) {
  const initials = getUserInitials(name)
  const displayName = name.trim() || 'Khách hàng'

  const avatar = (
    <Avatar
      className={className}
      size={size}
      aria-label={displayName}
      style={{
        background: 'var(--mcms-primary-soft)',
        color: 'var(--mcms-primary)',
        fontWeight: 600,
        fontSize: Math.round(size * 0.4),
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </Avatar>
  )

  if (!title) return avatar

  return <Tooltip title={title}>{avatar}</Tooltip>
}
