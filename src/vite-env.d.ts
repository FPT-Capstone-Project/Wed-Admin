/**
 * Kiểu dữ liệu cho các biến môi trường của Vite (`import.meta.env`).
 *
 * ⚠ Vite chỉ expose biến có prefix `VITE_` ra client code — khai báo ở đây
 *   giúp TypeScript biết chính xác biến nào tồn tại & kiểu của nó.
 *
 * ⚠ File này **không** được đụng tới runtime; chỉ phục vụ type-checking.
 */

interface ImportMetaEnv {
  /**
   * Base URL của Backend (API).
   *
   * - Dev: có thể khai báo hoặc không (dùng làm **target** cho Vite proxy).
   * - Production: **bắt buộc** — thiếu thì app in cảnh báo và mọi request
   *   gọi nhầm vào chính trang static.
   *
   * Xem `src/shared/api/api-config.ts` để hiểu luồng chuẩn hoá.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
