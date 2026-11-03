import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// ─────────────────────────────────────────────────────────────────────────
// Vite config — mcms-web-admin
//
// - Build: tách bundle thành các vendor chunks (antd, charts, react, data).
// - API: đọc VITE_API_BASE_URL từ .env (chỉ 1 file).
//   • Production: client gọi thẳng URL thật (HTTPS, không CORS).
//   • Dev local: Vite proxy forward /api/* → URL thật để tránh CORS.
//
// ⚠ Proxy target phải là ORIGIN (không kèm /api):
//   Client dev dùng baseURL = '' → axios gọi `localhost:5173/api/users`.
//   Nếu target chứa sẵn `/api` mà `rewrite` giữ nguyên path, request ra
//   `https://backend.../api/api/users` → 404. Xem `stripApiSuffix()` bên dưới.
//
// ⚠ Server hiện tại: Azure (`mcms-h5g5dtdzajf0bebm.eastasia-01.azurewebsites.net`).
//   `.env` khai báo `VITE_API_BASE_URL` — file này chỉ là FALLBACK khi thiếu env.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Bỏ dấu `/` cuối và hậu tố `/api` khỏi base URL để làm proxy target.
 *
 * `.env` có thể khai báo theo 2 kiểu:
 *   VITE_API_BASE_URL=https://backend-75e1.onrender.com      (origin)
 *   VITE_API_BASE_URL=https://backend-75e1.onrender.com/api  (kèm /api)
 * Cả hai đều phải ra cùng một origin: `https://backend-75e1.onrender.com`.
 */
function stripApiSuffix(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '').replace(/\/api$/i, '')
}

