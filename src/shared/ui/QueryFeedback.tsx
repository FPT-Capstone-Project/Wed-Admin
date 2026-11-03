import { Alert, Button, Spin } from 'antd'
import { getApiErrorMessage } from '../api/error'
export function QueryFeedback({ query }: { query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown } }) {
  if (query.isError) return <Alert showIcon type="error" title="Không tải được dữ liệu" description={getApiErrorMessage(query.error)} action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} />
  if (query.isLoading) return <Spin aria-label="Đang tải dữ liệu" />
  return null
}
