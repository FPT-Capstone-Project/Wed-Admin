import type { ThemeConfig } from 'antd'
import {
  border,
  componentTokens,
  palette,
  radius,
  shadow,
  surface,
  text,
  tones,
  typography,
  gridBreakpoint,
} from './tokens'
import { SIDEBAR_COLLAPSED_WIDTH } from '../layouts/store/sidebar.store'

/**
 * `boxShadowCard` **có thật** trong antd v6 (xem `theme/util/alias.js` → `boxShadowCard`,
 * và `card/style/index.js` dùng `token.boxShadowCard` cho `cardShadow`).
 * ⚠ Nhưng antd v6.6.1 **không khai báo** nó trong `AliasToken` → TS báo lỗi.
 *   Khai báo bổ sung ở đây để ghi đè được mà không cần `as any`.
 */
type McmsAliasToken = NonNullable<ThemeConfig['token']> & {
  /** Shadow riêng cho Card (alias token của antd). */
  boxShadowCard?: string
}

export type McmsThemeConfig = Omit<ThemeConfig, 'token'> & {
  token?: McmsAliasToken
}

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
export const mcmsTheme: McmsThemeConfig = {
  token: {
    screenXS: gridBreakpoint.xs,
    screenXSMin: gridBreakpoint.xs,
    screenXSMax: gridBreakpoint.sm - 1,
    screenSM: gridBreakpoint.sm,
    screenSMMin: gridBreakpoint.sm,
    screenSMMax: gridBreakpoint.md - 1,
    screenMD: gridBreakpoint.md,
    screenMDMin: gridBreakpoint.md,
    screenMDMax: gridBreakpoint.lg - 1,
    screenLG: gridBreakpoint.lg,
    screenLGMin: gridBreakpoint.lg,
    screenLGMax: gridBreakpoint.xl - 1,
    screenXL: gridBreakpoint.xl,
    screenXLMin: gridBreakpoint.xl,
    screenXLMax: gridBreakpoint.xxl - 1,
    screenXXL: gridBreakpoint.xxl,
    screenXXLMin: gridBreakpoint.xxl,
    colorPrimary: palette.primary,
    colorLink: palette.primaryStrong,
    colorLinkHover: palette.primaryDark,
    colorSuccess: palette.primary,
    colorInfo: tones.info.solid,
    colorWarning: palette.amber,
    colorError: palette.coral,
    colorText: text.base,
    colorTextSecondary: text.muted,
    colorBgBase: surface.surface,
    colorBgLayout: surface.background,
    colorBgContainer: surface.surface,
    colorBorder: border.base,
    colorBorderSecondary: border.base,
    /**
     * Focus outline — dùng viền nhấn để đạt 3:1 so với nền liên quan
     * (WCAG 2.4.11 Focus Appearance).
     */
    controlOutline: border.strong,
    controlOutlineWidth: 2,
    /**
     * Bo góc — chuẩn B2B Industrial IoT: 4px cho control, 6px cho container.
     * Không dùng pill.
     */
    borderRadius: Number.parseInt(radius.md, 10),
    borderRadiusLG: Number.parseInt(radius.lg, 10),
    borderRadiusSM: Number.parseInt(radius.sm, 10),
    borderRadiusXS: Number.parseInt(radius.sm, 10),
    controlHeight: 36,
    fontFamily: typography.fontFamily,
    /** Cỡ chữ thân 13px — mật độ dashboard. */
    fontSize: typography.sizeBody,
    lineHeight: typography.lineHeight,
    /**
     * Thang tiêu đề — **nhỏ hơn** mặc định của antd (38/30/24/20/16).
     * Chuẩn B2B Industrial IoT: phân cấp thị giác dựa trên **cân nặng chữ**
     * + khoảng cách, không phải trên cỡ chữ to.
     */
    fontSizeHeading1: 24,
    fontSizeHeading2: 20,
    fontSizeHeading3: 18,
    fontSizeHeading4: 15,
    fontSizeHeading5: 13,
    boxShadow: shadow.sm,
    boxShadowTertiary: shadow.xs,
    /**
     * Card dùng **viền mảnh**, không đổ bóng đậm — chuẩn industrial.
     *
     * ⚠ `boxShadowCard` là alias token của antd (sinh từ `boxShadowSecondary`).
     *   Ghi đè ở đây để Card không dùng shadow 3 lớp mặc định của antd.
     */
    boxShadowCard: 'none',
    boxShadowSecondary: shadow.sm,
  },
  components: {
    Layout: {
      bodyBg: surface.background,
      headerBg: componentTokens.card.background,
      colorBorderSecondary: componentTokens.card.border,
      siderBg: componentTokens.menu.sidebarBg,
    },
    Menu: {
      itemHeight: 40,
      /**
       * Bo góc item — **0px**.
       *
       * ⚠ Chuẩn Enterprise IoT: item điều hướng **không** có viền bo tròn
       *   quanh (dạng pill/viên thuốc). Bo góc chỉ dành cho control nhỏ
       *   (button, input, badge).
       */
      itemBorderRadius: 0,
      /**
       * Margin 0 → vạch nhấn 3px nằm **sát mép trái** của sidebar.
       * Khoảng cách trái được bù bằng `itemPaddingInline`.
       */
      itemMarginInline: 0,
      /** Canh chữ item khớp với tiêu đề nhóm (`padding: 0 20px`). */
      itemPaddingInline: 20,
      itemMarginBlock: 2,
      /**
       * Active menu — nền Slate-100 + chữ đậm (không viền, không pill).
       * Vạch nhấn 3px sát mép trái được vẽ bằng CSS (`App.css`).
       */
      itemSelectedBg: componentTokens.menu.itemSelectedBg,
      itemSelectedColor: componentTokens.menu.itemSelectedText,
      itemColor: componentTokens.menu.sidebarText,
      itemHoverBg: componentTokens.menu.sidebarHoverBg,
      itemHoverColor: componentTokens.menu.sidebarText,
      groupTitleColor: componentTokens.menu.sidebarMuted,
      colorBgContainer: componentTokens.menu.sidebarBg,
      /**
       * Bề rộng menu khi sidebar thu gọn — **72px**.
       *
       * ⚠ Mặc định của antd = `controlHeightLG * 2` ≈ 80px ⇒ lệch với
       *   `collapsedWidth` của `Sider` (72px) ⇒ icon bị lệch trái.
       *   Ép khớp cả hai để icon luôn **canh giữa** sidebar.
       */
      collapsedWidth: SIDEBAR_COLLAPSED_WIDTH,
      /**
       * Cỡ icon khi thu gọn — 18px (khớp icon menu mở rộng).
       *
       * ⚠ antd dùng token này để tính `padding-inline` canh giữa icon ⇒
       *   phải khớp với CSS `.mcms-menu .ant-menu-item .anticon` (18px).
       */
      collapsedIconSize: 18,
    },
    Button: {
      colorPrimary: componentTokens.button.background,
      colorPrimaryHover: palette.primaryDark,
      colorPrimaryActive: palette.primaryDark,
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
      headerBg: componentTokens.card.background,
      colorBorderSecondary: componentTokens.card.border,
      /** Card dựa trên viền mảnh, không đổ bóng. */
      boxShadowTertiary: 'none',
    },
    Table: {
      headerBorderRadius: Number.parseInt(radius.md, 10),
      headerBg: componentTokens.table.header,
      headerColor: text.base,
      borderColor: componentTokens.table.border,
      rowHoverBg: surface.surfaceHover,
      /** Mật độ công nghiệp — padding ô gọn. */
      cellPaddingBlock: 8,
      /**
       * Padding ngang ô = **12px** cho **mọi** cỡ bảng.
       *
       * ⚠ Mặc định của antd: `cellPaddingInline` = 16px, còn `cellPaddingInlineSM/MD`
       *   = 8px ⇒ cùng một bảng nhưng 3 cỡ khác nhau có padding khác nhau
       *   ⇒ không nhất quán và khó kiểm soát bề rộng tổng thể.
       *
       *   Ép tất cả về 12px ⇒ bảng 8 cột tiết kiệm 8 × 8 = 64px so với
       *   mặc định ⇒ vừa khít trên laptop 1280–1536px (Windows scale
       *   125%–150%) mà không cần thanh cuộn ngang.
       */
      cellPaddingInline: 12,
      cellPaddingInlineMD: 12,
      cellPaddingInlineSM: 12,
    },
    Input: {
      colorBgContainer: componentTokens.input.background,
      colorBorder: componentTokens.input.border,
      activeBorderColor: palette.primaryStrong,
      hoverBorderColor: border.strong,
      activeShadow: shadow.focus,
    },
    Select: {
      activeBorderColor: palette.primaryStrong,
      hoverBorderColor: border.strong,
      activeOutlineColor: 'rgb(22 163 74 / 12%)',
    },
    Modal: {
      contentBg: componentTokens.modal.background,
      headerBg: componentTokens.modal.background,
      borderRadiusLG: Number.parseInt(radius.md, 10),
    },
    Tooltip: {
      colorBgSpotlight: componentTokens.tooltip.background,
      colorTextLightSolid: componentTokens.tooltip.text,
      borderRadius: Number.parseInt(radius.sm, 10),
    },
    Tabs: {
      itemColor: componentTokens.tabs.text,
      itemActiveColor: componentTokens.tabs.text,
      itemSelectedColor: componentTokens.tabs.text,
      itemHoverColor: text.base,
      inkBarColor: componentTokens.tabs.indicator,
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
