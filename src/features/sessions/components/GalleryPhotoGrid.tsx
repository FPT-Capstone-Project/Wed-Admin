import { Flex, Image, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { tokens } from '../../../app/theme/tokens'
import type { SessionGalleryPhoto } from '../types/session-gallery.types'

interface GalleryPhotoGridProps {
  photos: readonly SessionGalleryPhoto[]
  /** Bấm vào ảnh — dùng để mở modal xem đầy đủ. */
  onSelect?: (photo: SessionGalleryPhoto) => void
  /** Số ảnh tối đa hiển thị (phần còn lại gom thành "+N"). */
  maxVisible?: number
}

/**
 * Lưới thumbnail ảnh kiểm tra — **read-only**.
 *
 * ⚠ Dùng cho tab "Thư viện ảnh" của màn Phiên (tóm tắt nhanh), modal
 *   `SessionGalleryModal` mới là nơi xem đầy đủ (có phân trang/kếo).
 */
export function GalleryPhotoGrid({
  photos,
  onSelect,
  maxVisible = 12,
}: GalleryPhotoGridProps) {
  const visible = photos.slice(0, maxVisible)
  const overflow = photos.length - visible.length

  return (
    <Flex gap={8} wrap>
      {visible.map((photo) => {
        const title = [
          photo.takenAt
            ? dayjs(photo.takenAt).format('DD/MM/YYYY HH:mm')
            : null,
          photo.trayLabel ? `Khay ${photo.trayLabel}` : null,
          photo.caption,
        ]
          .filter(Boolean)
          .join(' · ')

        const content = (
          <Image
            src={photo.url}
            alt={title || 'Ảnh kiểm tra'}
            width={84}
            height={84}
            preview={false}
            style={{ objectFit: 'cover', borderRadius: tokens.radius.sm }}
          />
        )

        return (
          <Tooltip key={photo.sourceUrl} title={title}>
            <span
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onClick={onSelect ? () => onSelect(photo) : undefined}
              onKeyDown={
                onSelect
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(photo)
                      }
                    }
                  : undefined
              }
              style={{
                display: 'inline-block',
                borderRadius: tokens.radius.sm,
                overflow: 'hidden',
                border: '1px solid var(--mcms-border-soft)',
                cursor: onSelect ? 'pointer' : 'default',
              }}
            >
              {content}
            </span>
          </Tooltip>
        )
      })}

      {overflow > 0 && (
        <Typography.Text
          type="secondary"
          style={{
            alignSelf: 'center',
            fontSize: 12,
            paddingInline: 4,
          }}
        >
          +{overflow} ảnh
        </Typography.Text>
      )}
    </Flex>
  )
}
