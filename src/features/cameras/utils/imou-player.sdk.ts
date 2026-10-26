/**
 * Nạp ImouPlayer SDK từ `public/imou-player/` (file tĩnh, gồm Wasm).
 *
 * SDK gán constructor lên `window.imouPlayer`. Không import npm — file
 * `imou-player.js` ~1.6MB chỉ tải khi mở modal live.
 */

export const IMOU_PLAYER_BASE = '/imou-player'
export const IMOU_PLAYER_SCRIPT = `${IMOU_PLAYER_BASE}/imou-player.js`
export const IMOU_PLAYER_STYLES = `${IMOU_PLAYER_BASE}/imou-player.css`
/**
 * Path prefix cho WasmLib.
 *
 * ⚠ SDK tự nối `${WasmLibPath}WasmLib/{Multi,Single}Thread/...`, nên giá trị
 * này phải là **thư mục cha** của `WasmLib` và có dấu `/` cuối.
 *
 * - `'/imou-player/'` → `'/imou-player/WasmLib/SingleThread/liblcplay.js'` ✅
 * - `'/imou-player/WasmLib'` → `'/imou-player/WasmLibWasmLib/...'` ❌ (404)
 */
export const IMOU_WASM_LIB_PATH = `${IMOU_PLAYER_BASE}/`

/**
 * Domain Imou Open Platform mà SDK gọi để lấy playback address.
 *
 * ⚠ SDK **không** có base URL mặc định: `domain` mặc định là `""` → SDK
 * POST `/openapi/getEncryptKitStreamUrl` **tương đối với origin của app**
 * (vd `http://localhost:5173/openapi/...`) → Vite trả 404 → SDK báo
 * "Failed to obtain playback address".
 *
 * Domain phải trỏ tới Open Platform theo data center của tài khoản Imou
 * (Control Board → My Information). Mặc định dùng East Asia (Singapore).
 * Override qua biến môi trường `VITE_IMOU_API_DOMAIN` nếu app của bạn thuộc
 * data center khác.
 *
 * Lưu ý: các host này trả `Access-Control-Allow-Origin: *` cho preflight
 * → gọi trực tiếp từ trình duyệt không bị chặn CORS.
 */
export const IMOU_API_DOMAIN = (
  import.meta.env.VITE_IMOU_API_DOMAIN as string | undefined
)?.trim() || 'https://openapi-sg.easy4ip.com'

export const IMOU_PLAYER_DOM_ID = 'imou-player-window'

export interface ImouPlayerErrorPayload {
  errCode?: number | string
  errMsg?: string
  message?: string
}

export interface ImouPlayerCallbackPayload {
  type?: string
}

export interface ImouPlayerOptions {
  id: string
  width: number
  height: number
  deviceId: string
  channelId: string | number
  token: string
  type: number | string
  streamId?: number | string
  recordType?: string
  muted?: boolean
  code?: string
  title?: string
  /**
   * Domain Imou Open Platform (vd `https://openapi-sg.easy4ip.com`).
   *
   * Bắt buộc — SDK mặc định `""` → gọi `/openapi/...` tương đối với
   * origin của app → 404 → "Failed to obtain playback address".
   */
  domain?: string
  /** Đường dẫn tới WasmLib — SDK nối `${WasmLibPath}WasmLib/...`. */
  WasmLibPath?: string
  /** `multiThread` (mặc định) hoặc `singleThread`. */
  threadMode?: 'multiThread' | 'singleThread'
  /** Device pixel ratio — tránh răng cưa khi render trên màn hình Retina. */
  dpr?: number
  handleError?: (err: ImouPlayerErrorPayload) => void
  handleCallBack?: (event: ImouPlayerCallbackPayload) => void
}

export interface ImouPlayerInstance {
  play: () => void
  stop: () => void
  pause: () => void
  start: () => void
  destroy: () => void
}

export type ImouPlayerConstructor = new (
  options: ImouPlayerOptions,
) => ImouPlayerInstance

type ImouWindow = Window & { imouPlayer?: ImouPlayerConstructor }

let loadPromise: Promise<ImouPlayerConstructor> | null = null

function injectStylesheet() {
  if (document.querySelector(`link[data-imou-player-css="true"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = IMOU_PLAYER_STYLES
  link.setAttribute('data-imou-player-css', 'true')
  document.head.appendChild(link)
}

function readConstructor(): ImouPlayerConstructor | null {
  const ctor = (window as ImouWindow).imouPlayer
  return typeof ctor === 'function' ? ctor : null
}

export function loadImouPlayerSdk(): Promise<ImouPlayerConstructor> {
  const existing = readConstructor()
  if (existing) return Promise.resolve(existing)
  if (loadPromise) return loadPromise

  injectStylesheet()

  loadPromise = new Promise((resolve, reject) => {
    const ready = readConstructor()
    if (ready) {
      resolve(ready)
      return
    }

    const previous = document.querySelector<HTMLScriptElement>(
      'script[data-imou-player-js="true"]',
    )
    if (previous) {
      // Script cũ đã nạp xong nhưng constructor không có → nạp lại từ đầu
      // (lần trước đã lỗi, script không còn dùng được).
      previous.remove()
    }

    const script = document.createElement('script')
    script.src = IMOU_PLAYER_SCRIPT
    script.async = true
    script.setAttribute('data-imou-player-js', 'true')
    script.onload = () => {
      const ctor = readConstructor()
      if (ctor) resolve(ctor)
      else {
        loadPromise = null
        script.remove()
        reject(new Error('ImouPlayer SDK đã tải nhưng không khởi tạo được.'))
      }
    }
    script.onerror = () => {
      loadPromise = null
      script.remove()
      reject(new Error('Không tải được ImouPlayer SDK.'))
    }
    document.body.appendChild(script)
  })

  return loadPromise
}

export function describeImouPlayerError(err: ImouPlayerErrorPayload): string {
  const code = err.errCode != null ? String(err.errCode) : ''
  const msg = err.errMsg || err.message || 'Không phát được luồng camera.'
  return code ? `${msg} (mã ${code})` : msg
}

/**
 * Đọc `status.message` của player — nơi SDK ghi lý do server từ chối cấp
 * playback address (vd `KitToken expired or does not exist...`, mã `OP1023`).
 *
 * Lỗi này **không** đi qua `handleError` (SDK chỉ set `status.message` rồi
 * `stop()`), nên nếu không đọc `status.message` thì UI chỉ hiện thông báo
 * chung chung "Failed to obtain playback address".
 */
export function readImouPlayerMessage(player: ImouPlayerInstance): string {
  const status = (player as { status?: { message?: unknown } }).status
  const message = status?.message
  return typeof message === 'string' ? message.trim() : ''
}
