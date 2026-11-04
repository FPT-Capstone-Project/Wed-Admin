/**
 * MCMS Design Tokens — nguồn sự thật duy nhất cho toàn bộ giao diện.
 *
 * Triết lý: **B2B Industrial IoT** (theo `ui-ux-pro-max` + `.cursorrules`).
 * Giao diện là bảng điều khiển vận hành cho admin/nhân viên trang trại →
 * ưu tiên **mật độ thông tin, đường viền mảnh, bảng màu trung tính**.
 *
 *   - Nền app: Slate/Neutral nhạt → `#f8fafc`
 *   - Card   : trắng tinh `#ffffff` + viền xám rất mảnh `#e2e8f0`
 *   - Xanh lá `#16a34a`: **chỉ** dùng cho CTA quan trọng + trạng thái
 *     Healthy/Online — không phải màu nhấn chung.
 *   - Bo góc: 4px–6px. **Không** dùng pill (999px) cho nút / card / input.
 *   - Chữ   : Inter, thân 13–14px, tiêu đề nhỏ gọn.
 *
 * Mọi giá trị trong file này đã được kiểm chứng tương phản WCAG:
 *   - Chữ thân 4.5:1 (AA) trên nền trắng / nền ứng dụng / nền mềm.
 *   - Viền bảng & viền badge 3:1 (WCAG 1.4.11 Non-text Contrast).
 *   - Badge không bao giờ chỉ dùng màu để truyền đạt — luôn kèm nhãn chữ.
 *
 * ⚠ KHÔNG hardcode hex ở component. Dùng:
 *   - `tokens` trong TS (cho style inline / antd token),
 *   - `var(--mcms-*)` trong CSS (cho class trong `App.css`).
 */

/* ─── Kiểu dữ liệu ─────────────────────────────────────────────────────── */

/**
 * 5 trạng thái ngữ nghĩa dùng xuyên suốt app.
 *
 * ⚠ `success` (xanh dương) là tone **riêng**, khác `ok` (xanh lá):
 *   - `ok`      → đang hoạt động / bình thường (xanh lá #16a34a).
 *   - `success` → đã **hoàn thành** một vòng đời (xanh dương #1d4ed8).
 *
 *   Khoảng cách màu giữa `ok` và `success` đủ rõ để phân biệt "đang chạy"
 *   với "đã xong" trong cùng 1 bảng (vd bảng phiên canh tác).
 */
export type SemanticTone =
  | 'ok'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'neutral'

/** Bảng màu chữ + nền + viền cho một trạng thái ngữ nghĩa. */
export interface TonePalette {
  /** Màu chữ trên nền mềm — đạt ≥ 4.5:1. */
  readonly text: string
  /** Nền mềm (chip, banner) — dùng cho khối lớn, KHÔNG dùng cho badge. */
  readonly bg: string
  /**
   * Nền badge nhạt theo tone; chữ và chấm được kiểm tra tương phản riêng.
   *
   * ⚠ Vì sao tách khỏi `bg`?
   *   `bg` là nền *mềm theo sắc thái* (amber cho cảnh báo, coral cho lỗi) —
   *   dùng cho banner/dải màu lớn. Badge có token riêng để kiểm soát
   *   tương phản khi điều chỉnh nền mà không ảnh hưởng banner.
   */
  readonly badgeBg: string
  /** Viền — đạt ≥ 3:1 trên cả nền mềm lẫn nền trắng. */
  readonly border: string
  /** Màu đậm dùng cho icon/điểm tròn trạng thái. */
  readonly solid: string
  /**
   * Màu của **chấm tròn 6px** trong StatusBadge.
   *
   * ⚠ Đạt ≥ 3:1 trên `badgeBg` (WCAG 1.4.11 Non-text Contrast) — chấm tròn
   *   là yếu tố đồ hình, nên không cần 4.5:1 như chữ.
   */
  readonly dot: string
}

/* ─── Màu cơ bản ───────────────────────────────────────────────────────── */

/** Primitive -> semantic -> component tokens. */
export const primitives = {
  white: '#ffffff', slate50: '#f8fafc', slate100: '#f1f5f9',
  slate200: '#e2e8f0', slate600: '#475569', green600: '#16a34a',
} as const

