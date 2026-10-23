import { Spin } from 'antd'

/**
 * Full-screen loading fallback dùng cho `React.lazy()` route chunks.
 * Hiển thị spinner tinh tế với tone xanh lá chủ đạo của MCMS.
 */
export function PageFallback() {
  return (
    <div
      className="page-fallback"
      role="status"
      aria-live="polite"
      aria-label="Đang tải trang"
    >
      <Spin size="large" description="Đang tải trang..." />
    </div>
  )
}
