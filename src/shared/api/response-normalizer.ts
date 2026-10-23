/**
 * Helpers an toàn cho việc unwrap response từ backend.
 *
 * Lý do tồn tại:
 * - Backend có thể trả về response dưới nhiều hình thức:
 *     1. Mảng trực tiếp:                  `[...]`
 *     2. Wrapper `{ data: [...] }`:       (axios client đã unwrap 1 lần — `data` = body)
 *     3. Wrapper `{ content: [...] }`:    (Spring-style)
 *     4. Wrapper `{ items: [...] }`:      (REST chuẩn)
 *     5. Object lồng:                     `{ data: { data: [...] } }` (legacy)
 * - Crash "x.map is not a function" xảy ra khi UI gọi `.map()` trực tiếp
 *   trên response nhận về mà không kiểm tra kiểu.
 *
 * Quy tắc:
 * - API layer (api/*.api.ts) PHẢI unwrap về domain type ngay tại `queryFn`.
 * - Hook layer (hooks/*.ts) PHẢI assume domain type trả về đã là array
 *       nhưng vẫn guard ở người tiêu thụ UI (useMemo, .map).
 * - UI layer (components) KHÔNG BAO GIỜ gọi `.map()` trực tiếp trên
 *       response — phải qua `ensureArray()`.
 */

/**
 * Chuẩn hoá một response bất kỳ về mảng T[].
 *
 * Hỗ trợ các wrapper thường gặp:
 * - Mảng trực tiếp → trả về mảng
 * - `{ data: T[] }` / `{ content: T[] }` / `{ items: T[] }` → unwrap 1 cấp
 * - Fallback → `[]`
 *
 * Đệ quy 1 cấp để xử lý `{ data: { data: T[] } }`.
 */
export function ensureArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[]
  }

  if (response === null || response === undefined) {
    return []
  }

  if (typeof response === 'object') {
    const obj = response as Record<string, unknown>

    // Ưu tiên `data` (chuẩn axios + JSON API), fallback `content` (Spring),
    // cuối cùng `items` (REST chuẩn).
    for (const key of ['data', 'content', 'items'] as const) {
      const candidate = obj[key]
      if (Array.isArray(candidate)) {
        return candidate as T[]
      }
      // Đệ quy 1 cấp cho `{ data: { data: T[] } }`
      if (candidate && typeof candidate === 'object') {
        const nested = ensureArray<T>(candidate)
        if (nested.length > 0 || Array.isArray((candidate as Record<string, unknown>).data)) {
          return nested
        }
      }
    }
  }

  return []
}

/**
 * Unwrap 1 object từ wrapper. Trả về `null` nếu response không phải object.
 *
 * Ví dụ:
 * - `{ success: true, data: { id: 1 } }` → `{ id: 1 }`
 * - `{ id: 1 }` (object trực tiếp) → `{ id: 1 }`
 * - `null` / `[]` / khác → `null`
 */
export function ensureObject<T>(response: unknown): T | null {
  if (response === null || response === undefined) return null
  if (typeof response !== 'object' || Array.isArray(response)) return null

  const obj = response as Record<string, unknown>

  // Common wrappers
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as T
  }
  if (obj.content && typeof obj.content === 'object' && !Array.isArray(obj.content)) {
    return obj.content as T
  }

  // Object trực tiếp
  return obj as T
}