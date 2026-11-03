/**
 * Định nghĩa menu điều hướng — **dữ liệu thuần**, không chứa JSX.
 *
 * ⚠ Vì sao tách riêng khỏi `navigation-menu.tsx`?
 *   - Cho phép test logic lọc theo vai trò mà không cần render React.
 *   - Giữ `navigation-menu.tsx` chỉ lo "icon + khung antd".
 *
 * ⚠ Vì sao gắn cờ `adminOnly` thay vì viết 2 danh sách riêng?
 *   Nếu khai báo 2 danh sách (một cho ADMIN, một cho OPERATOR) thì dễ
 *   lệch với `router/index.tsx` ⇒ OPERATOR thấy mục "Tài khoản" nhưng
 *   click vào lại bị 403. Ở đây chỉ có **một** nguồn, và `router` dùng
 *   chung hằng `ADMIN_ONLY` / `ADMIN_AND_OPERATOR` từ
 *   `src/routes/access-policy.ts` ⇒ hai nơi luôn khớp.
 */

/** Tên icon — ánh xạ sang component trong `navigation-menu.tsx`. */
export type MenuIconName =
  | 'dashboard'
  | 'trays'
  | 'devices'
  | 'camera'
  | 'cultivation'
  | 'alerts'
  | 'notifications'
  | 'sessions'
  | 'issues'
  | 'harvests'
  | 'reports'
  | 'orders'
  | 'packages'
  | 'users'
  | 'settings'

export interface MenuItemDef {
  /** Khóa menu = path điều hướng (khoá của antd `Menu`). */
  key: string
  icon: MenuIconName
  label: string
  /** Chỉ Quản trị viên mới thấy & truy cập được. */
  adminOnly?: boolean
}

export interface MenuGroupDef {
  label: string
  items: MenuItemDef[]
}

export const MENU_GROUPS: MenuGroupDef[] = [
  {
    label: 'TỔNG QUAN',
    items: [
      {
        key: '/',
        icon: 'dashboard',
        label: 'Dashboard',
      },
    ],
  },
  {
    label: 'VẬN HÀNH TRANG TRẠI',
    items: [
      {
        key: '/rooms',
        icon: 'trays',
        label: 'Quản lý khay',
      },
      {
        key: '/devices',
        icon: 'devices',
        label: 'Thiết bị IoT',
      },
      {
        key: '/camera',
        icon: 'camera',
        label: 'Camera toàn cảnh',
        // BE `GET /api/cameras` yêu cầu `authorizeRoles(1)` ⇒ OPERATOR 403.
        adminOnly: true,
      },
      {
        key: '/cultivation',
        icon: 'cultivation',
        label: 'Sinh trưởng & thu hoạch',
      },
      {
        key: '/alerts',
        icon: 'alerts',
        label: 'Cảnh báo vi khí hậu',
      },
      {
        key: '/notifications',
        icon: 'notifications',
        label: 'Thông báo',
      },
      {
        key: '/sessions',
        icon: 'sessions',
        label: 'Phiên canh tác',
      },
      {
        key: '/issues',
        icon: 'issues',
        label: 'Sự cố & Bệnh hại',
        adminOnly: true,
      },
      {
        key: '/harvests',
        icon: 'harvests',
        label: 'Quản lý Thu hoạch',
        adminOnly: true,
      },
      {
        key: '/reports',
        icon: 'reports',
        label: 'Báo cáo & phân tích',
      },
    ],
  },
  {
    label: 'QUẢN TRỊ',
    items: [
      {
        key: '/orders',
        icon: 'orders',
        label: 'Đơn đặt từ App',
      },
      {
        key: '/packages',
        icon: 'packages',
        label: 'Gói cước thuê',
      },
      {
        key: '/users',
        icon: 'users',
        label: 'Tài khoản',
        adminOnly: true,
      },
      {
        key: '/settings',
        icon: 'settings',
        label: 'Hồ sơ Vi khí hậu',
        adminOnly: true,
      },
    ],
  },
]

/**
 * Lọc menu theo vai trò.
 *
 * - ADMIN → giữ tất cả.
 * - OPERATOR → bỏ các mục `adminOnly` (không hiện menu chết).
 * - Nhóm không còn mục nào sau khi lọc → bỏ luôn nhóm (tránh nhóm rỗng).
 */
export function filterMenuGroups(
  groups: MenuGroupDef[],
  isAdmin: boolean,
): MenuGroupDef[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isAdmin || !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0)
}
