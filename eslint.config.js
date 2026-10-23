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
   * Với codebase này, các file dưới đây export **hợp lệ** nhiều thứ:
   *  - `router/index.tsx`      → export `router` (createBrowserRouter) + lazy pages
   *  - `providers/QueryProvider.tsx` → export `queryClient` + `QueryProvider` + helper
   *  - `PasswordStrength.tsx`  → export `scorePassword` (logic thuần) + component
   *
   * Tách mỗi export ra file riêng sẽ làm rối cấu trúc mà **không** cải
   * thiện gì cho HMR (Vite vẫn refresh đúng module khi file con đổi).
   * Vì vậy ta hạ rule xuống `warn` cho đúng các file này thay vì tắt toàn cục —
   * file mới viết sai vẫn bị báo `error` như trước.
   */
  {
    files: [
      'src/app/router/index.tsx',
      'src/app/providers/QueryProvider.tsx',
      'src/features/auth/components/PasswordStrength.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },
])
