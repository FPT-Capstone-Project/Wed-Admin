import {
  Bell, Bug, CalendarDays, ChartColumn, ClipboardList, Cpu,
  Gauge, HandPlatter, LayoutGrid, Package, Sprout, Thermometer, Truck, Users, Video, Warehouse,
} from 'lucide-react'
import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'
import { filterMenuGroups, MENU_GROUPS, type MenuIconName } from './navigation-items'

/** Mỗi mục có hình dạng riêng; giữ kích thước 18px và nét 2px. */
const ICONS: Record<MenuIconName, ReactNode> = {
  dashboard: <Gauge size={18} strokeWidth={2} aria-hidden="true" />,
  trays: <LayoutGrid size={18} strokeWidth={2} aria-hidden="true" />,
  devices: <Cpu size={18} strokeWidth={2} aria-hidden="true" />,
  camera: <Video size={18} strokeWidth={2} aria-hidden="true" />,
  cultivation: <Sprout size={18} strokeWidth={2} aria-hidden="true" />,
  alerts: <Bell size={18} strokeWidth={2} aria-hidden="true" />,
  sessions: <CalendarDays size={18} strokeWidth={2} aria-hidden="true" />,
  issues: <Bug size={18} strokeWidth={2} aria-hidden="true" />,
  harvests: <Truck size={18} strokeWidth={2} aria-hidden="true" />,
  harvestRequests: <HandPlatter size={18} strokeWidth={2} aria-hidden="true" />,
  inventory: <Warehouse size={18} strokeWidth={2} aria-hidden="true" />,
  reports: <ChartColumn size={18} strokeWidth={2} aria-hidden="true" />,
  orders: <ClipboardList size={18} strokeWidth={2} aria-hidden="true" />,
  packages: <Package size={18} strokeWidth={2} aria-hidden="true" />,
  users: <Users size={18} strokeWidth={2} aria-hidden="true" />,
  settings: <Thermometer size={18} strokeWidth={2} aria-hidden="true" />,
}

/** Dựng menu theo vai trò; bỏ nhóm rỗng sau khi lọc. */
export function buildMenuItems(isAdmin: boolean): MenuProps['items'] {
  return filterMenuGroups(MENU_GROUPS, isAdmin).map((group) => ({
    type: 'group' as const,
    label: group.label,
    children: group.items.map((item) => ({
      key: item.key,
      icon: <span className="anticon" aria-hidden="true">{ICONS[item.icon]}</span>,
      label: item.label,
    })),
  }))
}
