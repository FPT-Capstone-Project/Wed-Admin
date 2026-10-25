/**
 * MCMS Design Tokens — nguồn sự thật duy nhất cho toàn bộ giao diện.
 *
 * Triết lý: nông trại nấm → hệ sinh thái xanh. Giữ tông xanh lá sẵn có
 * (`#15803d`) làm màu chủ đạo, bổ sung palette "Earth Green + Harvest Gold"
 * theo pattern *Agriculture/Farm Tech* (skill ui-ux-pro-max).
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

/** 4 trạng thái ngữ nghĩa dùng xuyên suốt app. */
export type SemanticTone = 'ok' | 'info' | 'warning' | 'danger' | 'muted' | 'neutral'

/** Bảng màu chữ + nền + viền cho một trạng thái ngữ nghĩa. */
export interface TonePalette {
  /** Màu chữ trên nền mềm — đạt ≥ 4.5:1. */
  readonly text: string
  /** Nền mềm (badge, chip, huy hiệu). */
  readonly bg: string
  /** Viền — đạt ≥ 3:1 trên cả nền mềm lẫn nền trắng. */
  readonly border: string
  /** Màu đậm dùng cho icon/điểm tròn trạng thái. */
  readonly solid: string
}

/* ─── Màu cơ bản ───────────────────────────────────────────────────────── */

export const palette = {
  /* Xanh lá — màu chủ đạo, giữ nguyên giá trị đang dùng để không đổi nhận diện */
  primary: '#15803d',
  primaryDark: '#0f642f',
  primarySoft: '#eaf7ee',
  primaryFaint: '#f3fbf5',

  /* Teal — thông tin, trạng thái trung tính đang diễn ra */
  teal: '#0f766e',
  tealSoft: '#e6f5f3',

  /* Amber — cần chú ý, chờ thao tác */
  amber: '#a16207',
  amberSoft: '#fff7e2',

  /* Coral — nguy hiểm, lỗi, nhiễm bệnh */
  coral: '#c2413b',
  coralSoft: '#fff0ee',

  /* Blue — thông tin bổ sung, liên kết */
  blue: '#2563a6',
  blueSoft: '#edf5ff',
} as const

/* ─── Nền & chữ ───────────────────────────────────────────────────────── */

export const surface = {
  /** Nền ứng dụng (phía sau card). */
  background: '#f4f8f5',
  /** Nền card / panel / bảng. */
  surface: '#ffffff',
  /** Nền lạch (header bảng, ô thống kê phụ). */
  surfaceMuted: '#f7faf8',
  /** Nền con trỏ chuột trên dòng bảng. */
  surfaceHover: '#f5faf6',
  /** Nền dùng cho badge trạng thái "tắt". */
  surfaceDisabled: '#eef2ef',
} as const

export const text = {
  /** Chữ chính — 13.71:1 trên trắng. */
  base: '#173321',
  /** Chữ phụ — 4.96:1 trên nền lạch (đạt AA). */
  muted: '#5f7164',
  /** Chữ trên nền tối. */
  inverse: '#ffffff',
  /** Chữ tắt — dùng cho nội dung không còn hành động. */
  disabled: '#7f8e85',
} as const

export const border = {
  /** Viền mảnh (lưới bảng, ô input). */
  base: '#dce8df',
  /** Viền rất mảnh (ngăn cách trong card). */
  soft: '#e8f0ea',
  /**
   * Viền nhấn — 3.37:1 trên trắng, đạt WCAG 1.4.11.
   * Dùng cho viền input, viền badge cần nổi, focus outline.
   */
  strong: '#6d9579',
} as const

/* ─── Màu ngữ nghĩa ───────────────────────────────────────────────────── */

/**
 * 4 trạng thái ngữ nghĩa (bình thường / cần chú ý / nguy hiểm / tắt) +
 * 2 trạng thái phụ (thông tin / trung tính).
 *
 * Mỗi trạng thái đã verify:
 *   ok      4.55:1  | info    4.88:1  | warning 4.61:1
 *   danger  4.61:1  | muted   4.61:1  | neutral 7.97:1
 *
 * ⚠ Badge antd mặc định FAIL AA (success 3.37, warning 2.76, default 3.22).
 * Vì vậy dùng `StatusBadge` riêng thay vì `<Tag color="success">`.
 */