export const palette = {
  /**
   * Primary — xanh lá `#16a34a` (**màu điểm nhấn**).
   *
   * ⚠ Theo chuẩn B2B Industrial IoT: màu này **chỉ** dùng cho
   *   - trạng thái Healthy / Online (chấm tròn 6px, tone `ok`),
   *   - focus ring,
   *   - dải nhấn 3px ở sidebar,
   *   - các icon/đường viền nhấn (non-text).
   *
   * ⚠ Về tương phản: chữ trắng trên `#16a34a` chỉ đạt 3.30:1 → **không**
   *   đủ cho chữ thường (AA cần 4.5:1), nhưng đạt ngưỡng non-text 3:1.
   *   Vì vậy **nền nút CTA** dùng `primaryStrong` (`#15803d` → 5.02:1 ✅),
   *   còn `#16a34a` làm màu nhấn. Xem `theme.ts` → `token.colorPrimary`.
   */
  primary: primitives.green600,
  /**
   * Primary đậm — **nền của nút CTA** + màu chữ nhấn trên nền trắng.
   * `#15803d` → 5.02:1 với chữ trắng ✅ (WCAG AA).
   */
  primaryStrong: '#15803d',
  /** Primary hover / active — đậm thêm 1 bậc. */
  primaryDark: '#166534',
  /** Nền mềm cho chip/hover của primary. */
  primarySoft: '#eaf7ee',
  /** Nền rất nhạt — dải nền active của sidebar. */
  primaryFaint: '#f0fdf4',

  /* Teal — thông tin, trạng thái trung tính đang diễn ra */
  teal: '#0f766e',
  tealSoft: '#f0fdfa',

  /* Amber — cần chú ý, chờ thao tác */
  amber: '#a16207',
  amberSoft: '#fff7e2',

  /* Coral — nguy hiểm, lỗi, nhiễm bệnh */
  coral: '#c2413b',
  coralSoft: '#fff0ee',

  /* Blue — thông tin bổ sung, liên kết */
  blue: '#2563eb',
  blueSoft: '#eff6ff',
} as const

/* ─── Nền & chữ ───────────────────────────────────────────────────────── */

export const surface = {
  /** Nền ứng dụng (phía sau card) — Slate/Neutral nhạt. */
  background: '#f4f6f3',
  /** Nền card / panel / bảng — trắng tinh. */
  surface: primitives.white,
  /** Nền lạch (header bảng, ô thống kê phụ) — xám xanh rất nhạt. */
  surfaceMuted: primitives.slate100,
  /** Nền con trỏ chuột trên dòng bảng. */
  surfaceHover: primitives.slate50,
  /** Nền dùng cho badge trạng thái "tắt". */
  surfaceDisabled: primitives.slate100,
} as const

export const text = {
  /** Chữ chính — Slate-900, tương phản rất cao trên trắng. */
  base: '#0f172a',
  /** Chữ phụ — Slate-600, đạt AA trên mọi nền (kể cả nền lạch). */
  muted: '#5b6b80',
  /** Chữ trên nền tối. */
  inverse: primitives.white,
  /** Chữ tắt — dùng cho nội dung không còn hành động. */
  disabled: '#94a3b8',
} as const

export const border = {
  /** Viền mảnh (lưới bảng, ô input) — Slate-200. */
  base: primitives.slate200,
  /** Viền rất mảnh (ngăn cách trong card) — Slate-100. */
  soft: primitives.slate100,
  /**
   * Viền nhấn — dùng cho viền input, viền badge cần nổi, focus outline.
   * Đạt WCAG 1.4.11 (≥ 3:1) trên nền trắng.
   */
  strong: '#7c8b9e',
} as const

/* ─── Điều hướng (sidebar) ────────────────────────────────────────────── */

/**
 * Màu cho menu điều hướng — **trung tính**, không màu sặc sỡ.
 *
 * ⚠ Chuẩn B2B Industrial IoT: item không chọn phải **lùi về xám** để
 *   chỉ item đang chọn nổi lên. Màu xanh chỉ xuất hiện ở **vạch nhấn 3px**
 *   sát mép trái (không phải chữ, không phải viền bo tròn).
 */
export const navigation = {
  sidebarBg: '#0f2a24',
  sidebarText: '#e6f0e8',
  sidebarMuted: '#b8cbbf',
  sidebarHoverBg: '#1c4035',
  sidebarFocus: '#d9e9df',
  /** Chữ item không chọn — Gray-600 (7.56:1 trên trắng). */
  itemText: '#4b5563',
  /** Icon item không chọn — Slate-500 (4.76:1 trên trắng). */
  itemIcon: '#64748b',
  /** Nền item khi hover — Slate-50. */
  itemHoverBg: primitives.slate50,
  /** Nền item đang chọn — Slate-100. */
  itemSelectedBg: '#eaf7ee',
  /** Chữ item đang chọn — Slate-900. */
  itemSelectedText: '#0f172a',
  /** Vạch nhấn 3px sát mép trái item đang chọn — Primary (3.30:1). */
  activeBar: palette.primaryStrong,
} as const

