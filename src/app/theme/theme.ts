import type { ThemeConfig } from 'antd'
import {
  border,
  palette,
  radius,
  shadow,
  surface,
  text,
  tones,
  typography,
} from './tokens'

/**
 * Theme antd — dùng chung token với `tokens.ts`.
 *
 * ⚠ Nguồn sự thật duy nhất: `src/app/theme/tokens.ts`.
 *   File này chỉ map token sang cấu trúc antd, không hardcode giá trị mới.
 *
 * Lưu ý: badge/status preset của antd **FAIL WCAG AA**
 * (success 3.37:1, warning 2.76:1, default 3.22:1) → dùng `StatusBadge`
 * trong `src/shared/ui` thay vì `<Tag color="success">`.
 */
export const mcmsTheme: ThemeConfig = {
  token: {
    colorPrimary: palette.primary,
    colorSuccess: palette.primary,
    colorInfo: palette.teal,
    colorWarning: palette.amber,
    colorError: palette.coral,
    colorText: text.base,
    colorTextSecondary: text.muted,
    colorBgBase: surface.surface,
    colorBgLayout: surface.background,
    colorBgContainer: surface.surface,
    colorBorder: border.base,
    colorBorderSecondary: border.soft,
    /**
     * Focus outline — dùng viền nhấn để đạt 3:1 so với nền liên quan
     * (WCAG 2.4.11 Focus Appearance).
     */
    controlOutline: border.strong,
    controlOutlineWidth: 2,
    borderRadius: Number.parseInt(radius.md, 10),
    borderRadiusLG: Number.parseInt(radius.lg, 10),
    controlHeight: 40,
    fontFamily: typography.fontFamily,
    boxShadowTertiary: shadow.xs,
  },
  components: {
    Layout: {
      bodyBg: surface.background,
      headerBg: surface.surface,
      siderBg: surface.surface,
    },
    Menu: {
      itemHeight: 44,
      itemBorderRadius: Number.parseInt(radius.md, 10),
      itemMarginInline: 12,
      itemMarginBlock: 3,
      itemSelectedBg: palette.primarySoft,
      itemSelectedColor: palette.primaryDark,
      itemHoverBg: surface.surfaceHover,
      itemHoverColor: palette.primaryDark,
      groupTitleColor: text.muted,
    },
    Button: {
      borderRadius: Number.parseInt(radius.md, 10),
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: typography.weightSemibold,
      /** Khoảng cách icon ↔ chữ — dùng chung nhịp 8px của lưới spacing. */
      iconGap: 8,
    },
    Card: {
      borderRadiusLG: Number.parseInt(radius.lg, 10),
      headerBg: surface.surface,
    },
    Table: {
      headerBg: surface.surfaceMuted,
      headerColor: text.base,
      borderColor: border.soft,
      rowHoverBg: surface.surfaceHover,
    },
    Input: {
      activeBorderColor: palette.primary,
      hoverBorderColor: palette.primary,
      activeShadow: shadow.focus,
    },
    Select: {
      activeBorderColor: palette.primary,
      hoverBorderColor: palette.primary,
      activeOutlineColor: 'rgb(21 128 61 / 12%)',
    },
    Tabs: {
      itemSelectedColor: palette.primary,
      itemHoverColor: palette.primary,
      inkBarColor: palette.primary,
    },
    Tag: {
      borderRadiusSM: Number.parseInt(radius.sm, 10),
    },
  },
}

/**
 * Bảng tra nhanh trạng thái ngữ nghĩa — dùng khi cần map trạng thái
 * nghiệp vụ sang tone màu chuẩn (xem `src/shared/ui/StatusBadge.tsx`).
 */
export const semanticTones = tones