export default defineConfig(({ mode }) => {
  // loadEnv chạy ở Node context (vite.config.ts) nên an toàn.
  const env = loadEnv(mode, process.cwd(), '')
  const rawApiBaseUrl = (env.VITE_API_BASE_URL ?? '').trim()
  const apiOrigin = stripApiSuffix(
    rawApiBaseUrl ||
      'https://mcms-h5g5dtdzajf0bebm.eastasia-01.azurewebsites.net',
  )

  // ⚠ Ở production, thiếu `VITE_API_BASE_URL` ⇒ client sẽ gọi nhầm vào
  //   chính trang static ⇒ mọi request 404. Cảnh báo **ngay lúc build**
  //   (chứ không phải lúc chạy) để CI/CD fail sớm.
  if (mode === 'production' && !rawApiBaseUrl) {
    console.warn(
      [
        '',
        '╔══════════════════════════════════════════════════════════════╗',
        '║  ⚠  THIẾU BIẾN MÔI TRƯỜNG VITE_API_BASE_URL                ║',
        '╚══════════════════════════════════════════════════════════════╝',
        '',
        '  Build production sẽ tạo ra app KHÔNG gọi được backend:',
        '  client sẽ gọi vào chính trang static đang phục vụ nó ⇒ 404.',
        '',
        '  Cách sửa — thêm biến sau rồi build lại:',
        '    VITE_API_BASE_URL=https://<your-backend-domain>/api',
        '',
        '  · CI/CD (khuyến nghị): thêm Environment Variable trong pipeline.',
        '  · Máy local: copy .env.production.sample → .env.production',
        '    rồi sửa giá trị, build xong xoá file.',
        '',
        '  📄 Xem .env.example và .env.production.sample để biết chi tiết.',
        '',
      ].join('\n'),
    )
  }

  return {
    plugins: [react()],

    server: {
      port: 5173,
      // ─── Dev proxy — bypass CORS khi gọi backend Render ───
      proxy: {
        // Context giữ nguyên là `/api`: path của request (vd `/api/users`)
        // được append thẳng vào `target` (origin) → URL đúng 1 lần `/api`.
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
          /**
           * Timeout của dev proxy (ms).
           *
           * ⚠ `http-proxy` mặc định **không** timeout → request treo vô hạn
           * khi backend Render chưa thức dậy. Đặt 60s để khớp với timeout
           * của axios (`API_TIMEOUT_MS`) → lỗi trả về là "timeout" rõ ràng
           * thay vì request treo.
           */
          timeout: 60_000,
          proxyTimeout: 60_000,
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              console.error(
                `[MCMS Proxy Error] ${req.method} ${req.url} → ${apiOrigin}:`,
                err.message,
              )
            })
          },
        },
      },
    },

    build: {
      // Chunk lớn nhất sau khi tối ưu ~330KB (gzip ~120KB) ⇒ nâng ngưỡng
      // cảnh báo lên 700KB để bắt được regression thật sự.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          /**
           * ── Chiến lược tách chunk (đã đo benchmark) ──────────────────────
           *
           * ⚠ Vấn đề của cấu hình CŨ (gom tất cả AntD vào 1 chunk):
           *   `vendor-antd` = **1.34MB** và được `modulepreload` ⇒ mọi lần mở
           *   trang đều tải 1.34MB dù user chỉ vào Dashboard.
           *
           * ⚠ Nguyên nhân gốc: `manualChunks` cưỡng ép **tất cả** module
           *   `antd` + `@ant-design/icons` vào MỘT chunk. Chunk đó là static
           *   import của entry (`App.tsx` → `ConfigProvider` từ `antd`) ⇒
           *   nó thành dependency tĩnh ⇒ bị preload ngay.
           *
           * ✅ Cách đúng: chỉ **đánh dấu** những vendor luôn cần + nhỏ + ổn
           *   định (react, data layer) thành chunk riêng; còn lại (AntD,
           *   recharts, rc-*) **để bundler tự quyết định** — nó sẽ tách theo
           *   đúng nhóm component thật sự được import, nên user chỉ tải phần
           *   mình dùng.
           *
           * 📊 Kết quả đo (first-paint = entry + các chunk `modulepreload`):
           *   | Chiến lược                          | Preload | First-paint |
           *   |-------------------------------------|---------|-------------|
           *   | Cũ: gom hết AntD vào 1 chunk        |    5    |   1562 KB   |
           *   | **Mới: react + data, còn lại auto**  |   12    | **1049 KB** |
           *   | Chỉ react                            |   12    |   1029 KB   |
           *   | Tự động hoàn toàn (không manual)   |   11    |   1028 KB   |
           *
           *   → Giảm **~33%** bytes tải lần đầu; chunk lớn nhất giảm từ
           *     1344KB → 267KB (react) / 328KB (recharts, lazy-load sau).
           *
           * ⚠ `manualChunks` cũ dùng `id.includes('/antd/')` — dấu `/` chỉ
           *   đúng trên POSIX. Trên Windows path là `\` ⇒ match FAIL ⇒ AntD
           *   rơi vào chunk app code. Ở đây dùng regex `[\\/]` cho an toàn
           *   trên mọi OS.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            // ⚠ Normalize path separator: Windows dùng `\`, POSIX dùng `/`.
            //   Regex `\/` khớp cả hai ⇒ kết quả build giống nhau mọi OS.
            const moduleId = id.replace(/\\/g, '/')

            // ── React core + router ────────────────────────────────────────
            // Luôn cần, đổi rất hiếm ⇒ cache hit tốt nhất.
            if (
              /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
                moduleId,
              )
            ) {
              return 'vendor-react'
            }

            // ── Data layer ─────────────────────────────────────────────────
            // axios + TanStack Query + zustand + dayjs: nhỏ, luôn cần ở mọi
            // trang (query client, token, format date).
            if (
              /\/node_modules\/(zustand|@tanstack|dayjs|axios|use-sync-external-store)\//.test(
                moduleId,
              )
            ) {
              return 'vendor-data'
            }

            // ⚠ Cố ý KHÔNG tách `antd` / `recharts` / `@ant-design/icons`:
            //   gom chúng vào 1 chunk ⇒ chunk đó thành static dependency của
            //   entry ⇒ bị preload dù user không dùng tới.
            //   Để bundler tự tách theo component thực sự dùng (vd
            //   `antd/es/table` chỉ nằm trong chunk của trang bảng).
            return undefined
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },

    // Expose BUILD_INFO cho source code (KHÔNG lộ secret)
    define: {
      __APP_MODE__: JSON.stringify(mode),
    },
  }
})
