/**
 * Barrel export cho bộ component UI chuẩn của MCMS.
 *
 * Import từ đây để mọi trang dùng chung một bộ component — đảm bảo
 * giao diện nhất quán giữa các trang.
 */
export { ActionButton, type ActionButtonProps } from './ActionButton'
export { DataTable, type DataTableProps } from './DataTable'
export { EmptyState, EmptyStateAction, type EmptyStateProps } from './EmptyState'
export { FallbackThumbnail, type FallbackThumbnailProps } from './FallbackThumbnail'
export { PageHeader, type PageHeaderProps } from './PageHeader'
export { StatCard, type StatCardProps } from './StatCard'
export { StatusBadge, type StatusBadgeProps } from './StatusBadge'
export { UserAvatar, type UserAvatarProps } from './UserAvatar'
export { getUserInitials } from './user-avatar.utils'
