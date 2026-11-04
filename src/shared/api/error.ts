import type { AxiosError } from 'axios'

/**
 * Chuẩn hoá mọi error trả về từ backend thành Error message thân thiện.
 *
 * Backend Swagger thường trả `Error { message: string }` cho validation,
 * còn các case khác có thể là string hoặc object `{message, error, statusCode}`.
 */
export interface NormalizedApiError {
  status: number | null
  code: string | null
  message: string
}

/** Mã lỗi của axios khi request hết thời gian chờ. */
const AXIOS_TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT'])

/**
 * Thông báo thân thiện khi **thông tin đăng nhập không đúng**.
 *
 * ⚠ Không dùng message mặc định của axios ("Request failed with status code
 *   401") — quá kỹ thuật, người dùng không biết cần làm gì.
 */
export const INVALID_CREDENTIALS_MESSAGE =
  'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.'

/**
 * Message 401 "chung chung" của BE — không giúp ích cho người dùng.
 *
 * Khi gặp các message này ⇒ fallback sang `INVALID_CREDENTIALS_MESSAGE`.
 */
const GENERIC_UNAUTHORIZED_MESSAGES = new Set([
  'unauthorized',
  'unauthenticated',
  'forbidden',
  'error',
  'invalid credentials',
  'invalid email or password',
  'invalid email or password.',
  'email or password is incorrect',
  'incorrect email or password',
  'wrong password',
  'request failed with status code 401',
  'bạn không có quyền thực hiện thao tác này.',
  // Message mặc định theo status 401 — nói về "hết phiên", không đúng ngữ
  // cảnh khi user chỉ nhập sai mật khẩu.
  'phiên đăng nhập đã hết hạn. vui lòng đăng nhập lại.',
])

/**
 * Message có chứa **dấu tiếng Việt** không?
 *
 * ⚠ Vì sao cần?
 *   BE trả message tiếng Anh (vd: "Invalid email or password") cho endpoint
 *   đăng nhập. Web Admin là UI **tiếng Việt** ⇒ hiển thị nguyên xi message
 *   của BE sẽ lệch ngôn ngữ. Hàm này giúp phân biệt: message BE đã là
 *   tiếng Việt ⇒ dùng; message tiếng Anh / rỗng ⇒ fallback sang thông báo
 *   tiếng Việt chuẩn.
 */
function containsVietnameseDiacritics(text: string): boolean {
  return /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐÀÁẢÃẠĂÂÈÉÊÌÍÒÓÔƠÙÚƯĐ]/u.test(
    text,
  )
}

/** URL endpoint đăng nhập — 401 ở đây nghĩa là **sai thông tin**, không phải hết phiên. */
const LOGIN_URL_FRAGMENT = '/api/auth/login'

function readString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function extractApiError(error: unknown): NormalizedApiError {
  if (!error) {
    return { status: null, code: null, message: 'Lỗi không xác định.' }
  }

  // Plain Error → dùng message
  if (error instanceof Error && !(error as AxiosError).isAxiosError) {
    return { status: null, code: null, message: error.message }
  }

  const axiosError = error as AxiosError<unknown>
  const code = axiosError.code ?? null

  // Timeout → thông báo riêng (message mặc định của axios rất kỹ thuật:
  // "timeout of 60000ms exceeded").
  if (code && AXIOS_TIMEOUT_CODES.has(code)) {
    return {
      status: null,
      code,
      message: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
    }
  }

  // Không có response (network down, CORS, ...) → fallback
  if (!axiosError.response) {
    return {
      status: null,
      code,
      message:
        axiosError.message ||
        'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng.',
    }
  }

  const status = axiosError.response.status
  const payload = axiosError.response.data as unknown

  if (typeof payload === 'string') {
    return { status, code: null, message: payload }
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    const message =
      readString(obj, 'message') ??
      readString(obj, 'detail') ??
      readString(obj, 'error') ??
      defaultMessageForStatus(status)

    return {
      status,
      code: readString(obj, 'code'),
      message,
    }
  }

  return { status, code: null, message: defaultMessageForStatus(status) }
}

/**
 * Chuẩn hoá lỗi **đăng nhập** thành message thân thiện tiếng Việt.
 *
 * ⚠ Vì sao cần hàm riêng?
 *   - 401 ở endpoint đăng nhập = **sai email/mật khẩu**, KHÔNG phải hết
 *     phiên ⇒ không được dùng message "Phiên đăng nhập đã hết hạn".
 *   - Message mặc định của axios ("Request failed with status code 401")
 *     hoặc message kỹ thuật từ BE không giúp ích người dùng.
 *
 * Thứ tự ưu tiên:
 *   1. `response.data.message` / `response.data.detail` **nếu** đủ cụ thể
 *      (không phải message chung chung kiểu "Unauthorized").
 *   2. Fallback: `INVALID_CREDENTIALS_MESSAGE`.
 *
 * @param error Lỗi axios (hoặc Error bất kỳ) do `POST /api/auth/login` ném ra.
 */
export function extractLoginErrorMessage(error: unknown): string {
  const { status, message } = extractApiError(error)

  if (status === 401 || isLoginRequest(error)) {
    const normalized = message.trim().toLowerCase()
    const isGeneric =
      GENERIC_UNAUTHORIZED_MESSAGES.has(normalized) ||
      /^request failed with status code/i.test(message) ||
      /^(http )?\d{3}$/.test(normalized)

    // Ưu tiên message BE **đã là tiếng Việt** và đủ cụ thể.
    if (
      message &&
      !isGeneric &&
      containsVietnameseDiacritics(message)
    ) {
      return message
    }

    // Còn lại (message rỗng / tiếng Anh / chung chung) ⇒ thông báo chuẩn.
    return INVALID_CREDENTIALS_MESSAGE
  }

  return message
}

/** Request này có gọi tới endpoint đăng nhập không? */
function isLoginRequest(error: unknown): boolean {
  const url = (error as { config?: { url?: string } })?.config?.url
  return typeof url === 'string' && url.includes(LOGIN_URL_FRAGMENT)
}

export function getApiErrorMessage(error: unknown): string {
  return extractApiError(error).message
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Yêu cầu không hợp lệ.'
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.'
    case 404:
      return 'Không tìm thấy tài nguyên yêu cầu.'
    case 409:
      return 'Dữ liệu bị xung đột. Vui lòng kiểm tra lại.'
    case 422:
      return 'Dữ liệu chưa hợp lệ.'
    case 429:
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
    default:
      return `Lỗi HTTP ${status}.`
  }
}