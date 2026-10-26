import { LeftOutlined, PictureOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Empty, Modal, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import type { CultivationBatch } from '../../../types/cultivation.types'
import { GrowthSnapshotThumbnail } from './GrowthSnapshotThumbnail'

/**
 * Một ảnh chụp 08:00 của một ngày trong chu kỳ mẻ trồng.
 * Mỗi ngày có tối đa 1 ảnh — chu kỳ N ngày → N ảnh.
 */
export interface DailySnapshot {
  /** Thứ tự ngày trong chu kỳ (1 = Ngày 1) */
  dayIndex: number
  /** ISO timestamp chụp ảnh, luôn ở 08:00 sáng */
  timestamp: string
  /** URL ảnh hoặc placeholder rỗng nếu chưa tới ngày */
  imageUrl: string
  /** Trạng thái: 'taken' = đã chụp, 'pending' = chưa tới */
  status: 'taken' | 'pending'
  /** Giai đoạn sinh trưởng tương ứng với ngày này */
  stageName: string
}

interface BatchDailyPhotosModalProps {
  batch: CultivationBatch | null
  open: boolean
  onCancel: () => void
}

const STAGE_NAMES: Array<{
  maxDay: number
  name: string
  color: string
}> = [
  { maxDay: 2, name: 'Ủ tơ / Nuôi sợi', color: 'blue' },
  { maxDay: 4, name: 'Kích nụ / Ra ghim', color: 'cyan' },
  { maxDay: 6, name: 'Phát triển thể quả', color: 'green' },
  { maxDay: 7, name: 'Sẵn sàng thu hoạch', color: 'gold' },
]

function resolveStageForDay(dayIndex: number) {
  return (
    STAGE_NAMES.find((s) => dayIndex <= s.maxDay) ?? STAGE_NAMES.at(-1)!
  )
}

/**
 * Chuyển gallerySnapshots (per-stage) → mảng DailySnapshot 1 ngày 1 ảnh.
 * Logic:
 * - startDate → mỗi ngày 1 ảnh 08:00
 * - Ảnh nào trùng timestamp ngày → gắn vào dayIndex tương ứng
 * - Ngày tương lai → status = 'pending', imageUrl = ''
 */
function buildDailySnapshots(batch: CultivationBatch): DailySnapshot[] {
  const startTs = dayjs(batch.startDate).startOf('day')
  const now = dayjs()
  const totalDays = 7 // chu kỳ cố định 7 ngày

  // Map ngày → snapshot (lấy ảnh đầu tiên trùng ngày)
  const snapshotByDay = new Map<number, DailySnapshot['imageUrl']>()
  for (const snap of batch.gallerySnapshots) {
    const snapDay = dayjs(snap.timestamp)
    if (!snapDay.isAfter(now)) {
      const dayIndex = snapDay.diff(startTs, 'day') + 1
      if (dayIndex >= 1 && dayIndex <= totalDays && !snapshotByDay.has(dayIndex)) {
        snapshotByDay.set(dayIndex, snap.imageUrl)
      }
    }
  }

  return Array.from({ length: totalDays }, (_, i) => {
    const dayIndex = i + 1
    const snapshotTs = startTs.add(dayIndex - 1, 'day').hour(8).toISOString()
    const snapshotDay = dayjs(snapshotTs)
    const isPastOrToday = !snapshotDay.isAfter(now)
    const imageUrl = snapshotByDay.get(dayIndex) ?? ''

    return {
      dayIndex,
      timestamp: snapshotTs,
      imageUrl: isPastOrToday ? imageUrl : '',
      status: imageUrl ? 'taken' : 'pending',
      stageName: resolveStageForDay(dayIndex).name,
    }
  })
}

export function BatchDailyPhotosModal({
  batch,
  open,
  onCancel,
}: BatchDailyPhotosModalProps) {
  const snapshots = useMemo(
    () => (batch ? buildDailySnapshots(batch) : []),
    [batch],
  )

  const batchId = batch?.id ?? null

  /** Ngày đầu tiên đã có ảnh — dùng khi mở modal hoặc đổi mẻ. */
  const firstTakenDay = useMemo(
    () => snapshots.find((s) => s.status === 'taken')?.dayIndex ?? 1,
    [snapshots],
  )

  /**
   * Ngày đang xem.
   *
   * Khởi tạo lazy để lần mount đầu đã đúng ngay (component được remount
   * mỗi lần mở modal vì parent truyền `key` theo `batch.id`).
   */
  const [activeDayIndex, setActiveDayIndex] = useState(() =>
    open ? firstTakenDay : 1,
  )

  /**
   * Lưu trạng thái modal của lần render trước.
   *
   * Khi modal mở lại hoặc đổi mẻ, cần chọn lại ngày đầu tiên đã chụp.
   * Theo hướng dẫn React "storing information from previous renders", ta
   * so sánh trong lúc render và chỉ cập nhật state khi thực sự có thay đổi
   * — tránh `setState` trong `useEffect` (gây cascading render) và tránh
   * `setState` không điều kiện trong render (gây vòng lặp vô hạn).
   */
  const [prevModalState, setPrevModalState] = useState({ open, batchId })

  if (prevModalState.open !== open || prevModalState.batchId !== batchId) {
    setPrevModalState({ open, batchId })
    if (open) {
      setActiveDayIndex(firstTakenDay)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveDayIndex((d) => Math.max(1, d - 1))
      } else if (e.key === 'ArrowRight') {
        setActiveDayIndex((d) => Math.min(snapshots.length, d + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, snapshots.length])

  const activeSnapshot = snapshots.find((s) => s.dayIndex === activeDayIndex)
  const activeStage = activeSnapshot
    ? resolveStageForDay(activeDayIndex)
    : STAGE_NAMES[0]

  const canPrev = activeDayIndex > 1
  const canNext = activeDayIndex < snapshots.length

  const takenCount = snapshots.filter((s) => s.status === 'taken').length

  return (
    <Modal
      className="batch-daily-photos-modal"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      centered
      destroyOnHidden
      title={
        <span className="batch-daily-modal-title">
          <PictureOutlined aria-hidden="true" />
          Quá trình sinh trưởng qua hình ảnh
        </span>
      }
    >
      {/* ── Header context ───────────────────────────────────── */}
      {batch && (
        <div className="batch-daily-modal-context">
          <div>
            <Typography.Text strong style={{ fontSize: 15 }}>
              Mẻ {batch.batchCode}
            </Typography.Text>
            <Typography.Text type="secondary">
              {' '}
              · {batch.mushroomType} · Khay {batch.trayName}
            </Typography.Text>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Ảnh chụp tự động lúc 08:00 mỗi ngày · {takenCount}/{snapshots.length} ngày
            đã chụp
          </Typography.Text>
        </div>
      )}

      {/* ── Main viewer ─────────────────────────────────────── */}
      <div className="batch-daily-viewer">
        <GrowthSnapshotThumbnail
          src={activeSnapshot?.imageUrl ?? ''}
          alt={`Ngày ${activeDayIndex} - ${activeSnapshot?.stageName ?? ''}`}
          loading="eager"
          className="batch-daily-main-image"
        />

        {/* Label trên ảnh */}
        <div className="batch-daily-viewer-label">
          <Tag color={activeStage.color}>{activeStage.name}</Tag>
          <strong>
            Ngày {activeDayIndex} / {snapshots.length} —{' '}
            {dayjs(activeSnapshot?.timestamp).format('DD/MM/YYYY HH:mm')}
          </strong>
        </div>

        {/* Navigation arrows */}
        <Button
          type="text"
          className="batch-daily-nav batch-daily-nav--prev"
          icon={<LeftOutlined />}
          disabled={!canPrev}
          onClick={() => canPrev && setActiveDayIndex((d) => d - 1)}
          aria-label="Ngày trước"
        />
        <Button
          type="text"
          className="batch-daily-nav batch-daily-nav--next"
          icon={<RightOutlined />}
          disabled={!canNext}
          onClick={() => canNext && setActiveDayIndex((d) => d + 1)}
          aria-label="Ngày sau"
        />
      </div>

      {/* ── Thumbnail strip ───────────────────────────────── */}
      {snapshots.length === 0 ? (
        <Empty description="Chưa có dữ liệu ảnh cho mẻ này." />
      ) : (
        <div className="batch-daily-thumbs" role="list" aria-label="Chọn ngày xem ảnh">
          {snapshots.map((snap) => {
            const isActive = snap.dayIndex === activeDayIndex

            return (
              <button
                key={snap.dayIndex}
                type="button"
                role="listitem"
                className={`batch-daily-thumb ${isActive ? 'is-active' : ''} ${
                  snap.status === 'pending' ? 'is-pending' : ''
                }`}
                onClick={() => setActiveDayIndex(snap.dayIndex)}
                aria-label={`Ngày ${snap.dayIndex} - ${snap.status === 'taken' ? 'Đã chụp' : 'Chưa chụp'}`}
                aria-pressed={isActive}
              >
                <GrowthSnapshotThumbnail
                  src={snap.imageUrl}
                  alt={`Ngày ${snap.dayIndex}`}
                />
                <span className="batch-daily-thumb-label">
                  <strong>Ngày {snap.dayIndex}</strong>
                  <small>{dayjs(snap.timestamp).format('DD/MM')}</small>
                </span>
                {isActive && (
                  <span className="batch-daily-thumb-active-ring" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
