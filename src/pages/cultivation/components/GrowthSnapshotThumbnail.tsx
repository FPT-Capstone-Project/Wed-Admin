import '../../../styles/media-industrial.css'
import { useState } from 'react'
import { PictureOutlined } from '@ant-design/icons'

interface GrowthSnapshotThumbnailProps {
  /** URL ảnh Unsplash hoặc rỗng (khi chưa tới ngày chụp) */
  src: string
  /** Alt text hiển thị khi ảnh tải xong hoặc fallback */
  alt: string
  /** CSS class tùy chỉnh cho phần tử <img> — phối hợp với CultivationBatchCard / BatchDailyPhotosModal */
  className?: string
  /** Gợi ý tải: lazy = true cho dải 7 thumbnail, eager = true cho ảnh chính */
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
}

/**
 * Component thumbnail ảnh sinh trưởng có 3 tầng fallback:
 * 1. Nếu `src` rỗng → placeholder icon "Chưa chụp".
 * 2. Nếu `src` lỗi (Unsplash 404, mạng chậm) → tự động chuyển sang placeholder xám sạch.
 * 3. Nếu `src` hợp lệ → render <img> bình thường.
 *
 * Tách thành component riêng để dùng chung giữa:
 *  - CultivationBatchCard (ảnh chính + dải 7 ngày)
 *  - BatchDailyPhotosModal (viewer chính + thumbnail strip)
 *  - BatchPlaybackModal (gallery filter)
 */
export function GrowthSnapshotThumbnail({
  src,
  alt,
  className,
  loading = 'lazy',
  decoding = 'async',
}: GrowthSnapshotThumbnailProps) {
  const [hasError, setHasError] = useState(false)

  // Ảnh rỗng (chưa tới ngày) → render placeholder, không cần <img>
  if (!src) {
    return (
      <div className="growth-snapshot-placeholder" role="img" aria-label={alt}>
        <PictureOutlined aria-hidden="true" />
        <span className="growth-snapshot-placeholder-label">Chưa có ảnh</span>
      </div>
    )
  }

  // Ảnh đã lỗi (Unsplash 404 hoặc network error) → placeholder xám
  if (hasError) {
    return (
      <div
        className={['growth-snapshot-placeholder', 'is-error', className]
          .filter(Boolean)
          .join(' ')}
        role="img"
        aria-label={`${alt} (không tải được ảnh)`}
      >
        <PictureOutlined aria-hidden="true" />
        <span className="growth-snapshot-placeholder-label">Ảnh lỗi tải</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={['mcms-growth-snapshot', className].filter(Boolean).join(' ')}
      loading={loading}
      decoding={decoding}
      onError={() => setHasError(true)}
    />
  )
}