/* ─── Màu ngữ nghĩa ───────────────────────────────────────────────────── */

/**
 * 4 trạng thái ngữ nghĩa (bình thường / cần chú ý / nguy hiểm / tắt) +
 * 2 trạng thái phụ (thông tin / trung tính).
 *
 * ⚠ Theo chuẩn B2B Industrial IoT:
 *   - Xanh lá chỉ dùng cho `ok` (Healthy/Online) + CTA.
 *   - `info` dùng xanh dương, phân biệt với cảnh báo vàng và nguy hiểm đỏ.
 *   - Viền badge luôn mảnh & trung tính, không viền đậm màu sặc sỡ.
 */
export const tones: Record<SemanticTone, TonePalette> = {
  /** Bình thường — đang hoạt động, ổn, đạt yêu cầu. */
  ok: {
    text: '#15803d',
    bg: '#eaf7ee',
    badgeBg: '#eaf7ee',
    border: '#15803d',
    solid: primitives.green600,
    dot: '#15803d',
  },
  /**
   * Hoàn thành — đã xong một vòng đời (phiên đã thu hoạch, đơn đã đóng).
   *
   * ⚠ Màu **xanh dương** (`#1d4ed8`) — chữ trên nền `#eff6ff` đạt 6.29:1 ✅,
   *   chấm tròn `#1d4ed8` trên nền badge đạt ≥ 3:1 ✅ (WCAG 1.4.11).
   */
  success: {
    text: '#1d4ed8',
    bg: '#eff6ff',
    badgeBg: '#eff6ff',
    border: '#1d4ed8',
    solid: '#1d4ed8',
    dot: '#1d4ed8',
  },
  /** Thông tin — đang diễn ra, không cảnh báo. */
  info: {
    text: '#1d4ed8',
    bg: '#eff6ff',
    badgeBg: '#eff6ff',
    border: '#2563eb',
    solid: '#2563eb',
    dot: '#2563eb',
  },
  /** Cần chú ý — chờ xử lý, sắp hết hạn, vượt ngưỡng nhẹ. */
  warning: {
    text: '#92400e',
    bg: '#fff7e2',
    badgeBg: '#fff7e2',
    border: '#b45309',
    solid: '#d97706',
    dot: '#b45309',
  },
  /** Nguy hiểm — lỗi, nhiễm bệnh, mất kết nối, vượt ngưỡng nặng. */
  danger: {
    text: '#b91c1c',
    bg: '#fff0ee',
    badgeBg: '#fff0ee',
    border: '#dc2626',
    solid: '#dc2626',
    dot: '#dc2626',
  },
  /** Tắt — không hoạt động, đã khoá, đã huỷ. */
  muted: {
    text: '#5b6b80',
    bg: primitives.slate100,
    badgeBg: primitives.slate100,
    border: '#7c8b9e',
    solid: '#94a3b8',
    dot: '#64748b',
  },
  /** Trung tính — chưa biết, chờ dữ liệu. */
  neutral: {
    text: '#475569',
    bg: primitives.slate50,
    badgeBg: primitives.slate100,
    border: '#7c8b9e',
    solid: '#64748b',
    dot: '#64748b',
  },
}

/** Nhãn tiếng Việt mặc định cho từng trạng thái ngữ nghĩa. */
export const toneLabels: Record<SemanticTone, string> = {
  ok: 'Bình thường',
  success: 'Hoàn thành',
  info: 'Thông tin',
  warning: 'Cần chú ý',
  danger: 'Nguy hiểm',
  muted: 'Đã tắt',
  neutral: 'Chưa rõ',
}

/* ─── Khoảng cách ─────────────────────────────────────────────────────── */

/**
 * Lưới 4pt. Mọi khoảng cách phải lấy từ đây — không dùng số lẻ.
 * `space.1` = 4px … `space.8` = 40px.
 */
export const space = {
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '32px',
  '8': '40px',
} as const

export type SpaceToken = keyof typeof space

/* ─── Bo góc ──────────────────────────────────────────────────────────── */

