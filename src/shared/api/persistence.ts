/**
 * Helper đọc/ghi `localStorage` và `sessionStorage` theo "chế độ lưu".
 *
 * ## Bối cảnh
 *
 * Checkbox "Ghi nhớ đăng nhập" quyết định **vòng đời phiên**:
 *
 * | Chế độ            | Nơi lưu          | Tồn tại khi tắt trình duyệt? |
 * | ----------------- | ---------------- | ---------------------------- |
 * | `'local'`         | `localStorage`   | **Có** → vẫn đăng nhập      |
 * | `'session'`       | `sessionStorage` | **Không** → phải đăng nhập lại|
 *
 * - `localStorage` → tồn tại lâu, gắn với **origin** của trình duyệt.
 * - `sessionStorage` → gắn với **tab/session**; bị xoá khi đóng tab.
 *
 * ⚠ Mọi thao tác đều bọc `try/catch`: Safari private mode / ITP / chế độ
 * ẩn danh chặn storage → không được ném lỗi làm sập app.
 */

/** Chế độ lưu — quyết định bởi checkbox "Ghi nhớ đăng nhập". */
export type PersistenceMode = 'local' | 'session'

/**
 * Trả về `Storage` tương ứng, hoặc `null` khi không có `window` (SSR).
 */
export function storageFor(mode: PersistenceMode): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return mode === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    // Safari private mode có thể ném khi truy cập `window.localStorage`.
    return null
  }
}

/** Đọc 1 key từ storage của `mode`. Trả `null` nếu không có / bị chặn. */
export function readKey(key: string, mode: PersistenceMode): string | null {
  const storage = storageFor(mode)
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Ghi 1 key vào storage của `mode`.
 *
 * @param value `null` → xoá key thay vì ghi.
 */
export function writeKey(
  key: string,
  value: string | null,
  mode: PersistenceMode,
): void {
  const storage = storageFor(mode)
  if (!storage) return
  try {
    if (value) {
      storage.setItem(key, value)
    } else {
      storage.removeItem(key)
    }
  } catch {
    /* storage bị chặn hoặc đầy → bỏ qua, store in-memory vẫn còn */
  }
}

/** Xoá 1 key ở storage của `mode`. */
export function removeKey(key: string, mode: PersistenceMode): void {
  writeKey(key, null, mode)
}

/**
 * Xoá 1 key ở **CẢ HAI** storage.
 *
 * Dùng khi logout, token hết hạn, hoặc khi cần dọn "bản sao" của chế độ
 * lưu còn lại (vd đổi từ 'local' sang 'session' → xoá bản ở 'local').
 */
export function removeKeyEverywhere(key: string): void {
  writeKey(key, null, 'local')
  writeKey(key, null, 'session')
}
