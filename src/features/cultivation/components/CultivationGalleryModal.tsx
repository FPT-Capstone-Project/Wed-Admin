import { LeftOutlined, PictureOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Empty, Modal, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { MetadataBadge } from '../../../shared/ui'
import type { CultivationBatch } from '../types/cultivation.types'
import { GrowthSnapshotThumbnail } from './GrowthSnapshotThumbnail'

interface CultivationGalleryModalProps {
  batch: CultivationBatch | null
  open: boolean
  onCancel: () => void
}

interface GalleryPhoto {
  url: string
  timestamp: string | null
  caption: string
}

/**
 * Thư viện ảnh kiểm tra phôi — **read-only**.
 *
 * ⚠ Ảnh lấy từ Cloudinary qua `GET /api/farm/sessions/{id}/spawn-inspections`.
 *   Không có nút upload / xoá / ghi chú.
 */
export function CultivationGalleryModal({
  batch,
  open,
  onCancel,
}: CultivationGalleryModalProps) {
  const photos = useMemo<GalleryPhoto[]>(() => {
    if (!batch) return []

    return batch.inspections.flatMap((inspection) =>
      (inspection.images ?? [])
        .map((image) => image.secure_url ?? image.url ?? '')
        .filter((url) => url.length > 0)
        .map((url) => ({
          url,
          timestamp: inspection.checked_at ?? inspection.created_at ?? null,
          caption:
            inspection.condition ??
            `Kiểm tra #${inspection.inspection_id}`,
        })),
    )
  }, [batch])

  const [activeIndex, setActiveIndex] = useState(0)

  const batchId = batch?.id ?? null

  // Reset về ảnh đầu tiên khi đổi mẻ — so sánh trong render để tránh
  // setState trong effect (cascading render).
  const [prevState, setPrevState] = useState({ open, batchId })
  if (prevState.open !== open || prevState.batchId !== batchId) {
    setPrevState({ open, batchId })
    if (open) setActiveIndex(0)
  }

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setActiveIndex((index) => Math.max(0, index - 1))
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((index) => Math.min(photos.length - 1, index + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, photos.length])

  const activePhoto = photos[activeIndex]

  return (
    <Modal
      className="batch-daily-photos-modal"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={760}
      centered
      destroyOnHidden
      title={
        <span className="batch-daily-modal-title">
          <PictureOutlined aria-hidden="true" />
          Ảnh kiểm tra phôi
        </span>
      }
    >
      {batch && (
        <div className="batch-daily-modal-context">
          <div>
            <Typography.Text strong style={{ fontSize: 15 }}>
              Mẻ {batch.batchCode}
            </Typography.Text>
            <Typography.Text type="secondary">
              {' '}
              · {batch.mushroomType} · Khách: {batch.tenantName}
            </Typography.Text>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {photos.length} ảnh từ {batch.inspectionCount} lần kiểm tra phôi
          </Typography.Text>
        </div>
      )}

      {photos.length === 0 ? (
        <Empty description="Chưa có ảnh kiểm tra phôi cho mẻ này." />
      ) : (
        <>
          <div className="batch-daily-viewer">
            <GrowthSnapshotThumbnail
              src={activePhoto?.url ?? ''}
              alt={`Ảnh kiểm tra phôi ${activeIndex + 1}`}
              loading="eager"
              className="batch-daily-main-image"
            />

            <div className="batch-daily-viewer-label">
              <MetadataBadge label={activePhoto?.caption ?? ''} />
              <strong>
                Ảnh {activeIndex + 1} / {photos.length}
                {activePhoto?.timestamp
                  ? ` — ${dayjs(activePhoto.timestamp).format('DD/MM/YYYY HH:mm')}`
                  : ''}
              </strong>
            </div>

            <Button
              type="text"
              className="batch-daily-nav batch-daily-nav--prev"
              icon={<LeftOutlined />}
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
              aria-label="Ảnh trước"
            />
            <Button
              type="text"
              className="batch-daily-nav batch-daily-nav--next"
              icon={<RightOutlined />}
              disabled={activeIndex >= photos.length - 1}
              onClick={() =>
                setActiveIndex((index) => Math.min(photos.length - 1, index + 1))
              }
              aria-label="Ảnh sau"
            />
          </div>

          <div
            className="batch-daily-thumbs"
            role="list"
            aria-label="Chọn ảnh kiểm tra phôi"
          >
            {photos.map((photo, index) => (
              <button
                key={`${photo.url}-${index}`}
                type="button"
                role="listitem"
                className={`batch-daily-thumb ${index === activeIndex ? 'is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Ảnh kiểm tra phôi ${index + 1}`}
                aria-pressed={index === activeIndex}
              >
                <GrowthSnapshotThumbnail
                  src={photo.url}
                  alt={`Ảnh kiểm tra phôi ${index + 1}`}
                />
                <span className="batch-daily-thumb-label">
                  <strong>Ảnh {index + 1}</strong>
                  <small>
                    {photo.timestamp
                      ? dayjs(photo.timestamp).format('DD/MM')
                      : '—'}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
