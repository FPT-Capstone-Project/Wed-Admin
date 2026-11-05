import {
  CloseOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { AUTH_EXPIRED_EVENT } from '../../shared/api/client'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import { resolveUserRole, ROLE_LABELS } from '../../routes/access-policy'
import { buildMenuItems } from './navigation-menu'

const { Content, Header, Sider } = Layout

const PAGE_TITLES: Record<string, string> = {
  '/': 'Tổng quan trang trại',
  '/rooms': 'Quản lý khay nấm',
  '/devices': 'Thiết bị IoT',
  '/camera': 'Camera toàn cảnh',
  '/cultivation': 'Sinh trưởng & thu hoạch',
  '/alerts': 'Cảnh báo vi khí hậu',
  '/notifications': 'Thông báo',
  '/issues': 'Sự cố & Bệnh hại',
  '/harvests': 'Quản lý Thu hoạch',
  '/reports': 'Báo cáo & phân tích',
  '/orders': 'Quản lý đơn đặt',
  '/sessions': 'Quản lý phiên canh tác',
  '/packages': 'Gói cước thuê',
  '/users': 'Quản lý tài khoản',
  '/settings': 'Hồ sơ Vi khí hậu',
  '/change-password': 'Đổi mật khẩu',
  '/unauthorized': 'Không có quyền truy cập',
}

function getSelectedMenuKey(pathname: string) {
  if (pathname.startsWith('/rooms') || pathname.startsWith('/trays')) {
    return '/rooms'
  }

  const matchingPath = Object.keys(PAGE_TITLES)
    .filter((path) => path !== '/')
    .find((path) => pathname.startsWith(path))

  return matchingPath ?? '/'
}

interface BrandProps {
  onClose?: () => void
}

function Brand({ onClose }: BrandProps) {
  return (
    <div className="mcms-brand">
      {/*
        Logo nấm — dùng **cùng** file `mcms-mark.svg` với trang Login
        (`features/auth/pages/LoginPage.tsx`) để nhận diện thương hiệu
        nhất quán giữa màn hình đăng nhập và sidebar.

        ⚠ Trang trí ⇒ `aria-hidden` (tên thương hiệu đã có ở chữ "MCMS").
      */}
      <span className="mcms-brand-mark" aria-hidden="true">
        <img src="/mcms-mark.svg" alt="" width="32" height="32" />
      </span>
      <div className="mcms-brand-copy">
        <strong>MCMS</strong>
        <span>INDUSTRIAL TELEMETRY</span>
      </div>
      {onClose && (
        <Button
          type="text"
          className="mobile-nav-close"
          icon={<CloseOutlined />}
          aria-label="Đóng menu điều hướng"
          onClick={onClose}
        />
      )}
    </div>
  )
}

interface NavigationPanelProps {
  selectedKey: string
  onNavigate: (path: string) => void
  onClose?: () => void
  /** Menu đã lọc theo vai trò hiện tại. */
  items: MenuProps['items']
}

function NavigationPanel({
  selectedKey,
  onNavigate,
  onClose,
  items,
}: NavigationPanelProps) {
  return (
    <div className="sidebar-panel">
      <Brand onClose={onClose} />
      <Menu
        className="mcms-menu"
        mode="inline"
        items={items}
        selectedKeys={[selectedKey]}
        onClick={({ key }) => {
          onNavigate(key)
          onClose?.()
        }}
      />
      <div className="sidebar-health" role="status">
        <span className="sidebar-health-icon" aria-hidden="true">
          <WifiOutlined />
        </span>
        <span>
          <strong>Giám sát trang trại</strong>
          <small>Xem kết nối tại trang IoT</small>
        </span>
        <span className="status-pulse" style={{ background: 'var(--mcms-text-muted)' }} aria-hidden="true" />
      </div>
    </div>
  )
}

export function AdminLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  // Badge chuông — số thông báo chưa đọc từ `GET /api/notifications`
  // (`meta.unread_count`). Đọc trực tiếp API, không qua mock store.


  // ── Lắng nghe event "auth expired" từ axios interceptor ──────────────
  // Khi backend trả 401 ở bất kỳ request nào → axios interceptor sẽ
  // clear token và dispatch `mcms:auth-expired`. Ta clear store + về /login.
  useEffect(() => {
    const handler = () => {
      logout()
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true })
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler)
  }, [logout, navigate, location.pathname])

  const selectedMenuKey = getSelectedMenuKey(location.pathname)
  const pageTitle =
    location.pathname.startsWith('/devices/history')
      ? 'Lịch sử Telemetry IoT'
      : import.meta.env.DEV && location.pathname.startsWith('/dev/style-guide')
        ? 'Cẩm nang giao diện (dev)'
        : PAGE_TITLES[selectedMenuKey]

  // ── Vai trò hiện tại (đọc từ Zustand auth store) ─────────────────────
  // Dùng để ẩn các mục menu chỉ dành cho ADMIN (Tài khoản, Cài đặt,
  // Sự cố, Thu hoạch, Camera) khi user là OPERATOR.
  const currentRole = resolveUserRole(user)
  const isAdmin = currentRole === 'ADMIN'
  const roleLabel = currentRole
    ? (ROLE_LABELS[currentRole] ?? currentRole)
    : 'Thành viên'

  const menuItems = useMemo(() => buildMenuItems(isAdmin), [isAdmin])

  // User.fullName là field mới (chuẩn hoá) — fallback an toàn nếu BE chưa trả
  const displayName = user?.fullName ?? 'Quản trị viên MCMS'
  const displayEmail = user?.email ?? 'admin@mcms.vn'

  const initials =
    displayName
      .split(' ')
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() ?? 'MC'

  const accountItems: MenuProps['items'] = [
    {
      key: 'account',
      disabled: true,
      label: (
        <div className="account-menu-copy">
          <strong>{displayName}</strong>
          <span>{displayEmail}</span>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: 'Đổi mật khẩu',
    },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleAccountMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout()
      return
    }
    if (key === 'change-password') {
      navigate('/change-password')
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Chuyển đến nội dung chính
      </a>
      <Layout className="mcms-app-shell">
        <Sider
          className="mcms-sider"
          width={272}
          breakpoint="lg"
          collapsedWidth={0}
          trigger={null}
        >
          <NavigationPanel
            selectedKey={selectedMenuKey}
            onNavigate={navigate}
            items={menuItems}
          />
        </Sider>

        <Drawer
          className="mobile-nav-drawer"
          placement="left"
          size={284}
          open={isNavigationOpen}
          closable={false}
          styles={{ body: { padding: 0 } }}
          onClose={() => setIsNavigationOpen(false)}
        >
          <NavigationPanel
            selectedKey={selectedMenuKey}
            onNavigate={navigate}
            onClose={() => setIsNavigationOpen(false)}
            items={menuItems}
          />
        </Drawer>

        <Layout className="mcms-main-layout">
          <Header className="mcms-header">
            <div className="header-leading">
              <Button
                type="text"
                className="mobile-menu-trigger"
                icon={<MenuOutlined />}
                aria-label="Mở menu điều hướng"
                onClick={() => setIsNavigationOpen(true)}
              />
              <div className="header-title-block">
                <span>MCMS ADMIN</span>
                <Typography.Title level={4}>{pageTitle}</Typography.Title>
              </div>
            </div>

            <div className="header-actions">
              <div className="header-online-status" role="status">
                <span className="status-pulse" style={{ background: 'var(--mcms-text-muted)' }} aria-hidden="true" />
                Bảng điều khiển MCMS
              </div>
              <NotificationBell />
              <Dropdown
                trigger={['click']}
                menu={{
                  items: accountItems,
                  onClick: handleAccountMenuClick,
                }}
              >
                <Button
                  type="text"
                  className="account-trigger"
                  aria-label="Mở menu tài khoản"
                >
                  <Avatar className="account-avatar">{initials}</Avatar>
                  <span className="account-trigger-copy">
                    <strong>{displayName}</strong>
                    <small>{roleLabel}</small>
                  </span>
                </Button>
              </Dropdown>
            </div>
          </Header>

          <Content className="mcms-content">
            <main
              id="main-content"
              className="admin-content-inner page-enter"
              key={location.pathname}
              tabIndex={-1}
            >
              <Outlet />
            </main>
          </Content>
        </Layout>
      </Layout>
    </>
  )
}
