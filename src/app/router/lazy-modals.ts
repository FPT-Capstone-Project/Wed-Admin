import { lazy } from 'react'

// ──────────────────────────────────────────────────────────────────────────
// Lazy-load các **modal / drawer** nặng — thứ ít khi mở.
//
// ⚠ Vì sao cần?
//   Modal/Drawer thường được import **tĩnh** (static import) trong page
//   cha ⇒ mọi dependency của nó (AntD `Modal`, `Drawer`, `Descriptions`,
//   biểu đồ, SDK…) nằm trong **static graph** của page ⇒ bị tải ngay khi
//   user mở trang, dù modal chưa từng được bấm.
//
//   → Chuyển sang `lazy()` ⇒ code của modal chỉ tải khi modal thực sự
//     mở lần đầu. Giảm rõ ràng bytes tải lần đầu cho từng trang.
//
// ⚠ Tách riêng khỏi `lazy-pages.ts` vì rule
//   `react-refresh/only-export-components` yêu cầu file chỉ export
//   component. File này chỉ export hằng lazy component → không phải
//   component thật → để riêng giúp HMR hoạt động đúng.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Modal xem luồng camera live (ImouPlayer SDK).
 *
 * ⚠ Nặng: kéo theo `antd` Modal/Radio/Spin + SDK Imou (Wasm) + hook token.
 * ⚠ Chỉ nạp khi user bấm nút "Xem live" ở trang Camera hoặc trang Thiết bị.
 */
export const CameraStreamModal = lazy(() =>
  import('../../features/cameras/components/CameraStreamModal').then((m) => ({
    default: m.CameraStreamModal,
  })),
)

/**
 * Drawer chi tiết khay (trang "Phòng nuôi").
 *
 * ⚠ Nặng: kéo theo `Descriptions`, `Timeline` các component của khay,
 *   hook session + spawn inspection.
 */
export const TrayDetailDrawer = lazy(() =>
  import('../../features/rooms/components/TrayDetailDrawer').then((m) => ({
    default: m.TrayDetailDrawer,
  })),
)

/**
 * Drawer chi tiết phiên canh tác (trang "Phiên canh tác").
 */
export const SessionDetailDrawer = lazy(() =>
  import('../../features/sessions/components/SessionDetailDrawer').then((m) => ({
    default: m.SessionDetailDrawer,
  })),
)

/**
 * Drawer chi tiết hồ sơ sự cố / bệnh hại (trang "Quản lý sự cố").
 */
export const IssueDetailDrawer = lazy(() =>
  import('../../features/disease-management/components/IssueDetailDrawer').then(
    (m) => ({ default: m.IssueDetailDrawer }),
  ),
)

/**
 * Drawer chi tiết lô thu hoạch (trang "Quản lý thu hoạch").
 */
export const HarvestDetailDrawer = lazy(() =>
  import('../../features/harvest/components/HarvestDetailDrawer').then((m) => ({
    default: m.HarvestDetailDrawer,
  })),
)

/**
 * Drawer chi tiết người dùng (trang "Quản lý người dùng").
 *
 * ⚠ Kéo theo modal con `SendResetOtpModal` (xem bên trong).
 */
export const UserDetailDrawer = lazy(() =>
  import('../../pages/users/components/UserDetailDrawer').then((m) => ({
    default: m.UserDetailDrawer,
  })),
)

/**
 * Gallery ảnh lô canh tác (trang "Quản lý canh tác").
 */
export const CultivationGalleryModal = lazy(() =>
  import('../../features/cultivation/components/CultivationGalleryModal').then(
    (m) => ({ default: m.CultivationGalleryModal }),
  ),
)

/**
 * Modal chi tiết cấu hình tự động (trang "Quản lý thiết bị").
 */
export const AutoControlDetailModal = lazy(() =>
  import('../../pages/devices/components/AutoControlDetailModal').then((m) => ({
    default: m.AutoControlDetailModal,
  })),
)

/**
 * Modal xuất báo cáo (trang "Báo cáo & Phân tích").
 */
export const ExportReportModal = lazy(() =>
  import('../../pages/reports/components/ExportReportModal').then((m) => ({
    default: m.ExportReportModal,
  })),
)
