import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import noRawStatusInJsx from './eslint-rules/no-raw-status-in-jsx.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  /**
   * ─── react-refresh/only-export-components ─────────────────────────────
   *
   * Rule này cảnh báo khi 1 file export nhiều thứ (component + hằng số +
   * hàm helper) — vì Fast Refresh (HMR) chỉ hoạt động an toàn khi file chỉ
   * export component.
   *
   * Cách xử lý trong codebase này: tách phần export **không phải component**
   * ra file riêng (vd `router/lazy-pages.ts`, `password-strength.utils.ts`)
   * để giữ đúng nguyên tắc của Fast Refresh mà không phải tắt rule.
   *
   * `src/app/router/index.tsx` chỉ export `router` (đối tượng route, không
   * phải component) — đây là ngoại lệ hợp lệ: router là cấu hình tĩnh,
   * không có state/component nào để HMR cần giữ nguyên.
   */
  {
    files: ['src/app/router/index.tsx'],
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },

  /**
   * ─── no-raw-status-in-jsx ─────────────────────────────────────────────
   *
   * **Guardrail** chống lộ enum thô của BE ra UI.
   *
   * ⚠ Vì sao cần: BE trả `PLANNED` / `ACTIVE` / `WAITING_EXPERT`… — nếu
   *   render thẳng vào JSX, người dùng Việt sẽ thấy chuỗi tiếng Anh.
   *   Audit đã liệt kê hơn 30 chỗ vi phạm; rule này chặn tái phát.
   *
   * ⚠ Cách sửa: bọc bằng `presentStatus()` / `statusLabel()` từ
   *   `src/shared/i18n/status/` (module trung tâm).
   *
   * → Để ở mức `error` vì codebase đã sạch: mọi chỗ render enum thô đều
   *   đã chuyển sang `presentStatus()` / `statusLabel()`.
   */
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'mcms': { rules: { 'no-raw-status-in-jsx': noRawStatusInJsx } },
    },
    rules: {
      'mcms/no-raw-status-in-jsx': 'error',
    },
  },
])