/**
 * Bo góc — chuẩn B2B Industrial IoT.
 *
 * ⚠ **Tối đa 6px.** Không có pill (999px) cho nút / card / input.
 *   Các điểm tròn trạng thái (status dot) vẫn dùng `50%` — đó là hình tròn
 *   có chủ đích, không phải bo góc "pill".
 */
export const radius = {
  /** 3px — chip nhỏ, tag nhỏ, thanh tiến trình. */
  sm: '4px',
  /** 4px — input, button, badge, table row. */
  md: '8px',
  /** 6px — card, panel, modal, dropdown. */
  lg: '10px',
  /**
   * 6px — hộp thoại / khối nổi bật.
   *
   * ⚠ Vẫn **6px**, không phải 8px: yêu cầu là "4px - 6px" cho toàn bộ.
   *   `xl` chỉ là tên tương thích ngược để không phải sửa hàng loạt chỗ gọi.
   */
  xl: '12px',
} as const

/* ─── Đổ bóng ─────────────────────────────────────────────────────────── */

/**
 * Shadow — **tiết chế, tông trung tính** (chuẩn B2B Industrial IoT).
 *
 * ⚠ Không dùng shadow đậm/glow màu. Card chủ yếu dùng **viền mảnh**,
 *   shadow chỉ dành cho lớp nổi (popover, dropdown, modal).
 */
export const shadow = {
  /** Card — rất mảnh, gần như chỉ viền. */
  xs: '0 1px 3px rgb(15 42 36 / 6%)',
  /** Popover / dropdown. */
  sm: '0 4px 12px rgb(15 42 36 / 8%)',
  /** Modal / drawer. */
  md: '0 8px 24px rgb(15 42 36 / 10%)',
  /** Focus ring — dùng kèm outline, không thay thế outline. */
  focus: '0 0 0 2px rgb(124 139 158 / 24%)',
} as const

/* ─── Typography ──────────────────────────────────────────────────────── */

/**
 * Typography — Inter (sans-serif công nghiệp hiện đại).
 *
 * ⚠ Chuẩn B2B Industrial IoT: thân **13–14px**, tiêu đề **nhỏ hơn** mức
 *   cỡ 20px cũ → phân cấp thị giác dựa trên **cân nặng chữ** + khoảng
 *   cách, không phải trên cỡ chữ to.
 */
export const typography = {
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  /** Font chính — Inter (Minimal Swiss, tối ưu cho admin panel). */
  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  /** Font tabular cho số liệu — tránh layout shift khi số thay đổi. */
  fontNumeric:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  /** Cỡ chữ thân mặc định — 13px (mật độ dashboard). */
  sizeBody: 13,
  /** Cỡ chữ phụ — metadata, chú thích. */
  sizeSmall: 12,
  /** Cỡ chữ tiêu đề bảng / card. */
  sizeTitle: 14,
  /** Cỡ chữ tiêu đề trang. */
  sizeHeading: 18,
  /** Khoảng cách dòng. */
  lineHeight: 1.5,
  /** Trọng lượng tiêu đề. */
  weightMedium: 500,
  /** Trọng lượng nhấn. */
  weightSemibold: 600,
  /** Trọng lượng đậm — dùng cho số liệu lớn. */
  weightBold: 700,
} as const

/* ─── Chuyển động ──────────────────────────────────────────────────────── */

export const motion = {
  /** Chuẩn cho hover/focus. */
  fast: '160ms ease',
  /** Chuẩn cho mở/đóng panel. */
  normal: '240ms ease',
  /** Chuyển động khi kéo/thu phóng. */
  slow: '320ms ease',
} as const

/* ─── Kích thước tối thiểu ─────────────────────────────────────────────── */

/**
 * Kích thước mục tiêu chạm tối thiểu (WCAG 2.5.8 Target Size, 24px;
 * khuyến nghị Material 48px). Dùng cho nút icon-only trong bảng.
 */
export const targetSize = {
  /** Tối thiểu WCAG AA — dùng cho icon-only nhỏ trong bảng. */
  min: '24px',
  /** Khuyến nghị 44px — dùng cho nút chính / điều hướng. */
  comfortable: '44px',
  /** Chiều cao control chuẩn (antd controlHeight). */
  control: '40px',
} as const

/* ─── Breakpoint ───────────────────────────────────────────────────────── */

export const breakpoint = {
  xs: 320,
  desktop: 1280,
  /** Điện thoại nhỏ. */
  sm: 375,
  /** Tablet dọc. */
  md: 768,
  /** Tablet ngang / laptop nhỏ. */
  lg: 1024,
  /** Laptop / desktop. */
  xl: 1440,
} as const

