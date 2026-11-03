/**
 * Cấu hình base URL cho Axios — đọc & **kiểm tra** `VITE_API_BASE_URL`.
 *
 * ## Vì sao cần module riêng?
 * `client.ts` chỉ nên lo "tạo axios instance + interceptor". Việc đọc env,
 * chuẩn hoá URL và **validate** là logic thuần ⇒ tách ra để:
 *   - test được (không cần import axios),
 *   - `main.tsx` dùng được để chặn app khởi động khi cấu hình sai.
 *
 * ## Luồng quyết định
 *
 * | Môi trường | `VITE_API_BASE_URL` | `baseURL` của axios | Cách gọi |
 * | ---------- | -------------------- | -------------------- | --------- |
 * | Dev        | có / không           | `''` (same-origin)    | `/api/...` → **Vite proxy** forward sang BE (né CORS) |
 * | Production | **bắt buộc có**      | origin của BE        | gọi thẳng `https://be/api/...` (HTTPS, không CORS) |
 *
 * ⚠ Trong DEV, `VITE_API_BASE_URL` **không** dùng làm `baseURL` của axios:
 *   nếu dùng thì request thoát khỏi origin của Vite → CORS lỗi.
 *   Biến đó ở dev chỉ là **target cho proxy** (xem `vite.config.ts`).
 *   → `baseURL = ''` ⇒ axios gọi `window.location.origin + /api/...`
 *     ⇒ Vite proxy (`server.proxy['/api']`) forward sang backend thật.
 *
 * ⚠ Chuẩn hoá: bỏ dấu `/` cuối và hậu tố `/api`.
 *   Endpoint trong `*.api.ts` đã chứa sẵn `/api/...` và axios cộng chuỗi,
 *   nên `VITE_API_BASE_URL=https://host/api` sẽ tạo `/api/api/users` → 404.
 *   ⇒ Luôn quy về **origin**: `https://host`.
 */

/** Tên biến môi trường (chuẩn Vite: prefix `VITE_` ⇒ được expose ra client). */
export const API_BASE_URL_ENV_KEY = 'VITE_API_BASE_URL'

/** Môi trường đang chạy. */
export type ApiEnvMode = 'development' | 'production'

/** Kết quả kiểm tra cấu hình. */
export interface ApiConfigResolution {
  /**
   * `baseURL` sẽ gán cho axios instance.
   *
   * - `''` ⇒ same-origin (dùng cho dev + proxy Vite).
   * - `'https://host'` ⇒ gọi thẳng backend (production).
   */
  baseUrl: string
  /** `true` nếu cấu hình dùng được. */
  isValid: boolean
  /** Môi trường đang chạy. */
  mode: ApiEnvMode
  /** Raw value đọc từ env (đã trim) — `null` nếu không có. */
  rawValue: string | null
  /** Thông báo lỗi (null nếu hợp lệ). */
  error: string | null
  /** Hướng dẫn cách sửa (null nếu hợp lệ). */
  hint: string | null
}

/**
 * Chuẩn hoá base URL về **origin**.
 *
 * - Bỏ dấu `/` cuối: `https://host/` → `https://host`.
 * - Bỏ hậu tố `/api`: `https://host/api` → `https://host`.
 *   (Endpoint đã chứa sẵn `/api/...` ⇒ giữ hậu tố sẽ thành `/api/api/...`.)
 *
 * ⚠ KHÔNG đụng vào `/api` nằm giữa path (vd `/api/v1`) — chỉ bỏ hậu tố cuối.
 */
export function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  return trimmed
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')
}

/**
 * Kiểm tra base URL có dùng được cho production không.
 *
 * @returns `null` nếu hợp lệ, hoặc thông báo lỗi.
 */
