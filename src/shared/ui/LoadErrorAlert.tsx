import { useEffect } from 'react'
import { Alert, Button } from 'antd'
import {
  markApiErrorHandled,
  resolveApiErrorMessage,
} from '../api/error-mapper'

/**
 * Alert lỗi tải dữ liệu — dùng chung cho mọi màn hình.
 *
 * ⚠ Message **luôn** đi qua {@link resolveApiErrorMessage} ⇒ không bao giờ
 *   lộ ra message thô của axios ("Request failed with status code 500") hay
 *   message tiếng Anh chưa dịch của Backend.
 *
 * ⚠ Đánh dấu lỗi là "đã xử lý" ⇒ toast lỗi **toàn cục** của axios bị huỷ
 *   ⇒ người dùng không thấy 2 thông báo trùng nhau (1 toast + 1 inline).
 */
export function LoadErrorAlert({
  error,
  resource,
  onRetry,
}: {
  error: unknown
  resource: string
  onRetry: () => unknown
}) {
  useEffect(() => {
    markApiErrorHandled(error)
  }, [error])

  const status =
    (error as { response?: { status?: number } } | null | undefined)?.response
      ?.status ?? null

  const description =
    status === 404
      ? `Không thể tải ${resource} (Mã lỗi 404: Endpoint phía máy chủ chưa sẵn sàng)`
      : `Không thể tải ${resource}: ${resolveApiErrorMessage(error, `tải ${resource}`)}`

  return (
    <Alert
      type="error"
      showIcon
      title={description}
      action={<Button onClick={() => void onRetry()}>Thử lại</Button>}
    />
  )
}
