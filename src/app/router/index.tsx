import { Suspense, type ReactElement } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { AdminLayout } from '../layouts/AdminLayout'
import { AuthGuard } from './guards/AuthGuard'
import { RoleGuard } from '../../routes/RoleGuard'
import { PageFallback } from './PageFallback'
import {
  AlertManagementPage,
  CameraOverviewPage,
  ChangePasswordPage,
  CultivationManagementPage,
  DashboardPage,
  DeviceManagementPage,
  ForgotPasswordPage,
  IoTHistoryPage,
  OrderManagementPage,
  PackageManagementPage,
  RentalListPage,
  ReportsAnalyticsPage,
  ReportsErrorBoundary,
  RoomListPage,
  SettingsPage,
  StyleGuidePage,
  UserManagementPage,
} from './lazy-pages'

/** Bọc một element với Suspense fallback (full-screen PageFallback). */
function withSuspense(node: ReactElement) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/forgot-password',
    element: withSuspense(<ForgotPasswordPage />),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: withSuspense(<DashboardPage />),
      },
      {
        path: 'rooms',
        element: withSuspense(<RoomListPage />),
      },
      {
        path: 'rooms/:id',
        element: withSuspense(<RoomListPage />),
      },
      {
        path: 'trays',
        element: <Navigate to="/rooms" replace />,
      },
      {
        path: 'devices',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'OPERATOR']}>
            {withSuspense(<DeviceManagementPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'devices/history',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'OPERATOR']}>
            {withSuspense(<IoTHistoryPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'packages',
        element: withSuspense(<PackageManagementPage />),
      },
      {
        path: 'orders',
        element: withSuspense(<OrderManagementPage />),
      },
      {
        // Vụ thuê: BE yêu cầu role_id 1 (Admin) hoặc 2 (Farm Operator).
        // Customer không được truy cập — RoleGuard chặn trước khi gọi API.
        path: 'rentals',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'OPERATOR']}>
            {withSuspense(<RentalListPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'cultivation',
        element: withSuspense(<CultivationManagementPage />),
      },
      {
        path: 'alerts',
        element: withSuspense(<AlertManagementPage />),
      },
      {
        path: 'reports',
        element: withSuspense(
          <ReportsErrorBoundary moduleName="Báo cáo & Phân tích">
            <ReportsAnalyticsPage />
          </ReportsErrorBoundary>,
        ),
      },
      {
        path: 'camera',
        element: withSuspense(<CameraOverviewPage />),
      },
      {
        path: 'users',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<UserManagementPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: withSuspense(<SettingsPage />),
      },
      {
        // Yêu cầu token (bearerAuth) — nằm trong AuthGuard nên chỉ render
        // khi user đã đăng nhập.
        path: 'change-password',
        element: withSuspense(<ChangePasswordPage />),
      },
      // ──────────────────────────────────────────────────────────────────────
      // Cẩm nang giao diện — CHỈ có ở môi trường dev.
      // ⚠ `import.meta.env.DEV` là false ở build production → route bị Vite
      // loại bỏ hoàn toàn khỏi bundle (dead-code elimination).
      ...(import.meta.env.DEV
        ? [
            {
              path: 'dev/style-guide',
              element: withSuspense(<StyleGuidePage />),
            },
          ]
        : []),
      // 404: redirect tất cả URL không khớp về dashboard
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
