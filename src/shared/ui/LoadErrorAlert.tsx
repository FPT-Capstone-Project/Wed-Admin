import { Alert, Button } from 'antd'
import { extractApiError } from '../api/error'
export function LoadErrorAlert({ error, resource, onRetry }: { error: unknown; resource: string; onRetry: () => unknown }) {
  const detail = extractApiError(error)
  const description = detail.status === 404
    ? `Không thể tải ${resource} (Mã lỗi 404: Endpoint phía máy chủ chưa sẵn sàng)`
    : `Không thể tải ${resource}: ${detail.message}`
  return <Alert type="error" showIcon title={description} action={<Button onClick={() => void onRetry()}>Thử lại</Button>} />
}
