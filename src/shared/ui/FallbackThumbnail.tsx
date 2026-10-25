import { useState } from 'react'
import type { CSSProperties } from 'react'
import { PictureOutlined } from '@ant-design/icons'

export interface FallbackThumbnailProps {
  /** URL ảnh. Rỗng / hỏng → hiện khung đại diện. */
  src?: string | null
  /** Tên dùng cho alt + tooltip. */
  alt: string
  /** Kích thước khung (px). Mặc định 56px. */
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * Thumbnail hình ảnh an toàn với fallback khung đại diện.
 *
 * Giải quyết triệt để lỗi vỡ ảnh:
 *   - Khi URL rỗng hoặc load bị lỗi (`onError`), không bao giờ để trình duyệt
 *     render alt text làm tràn chữ/đè layout.
 *   - Hiển thị khung đại diện bo góc với nền xanh nhạt (`var(--mcms-background)`)
 *     và icon vector chuẩn từ `@ant-design/icons` (`PictureOutlined`).
 *   - Luôn kèm `title` và `aria-label` để đảm bảo accessibility (WCAG).
 */
export function FallbackThumbnail({
  src,
  alt,
  size = 56,
  className,
  style,
}: FallbackThumbnailProps) {
  const trimmed = src?.trim() ?? ''
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const isBroken = Boolean(trimmed && failedUrl === trimmed)
  const shouldRenderImage = trimmed.length > 0 && !isBroken

  const containerStyle: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    flexShrink: 0,
    borderRadius: 'var(--mcms-radius-lg)',
    border: '1px solid var(--mcms-border)',
    background: 'var(--mcms-background)',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    userSelect: 'none',
    boxSizing: 'border-box',
    ...style,
  }

  if (!shouldRenderImage) {
    return (
      <span
        className={className ? `mcms-fallback-thumbnail ${className}` : 'mcms-fallback-thumbnail'}
        title={alt}
        aria-label={alt}
        role="img"
        style={containerStyle}
      >
        <PictureOutlined
          aria-hidden="true"
          style={{
            fontSize: Math.round(size * 0.44),
            color: 'var(--mcms-primary)',
            opacity: 0.8,
          }}
        />
      </span>
    )
  }

  return (
    <span
      className={className ? `mcms-fallback-thumbnail ${className}` : 'mcms-fallback-thumbnail'}
      title={alt}
      style={containerStyle}
    >
      <img
        src={trimmed}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(trimmed)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </span>
  )
}