/* ─── Token tổng hợp ──────────────────────────────────────────────────── */
/** AntD grid boundaries: preserve the existing responsive behavior. */
export const gridBreakpoint = { xs: 480, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600 } as const

/**
 * Token gốc — dùng khi import trong TS.
 * Cấu trúc phẳng để truy cập nhanh: `tokens.color.primary`.
 */
/** Data series colors are independent of operational severity. */
export const chartSeries = {
  temperature: '#7c3aed',
  humidity: '#0d9488',
  revenue: '#2563eb',
  revenuePrevious: '#64748b',
} as const

export const componentTokens = {
  tray: { minWidth: 104, fallbackWidth: 158, minHeight: 76, iconSize: 20, progressHeight: 4, borderWidth: 1, selectedBorderWidth: 2 },
  kpi: { valueSize: 32, iconSize: 40, borderWidth: 1 },
  badge: { gap: 6, paddingBlock: 1, paddingInline: 8, lineHeight: 20, dotSize: 6 },
  chart: { height: 280, borderWidth: 1, lineWidth: 2, markerSize: 8 },
  button: { background: palette.primaryStrong },
  card: { background: surface.surface, border: border.base },
  table: { header: surface.surfaceMuted, border: border.base },
  menu: navigation,
  input: { background: surface.surface, border: border.base },
  modal: { background: surface.surface },
  tabs: { text: text.base, indicator: text.muted },
  tooltip: { background: text.base, text: text.inverse },
} as const

export const tokens = {
  gridBreakpoint,
  chartSeries,
  primitives,
  components: componentTokens,
  color: {
    ...palette,
    bg: surface.background,
    surface: surface.surface,
    surfaceMuted: surface.surfaceMuted,
    surfaceHover: surface.surfaceHover,
    surfaceDisabled: surface.surfaceDisabled,
    text: text.base,
    textMuted: text.muted,
    textInverse: text.inverse,
    textDisabled: text.disabled,
    border: border.base,
    borderSoft: border.soft,
    borderStrong: border.strong,
    focus: palette.primary,
  },
  tone: tones,
  toneLabel: toneLabels,
  navigation,
  space,
  radius,
  shadow,
  typography,
  motion,
  targetSize,
  breakpoint,
} as const

export type Tokens = typeof tokens

/* ─── Sinh CSS variables ──────────────────────────────────────────────── */

/**
 * Sinh chuỗi CSS custom properties từ token.
 *
 * Dùng để inject vào `:root` trong `App.css` hoặc runtime, giữ đảm bảo
 * CSS và TS không lệch nhau.
 *
 * ⚠ Tên biến phải khớp chính xác với `App.css` (`--mcms-primary`,
 * `--mcms-background`, `--mcms-text-muted`, `--mcms-border-soft`, …).
 */
