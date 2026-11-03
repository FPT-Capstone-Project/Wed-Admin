import { extractApiError } from './error'

/**
 * Helper cho các API **phụ** (đọc dữ liệu bổ sung) mà không được phép làm
 * hỏng trang nếu BE trả lỗi.
 *
 * ## Vì sao cần
 *
 * Nhiều trang tổng hợp dữ liệu từ nhiều endpoint: 1 endpoint chính (bắt buộc)
 * + nhiều endpoint phụ (chỉ để bổ sung thông tin). Nếu endpoint phụ trả
 * `404` (chưa có bản ghi) hoặc `403` (thiếu quyền), trang sẽ báo lỗi đỏ và
 * **mất hoàn toàn** phần dữ liệu đã lấy được từ endpoint chính.
 *
 * → `safeFetch` bọc lỗi lại thành `null` (hoặc `[]`) để UI vẫn hiển thị
 *   được dữ liệu chính.
 *
 * ⚠ Chỉ dùng cho API **phụ**. API chính (nguồn dữ liệu duy nhất của trang)
 *   phải để lỗi nổi lên để UI hiển thị banner lỗi + nút "Thử lại".
 */

/** Kiểm tra lỗi có phải "không tìm thấy" (404) hay không. */
export function isNotFoundError(error: unknown): boolean {
  return extractApiError(error).status === 404
}

/**
 * Gọi API và trả về `fallback` nếu có lỗi — **không** ném lỗi ra ngoài.
 *
 * @param factory  Hàm gọi API (thường là `() => api.list(...)`)
 * @param fallback Giá trị trả về khi lỗi (mặc định `null`)
 */
export async function safeFetch<T>(
  factory: () => Promise<T>,
  fallback: T = null as T,
): Promise<T> {
  try {
    return await factory()
  } catch {
    return fallback
  }
}

/**
 * Biến thể của `safeFetch` cho API trả về mảng — fallback mặc định là `[]`.
 */
export async function safeFetchList<T>(
  factory: () => Promise<T[]>,
): Promise<T[]> {
  return safeFetch(factory, [] as T[])
}

/**
 * Biến thể của `safeFetch` cho API trả về object — fallback mặc định là `null`.
 */
export async function safeFetchObject<T>(
  factory: () => Promise<T | null>,
): Promise<T | null> {
  return safeFetch(factory, null as T | null)
}
