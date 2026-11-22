type ErrorRecord = Record<string, unknown>

export function apiErrorStatus(error: unknown): number | undefined {
  for (const item of errorChain(error)) {
    const status = asRecord(item.response)?.status ?? item.status
    if (typeof status === 'number') return status
  }
  return undefined
}

function asRecord(value: unknown): ErrorRecord | undefined {
  return value !== null && typeof value === 'object'
    ? value as ErrorRecord
    : undefined
}

/** Theo lỗi gốc có giới hạn và tránh chuỗi cause tuần hoàn. */
function errorChain(error: unknown): ErrorRecord[] {
  const chain: ErrorRecord[] = []
  let current = asRecord(error)
  while (current && chain.length < 5 && !chain.includes(current)) {
    chain.push(current)
    current = asRecord(current.cause)
  }
  return chain
}

function vietnameseMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  // Chỉ chuyển thông báo tiếng Việt; không lộ lỗi Axios/stack/HTML thô.
  if (!/[À-ỹĐđ]/u.test(text) || /<[^>]+>|\b(?:SQL|stack trace|AxiosError)\b|\/api(?:\/|\b)|\b(?:GET|POST|PATCH|DELETE|PUT)\s+\//iu.test(text)) return undefined
  return text || undefined
}

/** Thông báo thân thiện, ưu tiên friendlyMessage được interceptor chuẩn hoá. */
export function resolveApiErrorMessage(error: unknown, actionLabel?: string): string {
  const chain = errorChain(error)
  for (const item of chain) {
    const friendly = vietnameseMessage(item.friendlyMessage)
    if (friendly) return friendly
  }
  for (const item of chain) {
    const response = asRecord(item.response)
    const payload = response?.data
    const data = asRecord(payload)
    const message = vietnameseMessage(payload)
      ?? vietnameseMessage(data?.message)
      ?? vietnameseMessage(data?.detail)
      ?? vietnameseMessage(data?.error)
    if (message) return message
    if (item.code === 'ECONNABORTED' || item.code === 'ETIMEDOUT') {
      return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
    }
    switch (response?.status) {
      case 400: return 'Yêu cầu không hợp lệ.'
      case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      case 403: return 'Bạn không có quyền thực hiện thao tác này.'
      case 404: return 'Không tìm thấy tài nguyên yêu cầu.'
      case 409: return 'Dữ liệu bị xung đột. Vui lòng kiểm tra lại.'
      case 422: return 'Dữ liệu chưa hợp lệ.'
      case 429: return 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'
    }
    if (typeof response?.status === 'number' && response.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
    }
    if (item.code === 'ERR_NETWORK' || (item.isAxiosError && !response)) {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng.'
    }
  }
  for (const item of chain) {
    const message = vietnameseMessage(item.message)
    if (message) return message
  }
  return vietnameseMessage(error)
    ?? (actionLabel ? `Không thể ${actionLabel}. Vui lòng thử lại.` : 'Đã xảy ra lỗi. Vui lòng thử lại.')
}

/** Cùng config mà toast trì hoãn đang giữ, nên cờ này ngăn thông báo trùng. */
export function markApiErrorHandled(error: unknown): void {
  for (const item of errorChain(error)) {
    const config = asRecord(item.config)
    if (config && !Object.isFrozen(config)) config.skipGlobalErrorToast = true
  }
}

export function showApiError(
  error: unknown,
  actionLabel: string,
  notify: (text: string) => void,
): void {
  markApiErrorHandled(error)
  notify(resolveApiErrorMessage(error, actionLabel))
}
