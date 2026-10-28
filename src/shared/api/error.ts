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