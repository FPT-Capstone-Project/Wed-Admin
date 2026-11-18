import { useEffect } from 'react'
import { Alert, Button, Spin } from 'antd'
import {
  markApiErrorHandled,
  resolveApiErrorMessage,
} from '../api/error-mapper'

/**
 * Feedback trạng thái của một query (loading / error / null).
 *
 * ⚠ Message lỗi **luôn** đi qua {@link resolveApiErrorMessage} ⇒ không bao
 *   giờ lộ message thô của axios hay message tiếng Anh chưa dịch.
 */
export function QueryFeedback({
  query,
}: {
  query: {
    isLoading: boolean
    isError: boolean
    error: unknown
    refetch: () => unknown
  }
}) {
  const { error } = query

  useEffect(() => {
    if (query.isError) markApiErrorHandled(error)
  }, [query.isError, error])

  if (query.isError) {
    return (
      <Alert
        showIcon
        type="error"
        title="Không tải được dữ liệu"
        description={resolveApiErrorMessage(error, 'tải dữ liệu')}
        action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
      />
    )
  }
  if (query.isLoading) return <Spin aria-label="Đang tải dữ liệu" />
  return null
}
