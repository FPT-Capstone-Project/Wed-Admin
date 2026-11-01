import { LoadingOutlined } from '@ant-design/icons'
import { Spin } from 'antd'

/**
 * Full-screen loading fallback dùng cho `React.lazy()` route chunks.
 * Spinner và nhãn tải dùng token chữ trung tính.
 */
export function PageFallback() {
  return (
    <div
      className="page-fallback"
      role="status"
      aria-live="polite"
      aria-label="Đang tải trang"
    >
      <Spin
        size="large"
        style={{ color: 'var(--mcms-text-muted)' }}
        indicator={<LoadingOutlined spin style={{ color: 'var(--mcms-text-muted)' }} />}
        description="Đang tải trang..."
      />
    </div>
  )
}
