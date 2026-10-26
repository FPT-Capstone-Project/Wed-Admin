import { lazy } from 'react'

// ──────────────────────────────────────────────────────────────────────────
// Route-level code splitting: mỗi page là một chunk riêng, chỉ tải khi user
// truy cận. Giúp giảm Initial JS payload từ ~2MB xuống ~400-500KB.
//
// ⚠ Tách riêng khỏi `index.tsx` vì rule
//   `react-refresh/only-export-components` yêu cầu file chỉ export
//   component. File này chỉ export hằng lazy component → không phải
//   component thật → để riêng giúp HMR hoạt động đúng.
// ──────────────────────────────────────────────────────────────────────────

export const ForgotPasswordPage = lazy(() =>
  import('../../features/auth/pages/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
)
export const ChangePasswordPage = lazy(() =>
  import('../../features/auth/pages/ChangePasswordPage').then((m) => ({
    default: m.ChangePasswordPage,
  })),
)

export const DashboardPage = lazy(() =>
  import('../../features/dashboard/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
)
export const RoomListPage = lazy(() =>
  import('../../features/rooms/pages/RoomListPage').then((m) => ({
    default: m.RoomListPage,
  })),
)
export const TenantListPage = lazy(() =>
  import('../../features/tenants/pages/TenantListPage').then((m) => ({
    default: m.TenantListPage,
  })),
)
export const CameraOverviewPage = lazy(() =>
  import('../../pages/camera/CameraOverviewPage').then((m) => ({
    default: m.CameraOverviewPage,
  })),
)
export const DeviceManagementPage = lazy(() =>
  import('../../pages/devices/DeviceManagementPage').then((m) => ({
    default: m.DeviceManagementPage,
  })),
)
export const IoTHistoryPage = lazy(() =>
  import('../../pages/devices/IoTHistoryPage').then((m) => ({
    default: m.IoTHistoryPage,
  })),
)
export const OrderManagementPage = lazy(() =>
  import('../../pages/orders/OrderManagementPage').then((m) => ({
    default: m.OrderManagementPage,
  })),
)
export const RentalListPage = lazy(() =>
  import('../../features/rentals/pages/RentalListPage').then((m) => ({
    default: m.RentalListPage,
  })),
)
export const PackageManagementPage = lazy(() =>
  import('../../pages/packages/PackageManagementPage').then((m) => ({
    default: m.PackageManagementPage,
  })),
)
export const CultivationManagementPage = lazy(() =>
  import('../../pages/cultivation/CultivationManagementPage').then((m) => ({
    default: m.CultivationManagementPage,
  })),
)
export const AlertManagementPage = lazy(() =>
  import('../../pages/alerts/AlertManagementPage').then((m) => ({
    default: m.AlertManagementPage,
  })),
)
export const ReportsAnalyticsPage = lazy(() =>
  import('../../pages/reports/ReportsAnalyticsPage').then((m) => ({
    default: m.ReportsAnalyticsPage,
  })),
)
export const ReportsErrorBoundary = lazy(() =>
  import('../../pages/reports/components/ReportsErrorBoundary').then((m) => ({
    default: m.ReportsErrorBoundary,
  })),
)
export const UserManagementPage = lazy(() =>
  import('../../pages/users/UserManagementPage').then((m) => ({
    default: m.UserManagementPage,
  })),
)
export const SettingsPage = lazy(() =>
  import('../../pages/settings/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
)
export const StyleGuidePage = lazy(() =>
  import('../../pages/dev/StyleGuidePage').then((m) => ({
    default: m.StyleGuidePage,
  })),
)
