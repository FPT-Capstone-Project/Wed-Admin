import { useSyncExternalStore } from 'react'

/**
 * Theo dõi trạng thái hiển thị của **tab trình duyệt**.
 *
 * ⚠ **Vì sao cần?**
 *   `document.visibilityState === 'hidden'` ⇒ người dùng đang ở tab khác
 *   (hoặc cửa sổ khác) ⇒ polling là **lãng phí request** và dồn tải lên
 *   BE/Supabase mà không ai nhìn thấy.
 *
 *   TanStack Query đã tự dừng refetch khi window mất focus, nhưng:
 *   - Nhiều component trong app vẫn giữ `refetchInterval` chạy nền ⇒ vẫn tạo
 *     request (đặc biệt khi component được mount nhưng **không** hiển thị).
 *   - Ta muốn **dừng hẳn** timer thay vì chỉ bỏ qua lần refetch kế tiếp.
 *
 * @returns `true` khi tab đang hiển thị, `false` khi tab bị ẩn.
 */
export function useDocumentVisibility(): boolean {
  return useSyncExternalStore(
    subscribeVisibilityChange,
    getVisibilitySnapshot,
    // SSR / test: coi như đang hiển thị.
    () => true,
  )
}

/** Đăng ký listener `visibilitychange`. */
function subscribeVisibilityChange(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {}

  document.addEventListener('visibilitychange', onChange)
  return () => {
    document.removeEventListener('visibilitychange', onChange)
  }
}

/** Snapshot hiện tại — chỉ trả `boolean` để React so sánh được. */
function getVisibilitySnapshot(): boolean {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible'
}
