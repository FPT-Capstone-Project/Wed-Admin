import { Suspense, type ReactElement } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { AdminLayout } from '../layouts/AdminLayout'
import { AuthGuard } from './guards/AuthGuard'
import { RoleGuard } from '../../routes/RoleGuard'
import {
  ADMIN_AND_OPERATOR,
  ADMIN_ONLY,
} from '../../routes/access-policy'
import { PageFallback } from './PageFallback'
import { AppErrorBoundary } from '../../shared/ui/AppErrorBoundary'
import {
  IssueManagementPage,
  HarvestManagementPage,
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
  ReportsAnalyticsPage,
  ReportsErrorBoundary,
  RoomListPage,
  SessionListPage,
  SettingsPage,
  StyleGuidePage,
  UnauthorizedPage,
  UserManagementPage,
  NotificationsPage,
} from './lazy-pages'

/** Bọc một element với Suspense fallback (full-screen PageFallback). */
function withSuspense(node: ReactElement) {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<PageFallback />}>{node}</Suspense>
    </AppErrorBoundary>
  )
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
        {/*
          ⚠ Route CHA phải cho phép CẢ ADMIN lẫn OPERATOR.
          Trước đây route cha chỉ mở `['ADMIN']` ⇒ Farm Operator bị chặn
          ngay ở cổng vào dù các route con (devices, devices/history,
          sessions) đã cho phép OPERATOR ⇒ không bao giờ tới được.
          → Route con tự quyết định quyền (xem `RoleGuard` bên dưới).
        */}
        <RoleGuard
          allowedRoles={ADMIN_AND_OPERATOR}
          unauthorizedBehavior="inline"
        >
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      // ── ADMIN ONLY ────────────────────────────────────────────────────
      // Quản lý sự cố & bệnh hại (gán chuyên gia, đóng hồ sơ) — chỉ Admin.
      {
        path: 'issues',
        element: (
          <RoleGuard allowedRoles={ADMIN_ONLY}>
            {withSuspense(<IssueManagementPage />)}
          </RoleGuard>
        ),
      },
      // Quản lý thu hoạch — chỉ Admin.
      {
        path: 'harvests',
        element: (
          <RoleGuard allowedRoles={ADMIN_ONLY}>
            {withSuspense(<HarvestManagementPage />)}
          </RoleGuard>
        ),
      },
      // Quản lý tài khoản & phân quyền — chỉ Admin.
      {
        path: 'users',
        element: (
          <RoleGuard allowedRoles={ADMIN_ONLY}>
            {withSuspense(<UserManagementPage />)}
          </RoleGuard>
        ),
      },
      // Cài đặt hệ thống / hồ sơ vi khí hậu — chỉ Admin.
      {
        path: 'settings',
        element: (
          <RoleGuard allowedRoles={ADMIN_ONLY}>
            {withSuspense(<SettingsPage />)}
          </RoleGuard>
        ),
      },
      // Danh sách camera: BE `GET /api/cameras` yêu cầu `authorizeRoles(1)`
      // ⇒ OPERATOR sẽ nhận 403 từ BE ⇒ chặn sớm ở FE.
      {
        path: 'camera',
        element: (
          <RoleGuard allowedRoles={ADMIN_ONLY}>
            {withSuspense(<CameraOverviewPage />)}
          </RoleGuard>
        ),
      },
      // ── ADMIN + OPERATOR ─────────────────────────────────────────────
      {
        index: true,
        element: withSuspense(<DashboardPage />),
      },
      {
        path: 'dashboard',
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
          <RoleGuard allowedRoles={ADMIN_AND_OPERATOR}>
            {withSuspense(<DeviceManagementPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'devices/history',
        element: (
          <RoleGuard allowedRoles={ADMIN_AND_OPERATOR}>
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
        // Phiên canh tác: BE yêu cầu role_id 1 (Admin) hoặc 2 (Farm Operator).
        // Customer không được truy cập — RoleGuard chặn trước khi gọi API.
        path: 'sessions',
        element: (
          <RoleGuard allowedRoles={ADMIN_AND_OPERATOR}>
            {withSuspense(<SessionListPage />)}
          </RoleGuard>
        ),
      },
      {
        // Redirect cũ: `/rentals` → `/sessions` (đổi tên luồng "vụ thuê" →
        // "phiên canh tác").
        path: 'rentals',
        element: <Navigate to="/sessions" replace />,
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
        // Thông báo — đọc `GET /api/notifications` (chỉ đọc).
        path: 'notifications',
        element: withSuspense(<NotificationsPage />),
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
        // Yêu cầu token (bearerAuth) — nằm trong AuthGuard nên chỉ render
        // khi user đã đăng nhập.
        path: 'change-password',
        element: withSuspense(<ChangePasswordPage />),
      },
      {
        /**
         * 403 — user đã đăng nhập nhưng không đủ quyền truy cập trang được
         * yêu cầu (`RoleGuard` ở route con chuyển hướng tới đây).
         *
         * ⚠ Nằm trong route cha `/` ⇒ hiển thị **kèm sidebar + header** giữa
         *   lúc user đang đăng nhập ở khu vực quản trị (giữ nguyên ngữ cảnh
         *   điều hướng, không mất menu).
         *   Route cha dùng `unauthorizedBehavior="inline"` ⇒ CUSTOMER bị chặn
         *   ngay tại route cha (render 403 tại chỗ) ⇒ **không** có vòng lặp
         *   redirect vô hạn.
         */
        path: 'unauthorized',
        element: withSuspense(<UnauthorizedPage />),
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
