import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { validateApiConfig } from './shared/api/client'

/**
 * Kiểm tra cấu hình API **trước** khi render app.
 *
 * ⚠ Ở production, nếu thiếu `VITE_API_BASE_URL` thì `baseURL = ''` ⇒ mọi
 * request gọi tới chính trang static đang phục vụ app ⇒ 404 hàng loạt và
 * user chỉ thấy màn hình trắng. `validateApiConfig()` in lỗi rõ ràng ra
 * console (kèm hướng dẫn sửa) để phát hiện ngay khi deploy.
 *
 * ⚠ Đây chỉ là **cảnh báo** — app vẫn render để không chặn hoàn toàn quyền
 *   truy cập (vd khi backend cùng origin qua reverse proxy).
 */
validateApiConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
