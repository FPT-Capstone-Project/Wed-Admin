import {
  AlertOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  CloseOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FundOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
  OrderedListOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Tooltip,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { AUTH_EXPIRED_EVENT } from '../../shared/api/client'
import { useAlertStore } from '../../stores/alert.store'

const { Content, Header, Sider } = Layout

const MENU_ITEMS: MenuProps['items'] = [
  {
    type: 'group',
    label: 'TỔNG QUAN',
    children: [
      {
        key: '/',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
    ],
  },
  {
    type: 'group',
    label: 'VẬN HÀNH TRANG TRẠI',
    children: [
      {
        key: '/rooms',
        icon: <AppstoreOutlined />,
        label: 'Quản lý khay',
      },
      {
        key: '/devices',
        icon: <ApiOutlined />,
        label: 'Thiết bị IoT',
      },
      {
        key: '/camera',
        icon: <VideoCameraOutlined />,
        label: 'Camera toàn cảnh',
      },
      {
        key: '/cultivation',
        icon: <FundOutlined />,
        label: 'Sinh trưởng & thu hoạch',
      },
      {
        key: '/alerts',
        icon: <AlertOutlined />,
        label: 'Cảnh báo vi khí hậu',
      },
      {
        key: '/reports',
        icon: <BarChartOutlined />,
        label: 'Báo cáo & phân tích',
      },
    ],
  },
  {
    type: 'group',
    label: 'QUẢN TRỊ',
    children: [
      {
        key: '/customers',
        icon: <UserOutlined />,
        label: 'Khách thuê',
      },
      {
        key: '/orders',
        icon: <OrderedListOutlined />,
        label: 'Đơn đặt từ App',
      },
      {
        key: '/rentals',
        icon: <FundOutlined />,
        label: 'Vụ thuê',
      },
      {
        key: '/packages',
        icon: <TagsOutlined />,
        label: 'Gói cước thuê',
      },
      {
        key: '/users',
        icon: <TeamOutlined />,
        label: 'Tài khoản',
      },
      {
        key: '/settings',
        icon: <ExperimentOutlined />,
        label: 'Hồ sơ Vi khí hậu',
      },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Tổng quan trang trại',
  '/rooms': 'Quản lý khay nấm',
  '/devices': 'Thiết bị IoT',
  '/camera': 'Camera toàn cảnh',
  '/cultivation': 'Sinh trưởng & thu hoạch',
  '/alerts': 'Cảnh báo vi khí hậu',
  '/reports': 'Báo cáo & phân tích',
  '/customers': 'Quản lý khách thuê',
  '/orders': 'Quản lý đơn đặt',
  '/rentals': 'Quản lý vụ thuê',
  '/packages': 'Gói cước thuê',
  '/users': 'Quản lý tài khoản',
  '/settings': 'Hồ sơ Vi khí hậu',
  '/change-password': 'Đổi mật khẩu',
}

function getSelectedMenuKey(pathname: string) {
  if (pathname.startsWith('/rooms') || pathname.startsWith('/trays')) {
    return '/rooms'
  }

  if (pathname.startsWith('/customers') || pathname.startsWith('/tenants')) {
    return '/customers'
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
      <img
        className="mcms-brand-mark"
        src="/mcms-mark.svg"
        alt=""
        width="42"
        height="42"
      />
      <div className="mcms-brand-copy">
        <strong>MCMS</strong>
        <span>Mushroom Control</span>
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
}

function NavigationPanel({
  selectedKey,
  onNavigate,
  onClose,
}: NavigationPanelProps) {
  return (
    <div className="sidebar-panel">
      <Brand onClose={onClose} />
      <Menu
        className="mcms-menu"
        mode="inline"
        items={MENU_ITEMS}
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
          <strong>Hệ thống ổn định</strong>
          <small>Đồng bộ dữ liệu IoT</small>
        </span>
        <span className="status-pulse" aria-hidden="true" />
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
  const pendingAlerts = useAlertStore(
    (state) => state.alerts.filter((alert) => !alert.isAcknowledged).length,
  )

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
                <span className="status-pulse" aria-hidden="true" />
                Hệ thống trực tuyến
              </div>
              <Tooltip title="Xem cảnh báo">
                <Badge count={pendingAlerts} size="small" overflowCount={99}>
                  <Button
                    type="text"
                    className="header-icon-button"
                    icon={<BellOutlined />}
                    aria-label={`${pendingAlerts} cảnh báo đang chờ xử lý`}
                    onClick={() => navigate('/alerts')}
                  />
                </Badge>
              </Tooltip>
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
                    <small>Quản trị hệ thống</small>
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