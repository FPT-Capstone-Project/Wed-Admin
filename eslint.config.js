import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
])