export function validateProductionBaseUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return `Thiếu biến môi trường ${API_BASE_URL_ENV_KEY}.`
  }

  if (trimmed.startsWith('/')) {
    return (
      `${API_BASE_URL_ENV_KEY} phải là URL tuyệt đối (bắt đầu bằng http:// hoặc https://), ` +
      `không phải đường dẫn tương đối. Giá trị hiện tại: "${trimmed}".`
    )
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return (
      `${API_BASE_URL_ENV_KEY} phải bắt đầu bằng "http://" hoặc "https://". ` +
      `Giá trị hiện tại: "${trimmed}".`
    )
  }

  // ⚠ Bắt placeholder chưa được sửa (copy nguyên từ `.env.example`).
  //   `new URL('https://<your-backend-domain>/api')` **ném** ⇒ nếu không có
  //   nhánh này thì lỗi chỉ hiện "không phải URL hợp lệ", rất khó đoán.
  if (/<[^>]+>/.test(trimmed)) {
    return (
      `${API_BASE_URL_ENV_KEY} vẫn còn placeholder ` +
      `(<your-backend-domain>). Hãy thay bằng domain thật của backend.`
    )
  }

  try {
    // `URL` parse để bắt URL hỏng (vd "https://" hoặc ký tự lạ).
    const parsed = new URL(trimmed)
    if (!parsed.hostname) {
      return `${API_BASE_URL_ENV_KEY} không phải URL hợp lệ: "${trimmed}".`
    }
  } catch {
    return `${API_BASE_URL_ENV_KEY} không phải URL hợp lệ: "${trimmed}".`
  }

  return null
}

/**
 * Đọc env & quyết định `baseURL`.
 *
 * ⚠ `env` là **tham số bắt buộc** — module này thuần túy, KHÔNG đọc
 *   `import.meta.env` (giúp test được bằng CommonJS loader, vốn không hỗ trợ
 *   cú pháp `import.meta`). Việc đọc env thật nằm ở `client.ts`.
 *
 * @param env Nguồn env (thường là `import.meta.env`).
 */
export function resolveApiConfig(
  env: Record<string, unknown>,
): ApiConfigResolution {
  const isDev = env.DEV === true || env.MODE === 'development'
  const mode: ApiEnvMode = isDev ? 'development' : 'production'

  const rawValue =
    typeof env[API_BASE_URL_ENV_KEY] === 'string'
      ? (env[API_BASE_URL_ENV_KEY] as string).trim()
      : null

  // ── DEV: luôn dùng proxy Vite (same-origin) ──────────────────────────
  // `baseURL = ''` ⇒ axios gọi `window.location.origin/api/...` ⇒ Vite proxy
  // forward sang backend thật (xem `vite.config.ts` → `server.proxy['/api']`).
  if (isDev) {
    return {
      baseUrl: '',
      isValid: true,
      mode,
      rawValue,
      error: null,
      hint: null,
    }
  }

  // ── PRODUCTION: bắt buộc có & phải hợp lệ ─────────────────────────────
  const error = validateProductionBaseUrl(rawValue ?? '')

  if (error) {
    return {
      baseUrl: '',
      isValid: false,
      mode,
      rawValue,
      error,
      hint:
        `Đặt ${API_BASE_URL_ENV_KEY}=https://<your-backend-domain>/api ` +
        `trong biến môi trường của CI/CD (hoặc file .env.production) rồi build lại.`,
    }
  }

  return {
    baseUrl: normalizeApiBaseUrl(rawValue ?? ''),
    isValid: true,
    mode,
    rawValue,
    error: null,
    hint: null,
  }
}

/**
 * Log cảnh báo cấu hình sai (production thiếu env).
 *
 * ⚠ Dùng `console.error` (không phải `warn`) vì đây là lỗi **chặn app**
 *   chạy đúng — không phải cảnh báo thông thường.
 */
export function reportApiConfigProblem(config: ApiConfigResolution): void {
  if (config.isValid) return

  console.error(
    [
      '[MCMS API] Cấu hình API không hợp lệ — ứng dụng sẽ không gọi được backend.',
      `  Lỗi: ${config.error ?? 'Không xác định'}`,
      `  Cách sửa: ${config.hint ?? ''}`,
      `  Biến: ${API_BASE_URL_ENV_KEY}`,
    ].join('\n'),
  )
}
