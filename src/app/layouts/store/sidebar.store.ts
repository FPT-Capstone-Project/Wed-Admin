/**
 * Store sidebar — trạng thái thu gọn / mở rộng.
 *
 * ⚠ Vì sao cần store riêng (không dùng `useState` trong `AdminLayout`)?
 *   - `AdminLayout` re-render **mọi lần** đổi route ⇒ `useState` ở đó dễ
 *     bị reset nếu không cẩn thận.
 *   - `Sider` của antd **tự quản lý** trạng thái `collapsed` khi có
 *     `collapsedWidth` ⇒ cần đồng bộ 2 chiều (DOM ⇄ store).
 *
 * ⚠ Lưu `localStorage` ⇒ lựa chọn của user **giữ nguyên** sau khi F5.
 */
import { create } from 'zustand'

/** Bề rộng sidebar khi thu gọn (chỉ còn icon). */
export const SIDEBAR_COLLAPSED_WIDTH = 72

/** Bề rộng sidebar khi mở rộng. */
export const SIDEBAR_EXPANDED_WIDTH = 272

/**
 * Ngưỡng viewport (px CSS) mà sidebar **tự động thu gọn**.
 *
 * ⚠ 1550px: ở ngưỡng này, vùng nội dung còn ≈ 1550 − 272 − padding ≈ 1220px
 *   ⇒ đủ cho bảng 8 cột. Dưới ngưỡng này bảng bắt đầu tràn ⇒ thu gọn
 *   sidebar giải phóng 200px ⇒ bảng vừa khít mà **không** cần cuộn ngang.
 *
 * ⚠ Đây là **CSS px**, không phải device pixel ⇒ đã tính cả Windows
 *   Scale 125%–150% (trình duyệt tự chia).
 */
export const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT = 1550

/** Key lưu trạng thái trong `localStorage`. */
const STORAGE_KEY = 'mcms.sidebar.collapsed'

function readStoredPreference(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    // localStorage bị chặn (private mode / CSP) ⇒ bỏ qua.
    return null
  }
}

function writeStoredPreference(collapsed: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed))
  } catch {
    // Bỏ qua — trạng thái chỉ mất sau khi đóng tab.
  }
}

/** Viewport có hẹp hơn ngưỡng auto-collapse không? */
function isViewportNarrow(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT
}

/**
 * Đọc lựa chọn đã lưu + trạng thái khởi tạo.
 *
 * ⚠ Ưu tiên lựa chọn của user; nếu chưa có ⇒ theo viewport hiện tại.
 */
function createInitialState(): { userPreference: boolean | null; collapsed: boolean } {
  const preference = readStoredPreference()
  return {
    userPreference: preference,
    collapsed: preference ?? isViewportNarrow(),
  }
}

interface SidebarState {
  /**
   * Lựa chọn **của user** (đã bấm nút toggle) — `null` = chưa chọn.
   *
   * ⚠ Khi khác `null`, viewport **không** được tự động ghi đè ⇒ không cướp
   *   quyền quyết định của user.
   */
  userPreference: boolean | null
  /** Trạng thái thu gọn **đang áp dụng**. */
  collapsed: boolean
  /** Bật/tắt thu gọn (ghi `localStorage`). */
  toggle: () => void
  /** Đặt trạng thái cụ thể (ghi `localStorage`). */
  setCollapsed: (collapsed: boolean) => void
  /** Đồng bộ theo viewport — chỉ có tác dụng khi user chưa tự chọn. */
  syncWithViewport: (viewportWidth: number) => void
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  ...createInitialState(),

  setCollapsed: (collapsed) => {
    writeStoredPreference(collapsed)
    set({ userPreference: collapsed, collapsed })
  },

  toggle: () => {
    const next = !get().collapsed
    writeStoredPreference(next)
    set({ userPreference: next, collapsed: next })
  },

  syncWithViewport: (viewportWidth) => {
    // ⚠ Chỉ auto-collapse khi user **chưa** tự chọn.
    if (get().userPreference !== null) return
    set({ collapsed: viewportWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT })
  },
}))
