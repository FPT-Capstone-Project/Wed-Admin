/**
 * Centralised access to JWT token — hỗ trợ **2 chế độ lưu trữ**.
 *
 * ## Vì sao cần 2 nơi lưu?
 *
 * Checkbox "Ghi nhớ đăng nhập" ở trang Login điều khiển **vòng đời phiên**:
 *
 * | Chế độ lưu       | Tồn tại khi…            | Khi đóng tab / trình duyệt  |
 * | ---------------- | ----------------------- | --------------------------- |
 * | `localStorage`   | Tích "Ghi nhớ đăng nhập" | **Vẫn còn** (đăng nhập lại) |
 * | `sessionStorage` | KHÔNG tích              | **Mất** → phải đăng nhập lại|
 *
 * - `localStorage` → sống lâu, tồn tại qua cả lần tắt trình duyệt.
 * - `sessionStorage` → gắn với **tab/session của trình duyệt**, bị xoá khi
 *   tab đóng. Đây chính là ngữ nghĩa "phiên ngắn hạn".
 *
 * ## Quy tắc đọc
 *
 * Luôn ưu tiên `localStorage`, fallback `sessionStorage`:
 *
 * ```ts
 * tokenStorage.getAccessToken()  // localStorage → sessionStorage
 * ```
 *
 * Nhờ vậy interceptor gắn `Authorization` header luôn tìm thấy token, và
 * `AuthGuard` cho phép vào dashboard dù token nằm ở nơi nào.
 *
 * ## Tương thích ngược
 *
 * ⚠ Key ở `localStorage` giữ nguyên tên cũ (`mcms-access-token`) → phiên đang
 * chạy sẵn không bị đăng xuất sau khi deploy.
 *
 * Key ở `sessionStorage` là **mới** (`mcms-session-access-token`) — cố ý khác
 * tên để 2 chế độ không ghi đè lẫn nhau (nếu dùng chung key, token của
 * chế độ "không ghi nhớ" sẽ đè lên token của chế độ "ghi nhớ" và làm mất
 * tính dài/ngắn của phiên).
 */
import {
  readKey,
  removeKeyEverywhere,
  writeKey,
  type PersistenceMode,
} from './persistence'

/** Key lưu trong `localStorage` (phiên dài — có tích "Ghi nhớ đăng nhập"). */
const ACCESS_TOKEN_KEY = 'mcms-access-token'
const REFRESH_TOKEN_KEY = 'mcms-refresh-token'

/**
 * Key lưu trong `sessionStorage` (phiên ngắn — không tích "Ghi nhớ đăng nhập").
 */
const SESSION_ACCESS_TOKEN_KEY = 'mcms-session-access-token'
const SESSION_REFRESH_TOKEN_KEY = 'mcms-session-refresh-token'

/** Nơi lưu token — quyết định bởi checkbox "Ghi nhớ đăng nhập". */
export type TokenPersistence = PersistenceMode

/**
 * Đọc token từ `localStorage` rồi fallback `sessionStorage`.
 *
 * ⚠ Mỗi chế độ lưu dùng key RIÊNG (xem `setTokens`):
 *   - `localStorage['mcms-access-token']`
 *   - `sessionStorage['mcms-session-access-token']`
 *
 * Nên phải đọc **cả 2 cặp key**, ưu tiên `localStorage` (phiên dài hơn).
 */
function readAccessToken(): string | null {
  return (
    readKey(ACCESS_TOKEN_KEY, 'local') ??
    readKey(SESSION_ACCESS_TOKEN_KEY, 'session')
  )
}

/** Đọc refresh token — cùng quy tắc ưu tiên với `readAccessToken`. */
function readRefreshToken(): string | null {
  return (
    readKey(REFRESH_TOKEN_KEY, 'local') ??
    readKey(SESSION_REFRESH_TOKEN_KEY, 'session')
  )
}

export const tokenStorage = {
  /**
   * Token truy cập — ưu tiên `localStorage`, fallback `sessionStorage`.
   *
   * Đây là nguồn token DUY NHẤT cho interceptor (`Authorization` header) và
   * cho `AuthGuard`.
   */
  getAccessToken(): string | null {
    return readAccessToken()
  },

  /** Token refresh — cùng quy tắc ưu tiên với `getAccessToken`. */
  getRefreshToken(): string | null {
    return readRefreshToken()
  },

  /**
   * Lưu token theo chế độ persistence.
   *
   * @param persistence
   *   - `'local'`   → `localStorage` (tích "Ghi nhớ đăng nhập"): tồn tại qua
   *     lần tắt trình duyệt.
   *   - `'session'` → `sessionStorage`: mất khi đóng tab.
   *
   * ⚠ Token được ghi vào storage mới VÀ xoá khỏi storage cũ → luôn chỉ có
   * đúng 1 bản token, tránh rác phiên.
   */
  setTokens(
    accessToken: string,
    refreshToken?: string | null,
    persistence: TokenPersistence = 'local',
  ): void {
    const accessKey =
      persistence === 'local' ? ACCESS_TOKEN_KEY : SESSION_ACCESS_TOKEN_KEY
    const refreshKey =
      persistence === 'local' ? REFRESH_TOKEN_KEY : SESSION_REFRESH_TOKEN_KEY
    const otherAccessKey =
      persistence === 'local' ? SESSION_ACCESS_TOKEN_KEY : ACCESS_TOKEN_KEY
    const otherRefreshKey =
      persistence === 'local' ? SESSION_REFRESH_TOKEN_KEY : REFRESH_TOKEN_KEY

    writeKey(accessKey, accessToken, persistence)
    writeKey(refreshKey, refreshToken ?? null, persistence)

    // Dọn bản token của chế độ còn lại.
    removeKeyEverywhere(otherAccessKey)
    removeKeyEverywhere(otherRefreshKey)
  },

  /**
   * Xoá token ở CẢ hai storage.
   *
   * Gọi khi logout, khi BE trả 401, hoặc khi hydrate thất bại.
   */
  clear(): void {
    removeKeyEverywhere(ACCESS_TOKEN_KEY)
    removeKeyEverywhere(REFRESH_TOKEN_KEY)
    removeKeyEverywhere(SESSION_ACCESS_TOKEN_KEY)
    removeKeyEverywhere(SESSION_REFRESH_TOKEN_KEY)
  },
}
