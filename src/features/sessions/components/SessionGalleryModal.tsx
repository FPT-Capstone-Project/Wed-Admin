import { LeftOutlined, PictureOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Empty, Modal, Segmented, Spin, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { MetadataBadge, StatusBadge } from '../../../shared/ui'
import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { GrowthSnapshotThumbnail } from '../../cultivation/components/GrowthSnapshotThumbnail'
import { filterGalleryByPhase } from '../utils/session-gallery.utils'
import type {
  SessionGalleryPhoto,
  SessionGalleryPhase,
} from '../types/session-gallery.types'

interface SessionGalleryModalProps {
  open: boolean
  onCancel: () => void
  /** Danh sách ảnh đã gộp (giai đoạn 1 + giai đoạn 2). */
  photos: readonly SessionGalleryPhoto[]
  /** Thống kê số ảnh / số lần kiểm tra. */
  stats: { total: number; spawnCount: number; trayCount: number; inspectionCount: number }
  isLoading: boolean
  error: unknown
  onRetry: () => void
  /** Tiêu đề phụ — ví dụ mã phiên. */
  contextLabel?: string
}

/** Nhãn giai đoạn hiển thị cho người dùng. */
const PHASE_LABELS: Record<SessionGalleryPhase, string> = {
  SPAWN: 'Ủ phôi',
  TRAY: 'Trên khay',
}

/**
 * Modal thư viện ảnh tổng hợp của 1 phiên — **read-only**.
 *
 * ⚠ Nguồn ảnh = **2 endpoint** (BE chưa có endpoint gộp sẵn):
 *   - `GET /api/farm/sessions/{id}/spawn-inspections` (giai đoạn 1).
 *   - `GET /api/cultivation-sessions/{id}/daily-inspections` (giai đoạn 2).
 *   Xem `features/sessions/hooks/useSessionGallery.ts`.
 *
 * ⚠ Ảnh sắp xếp **tăng dần theo thời gian** ⇒ lướt từ lúc nhận phôi ủ tơ
 *   tới khi thu hoạch — đúng thứ tự vòng đời.
 */
export function SessionGalleryModal({
  open,
  onCancel,
  photos,
  stats,
  isLoading,
  error,
  onRetry,
  contextLabel,
}: SessionGalleryModalProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [phaseFilter, setPhaseFilter] = useState<SessionGalleryPhase | 'ALL'>(
    'ALL',
  )

  /**
   * Ảnh sau khi áp bộ lọc giai đoạn.
   *
   * ⚠ `useMemo` phụ thuộc `photos` (mảng mới mỗi lần query đổi) ⇒ ổn định
   *   về mặt tham chiếu khi dữ liệu không đổi.
   */
  const visiblePhotos = useMemo(
    () => filterGalleryByPhase(photos, phaseFilter),
    [photos, phaseFilter],
  )

  /**
   * Reset về ảnh đầu tiên khi đổi bộ lọc / mở modal.
   *
   * ⚠ So sánh **trong render** + `setState` (pattern "reset state bằng
   *   render" của React) ⇒ tránh `setState` trong `useEffect` (cascading
   *   render) — cùng pattern với `CultivationGalleryModal`.
   */
  const [prevState, setPrevState] = useState({ open, phaseFilter })
  if (prevState.open !== open || prevState.phaseFilter !== phaseFilter) {
    setPrevState({ open, phaseFilter })
    if (open) setActiveIndex(0)
  }

  /**
   * Kẹp `activeIndex` trong khoảng hợp lệ.
   *
   * ⚠ Khi bộ lọc đổi, danh sách ảnh thay đổi ⇒ chỉ số cũ có thể vượt biên
   *   ⇒ render ra `undefined` ⇒ crash. Sửa trong render (không dùng effect).
   */
  const safeIndex = Math.min(
    Math.max(0, activeIndex),
    Math.max(0, visiblePhotos.length - 1),
  )
  const activePhoto = visiblePhotos[safeIndex]

  // Điều hướng bằng bàn phím (← / →).
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setActiveIndex((index) => Math.max(0, index - 1))
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((index) => Math.min(visiblePhotos.length - 1, index + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, visiblePhotos.length])

  const phaseOptions = useMemo(
    () =>
      [
        { label: `Tất cả (${stats.total})`, value: 'ALL' },
        { label: `Ủ phôi (${stats.spawnCount})`, value: 'SPAWN' },
        { label: `Trên khay (${stats.trayCount})`, value: 'TRAY' },
      ] as const,
    [stats.total, stats.spawnCount, stats.trayCount],
  )

  return (
    <Modal
      className="batch-daily-photos-modal"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={860}
      centered
      destroyOnHidden
      title={
        <span className="batch-daily-modal-title">
          <PictureOutlined aria-hidden="true" />
          Thư viện ảnh phiên canh tác
        </span>
      }
    >
      <div className="batch-daily-modal-context">
        <div>
          <Typography.Text strong style={{ fontSize: 15 }}>
            {contextLabel ?? 'Toàn bộ vòng đời canh tác'}
          </Typography.Text>
          <Typography.Text type="secondary">
            {' '}
            · {stats.total} ảnh từ {stats.inspectionCount} lần kiểm tra
          </Typography.Text>
        </div>
        <Segmented
          size="small"
          options={phaseOptions as unknown as { label: string; value: string }[]}
          value={phaseFilter}
          onChange={(value) => setPhaseFilter(value as SessionGalleryPhase | 'ALL')}
        />
      </div>

      {error ? (
        <LoadErrorAlert error={error} resource="thư viện ảnh phiên" onRetry={onRetry} />
      ) : isLoading ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Spin tip="Đang tải thư viện ảnh..." />
        </div>
      ) : visiblePhotos.length === 0 ? (
        <Empty description="Chưa có ảnh kiểm tra nào trong giai đoạn này." />
      ) : (
        <>
          <div className="batch-daily-viewer">
            <GrowthSnapshotThumbnail
              src={activePhoto?.url ?? ''}
              alt={`Ảnh kiểm tra ${safeIndex + 1}`}
              loading="eager"
              className="batch-daily-main-image"
            />

            <div className="batch-daily-viewer-label">
              <StatusBadge
                tone={activePhoto?.phase === 'SPAWN' ? 'info' : 'ok'}
                label={
                  activePhoto
                    ? PHASE_LABELS[activePhoto.phase]
                    : ''
                }
              />
              {activePhoto?.caption && (
                <MetadataBadge label={activePhoto.caption} />
              )}
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                right: 12,
                color: '#ffffff',
                fontSize: 12,
                textShadow: '0 1px 3px rgb(0 0 0 / 70%)',
              }}
            >
              <strong>
                Ảnh {safeIndex + 1} / {visiblePhotos.length}
                {activePhoto?.takenAt
                  ? ` — ${dayjs(activePhoto.takenAt).format('DD/MM/YYYY HH:mm')}`
                  : ''}
              </strong>
              {activePhoto?.trayLabel ? ` · Khay ${activePhoto.trayLabel}` : ''}
            </div>

            <Button
              type="text"
              className="batch-daily-nav batch-daily-nav--prev"
              icon={<LeftOutlined />}
              disabled={safeIndex === 0}
              onClick={() => setActiveIndex(Math.max(0, safeIndex - 1))}
              aria-label="Ảnh trước"
            />
            <Button
              type="text"
              className="batch-daily-nav batch-daily-nav--next"
              icon={<RightOutlined />}
              disabled={safeIndex >= visiblePhotos.length - 1}
              onClick={() =>
                setActiveIndex(Math.min(visiblePhotos.length - 1, safeIndex + 1))
              }
              aria-label="Ảnh sau"
            />
          </div>

          <div
            className="batch-daily-thumbs"
            role="list"
            aria-label="Chọn ảnh kiểm tra"
          >
            {visiblePhotos.map((photo, index) => (
              <button
                key={photo.sourceUrl}
                type="button"
                role="listitem"
                className={`batch-daily-thumb ${index === safeIndex ? 'is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Ảnh kiểm tra ${index + 1}`}
                aria-pressed={index === safeIndex}
                title={
                  photo.takenAt
                    ? dayjs(photo.takenAt).format('DD/MM/YYYY HH:mm')
                    : undefined
                }
              >
                <GrowthSnapshotThumbnail
                  src={photo.url}
                  alt={`Ảnh kiểm tra ${index + 1}`}
                />
                <span className="batch-daily-thumb-label">
                  <strong>
                    {photo.phase === 'SPAWN' ? 'Phôi' : 'Khay'}
                  </strong>
                  <small>
                    {photo.takenAt
                      ? dayjs(photo.takenAt).format('DD/MM')
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
