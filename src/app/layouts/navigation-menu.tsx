import {
  AlertOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FundOutlined,
  OrderedListOutlined,
  TagsOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'
import {
  filterMenuGroups,
  MENU_GROUPS,
  type MenuIconName,
} from './navigation-items'

/** Icon antd tương ứng với từng mục menu. */
const ICONS: Record<MenuIconName, ReactNode> = {
  dashboard: <DashboardOutlined />,
  trays: <AppstoreOutlined />,
  devices: <ApiOutlined />,
  camera: <VideoCameraOutlined />,
  cultivation: <FundOutlined />,
  alerts: <AlertOutlined />,
  sessions: <FundOutlined />,
  issues: <AlertOutlined />,
  harvests: <ExperimentOutlined />,
  reports: <BarChartOutlined />,
  orders: <OrderedListOutlined />,
  packages: <TagsOutlined />,
  users: <TeamOutlined />,
  settings: <ExperimentOutlined />,
}

/**
 * Dựng danh sách menu cho antd theo vai trò hiện tại.
 *
 * - ADMIN → thấy toàn bộ mục.
 * - OPERATOR → ẩn các mục `adminOnly` (không hiện menu chết).
 * - Nhóm không còn mục nào sau khi lọc → ẩn luôn nhóm (tránh nhóm rỗng).
 *
 * ⚠ Logic lọc nằm ở `navigation-items.ts` (thuần dữ liệu) để test được.
 */
export function buildMenuItems(isAdmin: boolean): MenuProps['items'] {
  return filterMenuGroups(MENU_GROUPS, isAdmin).map((group) => ({
    type: 'group' as const,
    label: group.label,
    children: group.items.map((item) => ({
      key: item.key,
      icon: ICONS[item.icon],
      label: item.label,
    })),
  }))
}