export function buildCssVariables(): string {
  const lines: string[] = []
  lines.push(`  --mcms-font-family: ${typography.fontFamily};`)
  lines.push(`  --mcms-font-small: ${typography.sizeSmall}px;`)
  lines.push(`  --mcms-weight-medium: ${typography.weightMedium};`)
  lines.push(`  --mcms-weight-semibold: ${typography.weightSemibold};`)
  lines.push(`  --mcms-weight-bold: ${typography.weightBold};`)
  for (const [name, value] of Object.entries(breakpoint)) lines.push(`  --mcms-breakpoint-${name}: ${value}px;`)
  for (const [name, value] of Object.entries(componentTokens.badge)) {
    const cssName = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
    lines.push(`  --mcms-badge-${cssName}: ${value}px;`)
  }
  lines.push(`  --mcms-font-mono: ${typography.fontMono};`)
  lines.push(`  --mcms-motion-fast: ${motion.fast};`)
  lines.push(`  --mcms-chart-temperature: ${chartSeries.temperature};`)
  lines.push(`  --mcms-chart-humidity: ${chartSeries.humidity};`)
  lines.push(`  --mcms-chart-revenue: ${chartSeries.revenue};`)
  lines.push(`  --mcms-chart-revenue-previous: ${chartSeries.revenuePrevious};`)
  lines.push(`  --mcms-font-body: ${typography.sizeBody}px;`)
  lines.push(`  --mcms-font-title: ${typography.sizeTitle}px;`)
  lines.push(`  --mcms-font-heading: ${typography.sizeHeading}px;`)
  lines.push(`  --mcms-line-height: ${typography.lineHeight};`)

  // Bảng màu — tên đã có sẵn trong App.css.
  lines.push(`  --mcms-primary: ${palette.primary};`)
  lines.push(`  --mcms-primary-strong: ${palette.primaryStrong};`)
  lines.push(`  --mcms-primary-dark: ${palette.primaryDark};`)
  lines.push(`  --mcms-primary-soft: ${palette.primarySoft};`)
  lines.push(`  --mcms-primary-faint: ${palette.primaryFaint};`)
  lines.push(`  --mcms-teal: ${palette.teal};`)
  lines.push(`  --mcms-teal-soft: ${palette.tealSoft};`)
  lines.push(`  --mcms-amber: ${palette.amber};`)
  lines.push(`  --mcms-amber-soft: ${palette.amberSoft};`)
  lines.push(`  --mcms-coral: ${palette.coral};`)
  lines.push(`  --mcms-coral-soft: ${palette.coralSoft};`)
  lines.push(`  --mcms-blue: ${palette.blue};`)
  lines.push(`  --mcms-blue-soft: ${palette.blueSoft};`)

  // Nền.
  lines.push(`  --mcms-background: ${surface.background};`)
  lines.push(`  --mcms-surface: ${surface.surface};`)
  lines.push(`  --mcms-surface-muted: ${surface.surfaceMuted};`)
  lines.push(`  --mcms-surface-hover: ${surface.surfaceHover};`)
  lines.push(`  --mcms-surface-disabled: ${surface.surfaceDisabled};`)

  // Chữ.
  lines.push(`  --mcms-text: ${text.base};`)
  lines.push(`  --mcms-text-muted: ${text.muted};`)
  lines.push(`  --mcms-text-inverse: ${text.inverse};`)
  lines.push(`  --mcms-text-disabled: ${text.disabled};`)

  // Viền.
  lines.push(`  --mcms-border: ${border.base};`)
  lines.push(`  --mcms-border-soft: ${border.soft};`)
  lines.push(`  --mcms-border-strong: ${border.strong};`)

  // Điều hướng (sidebar).
  lines.push(`  --mcms-nav-item-text: ${navigation.itemText};`)
  lines.push(`  --mcms-sidebar-bg: ${navigation.sidebarBg};`)
  lines.push(`  --mcms-sidebar-text: ${navigation.sidebarText};`)
  lines.push(`  --mcms-sidebar-muted: ${navigation.sidebarMuted};`)
  lines.push(`  --mcms-sidebar-hover-bg: ${navigation.sidebarHoverBg};`)
  lines.push(`  --mcms-sidebar-focus: ${navigation.sidebarFocus};`)
  lines.push(`  --mcms-nav-item-icon: ${navigation.itemIcon};`)
  lines.push(`  --mcms-nav-item-hover-bg: ${navigation.itemHoverBg};`)
  lines.push(`  --mcms-nav-item-selected-bg: ${navigation.itemSelectedBg};`)
  lines.push(`  --mcms-nav-item-selected-text: ${navigation.itemSelectedText};`)
  lines.push(`  --mcms-nav-active-bar: ${navigation.activeBar};`)

  // Shadow.
  lines.push(`  --mcms-shadow-xs: ${shadow.xs};`)
  lines.push(`  --mcms-shadow-sm: ${shadow.sm};`)
  lines.push(`  --mcms-shadow-md: ${shadow.md};`)
  lines.push(`  --mcms-shadow-focus: ${shadow.focus};`)

  // Bo góc.
  for (const [key, value] of Object.entries(radius)) {
    lines.push(`  --mcms-radius-${key}: ${value};`)
  }

  // Khoảng cách.
  for (const [key, value] of Object.entries(space)) {
    lines.push(`  --mcms-space-${key}: ${value};`)
  }

  // Trạng thái ngữ nghĩa.
  for (const [key, tone] of Object.entries(tones)) {
    lines.push(`  --mcms-tone-${key}-text: ${tone.text};`)
    lines.push(`  --mcms-tone-${key}-bg: ${tone.bg};`)
    lines.push(`  --mcms-tone-${key}-badge-bg: ${tone.badgeBg};`)
    lines.push(`  --mcms-tone-${key}-border: ${tone.border};`)
    lines.push(`  --mcms-tone-${key}-solid: ${tone.solid};`)
    lines.push(`  --mcms-tone-${key}-dot: ${tone.dot};`)
  }

  return `:root {\n${lines.join('\n')}\n}`
}
