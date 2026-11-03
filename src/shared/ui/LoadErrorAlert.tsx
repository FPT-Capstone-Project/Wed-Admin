import { Alert, Button } from 'antd'
import { isAxiosError } from 'axios'
import { extractApiError } from '../api/error'
export function LoadErrorAlert({ error, resource, onRetry }: { error: unknown; resource: string; onRetry: () => unknown }) {
  const detail = extractApiError(error)
  const subject = isAxiosError(error) && error.config?.url?.includes('/farm/sessions')
    ? 'danh sách phiên canh tác' : resource
  const description = detail.status === 404
    ? `Không thể tải ${subject} (Mã lỗi 404: Endpoint phía máy chủ chưa sẵn sàng)`
    : `Không thể tải ${subject}: ${detail.message}`
  return <Alert type="error" showIcon message={description} action={<Button onClick={() => void onRetry()}>Thử lại</Button>} />
}
