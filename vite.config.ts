import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// ─────────────────────────────────────────────────────────────────────────
// Vite config — mcms-web-admin
//
// - Build: tách bundle thành các vendor chunks (antd, charts, react, data).
// - API: đọc VITE_API_BASE_URL từ .env (chỉ 1 file).
//   • Production: client gọi thẳng URL thật (HTTPS, không CORS).
//   • Dev local: Vite proxy forward /api/* → URL thật để tránh CORS.
// ─────────────────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  // loadEnv chạy ở Node context (vite.config.ts) nên an toàn.
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl =
    env.VITE_API_BASE_URL || 'https://backend-75e1.onrender.com'

  return {
    plugins: [react()],

    server: {
      port: 5173,
      // ─── Dev proxy — bypass CORS khi gọi backend Render ───
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              console.error(
                `[MCMS Proxy Error] ${req.method} ${req.url}:`,
                err.message,
              )
            })
          },
        },
      },
    },

    build: {
      // Antd + icons là chunk vendor lớn (~1.3MB), nhưng đã tách riêng khỏi
      // app code; cache hit rất tốt vì hiếm khi thay đổi → không cảnh báo.
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          /**
           * Phân tách bundle thành các vendor chunks độc lập:
           * - Cải thiện FCP/TTI (parallel download, cache hit tốt hơn).
           * - Vendor thay đổi ít hơn app code → user chỉ tải lại chunk app.
           *
           * Dùng function form để tương thích Vite 8 (rolldown bundler).
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            // Thư viện biểu đồ (nặng nhất) → chunk riêng
            if (id.includes('recharts')) return 'vendor-charts'

            // UI framework + icons
            if (
              id.includes('/antd/') ||
              id.includes('@ant-design/icons')
            ) {
              return 'vendor-antd'
            }

            // Data layer: state, server-state, date, http
            if (
              id.includes('zustand') ||
              id.includes('@tanstack') ||
              id.includes('/dayjs/') ||
              id.includes('/axios/')
            ) {
              return 'vendor-data'
            }

            // React core + router
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router')
            ) {
              return 'vendor-react'
            }

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