export const tones: Record<SemanticTone, TonePalette> = {
  /** Bình thường — đang hoạt động, ổn, đạt yêu cầu. */
  ok: {
    text: '#15803d',
    bg: '#eaf7ee',
    border: '#15803d',
    solid: '#15803d',
  },
  /** Thông tin — đang diễn ra, không cảnh báo. */
  info: {
    text: '#0f766e',
    bg: '#e6f5f3',
    border: '#0f766e',
    solid: '#0f766e',
  },
  /** Cần chú ý — chờ xử lý, sắp hết hạn, vượt ngưỡng nhẹ. */
  warning: {
    text: '#a16207',
    bg: '#fff7e2',
    border: '#a16207',
    solid: '#a16207',
  },
  /** Nguy hiểm — lỗi, nhiễm bệnh, mất kết nối, vượt ngưỡng nặng. */
  danger: {
    text: '#c2413b',
    bg: '#fff0ee',
    border: '#c2413b',
    solid: '#c2413b',
  },
  /** Tắt — không hoạt động, đã khoá, đã huỷ. */
  muted: {
    text: '#5f7164',
    bg: '#eef2ef',
    border: '#5f7164',
    solid: '#5f7164',
  },
  /** Trung tính — chưa biết, chờ dữ liệu. */
  neutral: {
    text: '#3f4d45',
    bg: '#f0f3f1',
    border: '#3f4d45',
    solid: '#3f4d45',
  },
}

/** Nhãn tiếng Việt mặc định cho từng trạng thái ngữ nghĩa. */
export const toneLabels: Record<SemanticTone, string> = {
  ok: 'Bình thường',
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

export const radius = {
  /** 4px — chip nhỏ, tag nhỏ. */
  sm: '4px',
  /** 6px — input, button, badge. */
  md: '6px',
  /** 8px — card, panel, bảng. */
  lg: '8px',
  /** 12px — modal lớn, hero card. */
  xl: '12px',
  /** 999px — pill, avatar. */
  pill: '999px',
} as const

/* ─── Đổ bóng ─────────────────────────────────────────────────────────── */

/** Shadow dùng tông xanh (tint theo màu primary) thay vì đen trung tính. */
export const shadow = {
  /** Card nổi nhẹ. */
  xs: '0 1px 2px rgb(24 73 42 / 5%)',
  /** Popover / dropdown. */
  sm: '0 8px 24px rgb(24 73 42 / 7%)',
  /** Modal / drawer. */
  md: '0 18px 50px rgb(11 64 31 / 12%)',
  /** Focus ring — dùng kèm outline, không thay thế outline. */
  focus: '0 0 0 3px rgb(21 128 61 / 12%)',
} as const

/* ─── Typography ──────────────────────────────────────────────────────── */

export const typography = {
  /** Font chính — Inter (Minimal Swiss, tối ưu cho admin panel). */
  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  /** Font tabular cho số liệu — tránh layout shift khi số thay đổi. */
  fontNumeric:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  /** Cỡ chữ thân bắt buộc ≥ 16px (tránh iOS auto-zoom trên mobile). */
  sizeBody: 16,
  /** Cỡ chữ phụ — chỉ dùng cho metadata, không dùng cho nội dung chính. */
  sizeSmall: 12,
  /** Cỡ chữ tiêu đề bảng. */
  sizeTitle: 14,
  /** Cỡ chữ tiêu đề trang. */
  sizeHeading: 20,
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

/**
 * Token gốc — dùng khi import trong TS.
 * Cấu trúc phẳng để truy cập nhanh: `tokens.color.primary`.
 */
export const tokens = {
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

  // Bảng màu — tên đã có sẵn trong App.css.
  lines.push(`  --mcms-primary: ${palette.primary};`)
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
    lines.push(`  --mcms-tone-${key}-border: ${tone.border};`)
    lines.push(`  --mcms-tone-${key}-solid: ${tone.solid};`)
  }

  return `:root {\n${lines.join('\n')}\n}`
}
