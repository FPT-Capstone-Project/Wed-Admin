import '../../../styles/media-industrial.css'
import { MetadataBadge } from '../../../shared/ui'
import {
  LeftOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RightOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { Button, Empty, Modal, Select, Slider, Tabs, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import type {
  CultivationBatch,
  GallerySnapshot,
  SnapshotStage,
} from '../../../types/cultivation.types'
import { GrowthSnapshotLightbox } from './GrowthSnapshotLightbox'

interface BatchPlaybackModalProps {
  batch: CultivationBatch | null
  open: boolean
  onCancel: () => void
}

type GalleryFilter = 'ALL' | SnapshotStage

const STAGE_LABELS: Record<SnapshotStage, string> = {
  INCUBATION: 'Ủ tơ / Nuôi sợi',
  PINNING: 'Kích nụ / Ra ghim',
  FRUITING: 'Phát triển thể quả',
  HARVEST_READY: 'Sẵn sàng thu hoạch',
}

function formatSnapshotDate(timestamp: string) {
  return dayjs(timestamp).format('DD/MM/YYYY HH:mm')
}

export function BatchPlaybackModal({
  batch,
  open,
  onCancel,
}: BatchPlaybackModalProps) {
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('ALL')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lightboxSnapshot, setLightboxSnapshot] =
    useState<GallerySnapshot | null>(null)

  const filteredSnapshots = useMemo(() => {
    const snapshots = batch?.gallerySnapshots ?? []

    return snapshots
      .filter((snapshot) => galleryFilter === 'ALL' || snapshot.stage === galleryFilter)
      .sort(
        (left, right) =>
          new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
      )
  }, [batch?.gallerySnapshots, galleryFilter])

  const playbackIndex = Math.min(
    activeIndex,
    Math.max(0, filteredSnapshots.length - 1),
  )
  const activeSnapshot = filteredSnapshots[playbackIndex]

  useEffect(() => {
    if (!isPlaying || filteredSnapshots.length < 2) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= filteredSnapshots.length - 1) {
          setIsPlaying(false)
          return 0
        }

        return current + 1
      })
    }, 1400)

    return () => window.clearInterval(timer)
  }, [filteredSnapshots.length, isPlaying])

  const movePlayback = (direction: -1 | 1) => {
    setActiveIndex((current) =>
      Math.min(
        Math.max(current + direction, 0),
        Math.max(0, filteredSnapshots.length - 1),
      ),
    )
  }

  const renderGallery = () => (
    <div className="batch-playback-gallery">
      <div className="batch-playback-gallery-header">
        <div>
          <Typography.Title level={4}>Album ảnh tiến trình</Typography.Title>
          <Typography.Text type="secondary">
            Ảnh crop theo tầng của {batch?.trayName}
          </Typography.Text>
        </div>
        <Select<GalleryFilter>
          value={galleryFilter}
          onChange={(value) => {
            setGalleryFilter(value)
            setActiveIndex(0)
          }}
          options={[
            { value: 'ALL', label: 'Tất cả giai đoạn' },
            ...Object.entries(STAGE_LABELS).map(([value, label]) => ({
              value: value as SnapshotStage,
              label,
            })),
          ]}
          aria-label="Lọc ảnh theo giai đoạn"
        />
      </div>

      {filteredSnapshots.length === 0 ? (
        <Empty description="Chưa có ảnh trong giai đoạn này" />
      ) : (
        <div className="batch-gallery-grid">
          {filteredSnapshots.map((snapshot) => (
            <button
              key={snapshot.id}
              type="button"
              className="batch-gallery-item"
              onClick={() => setLightboxSnapshot(snapshot)}
            >
              <span className="batch-gallery-image-wrap">
                <img
                  src={snapshot.imageUrl}
                  alt={`Ảnh ${STAGE_LABELS[snapshot.stage]}`}
                />
                <span className="batch-gallery-zoom" aria-hidden="true">
                  <VideoCameraOutlined />
                </span>
              </span>
              <span className="batch-gallery-item-copy">
                <strong>{STAGE_LABELS[snapshot.stage]}</strong>
                <small>{formatSnapshotDate(snapshot.timestamp)}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const renderPlayback = () => (
    <div className="batch-timelapse-panel">
      <div className="batch-playback-player">
        {activeSnapshot ? (
          <img
            src={activeSnapshot.imageUrl}
            alt={`Playback ${STAGE_LABELS[activeSnapshot.stage]}`}
          />
        ) : (
          <Empty description="Chưa có dữ liệu playback" />
        )}
        <div className="batch-player-overlay">
          <MetadataBadge label={<>TIMELAPSE MOCK</>} />
          <span>{batch?.batchCode}</span>
        </div>
        <button
          type="button"
          className="batch-player-play"
          aria-label={isPlaying ? 'Tạm dừng playback' : 'Phát playback'}
          aria-pressed={isPlaying}
          onClick={() => setIsPlaying((current) => !current)}
        >
          {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        </button>
      </div>

      {activeSnapshot && (
        <div className="batch-playback-current-meta">
          <div>
            <Typography.Text type="secondary">Đang xem</Typography.Text>
            <strong>{STAGE_LABELS[activeSnapshot.stage]}</strong>
          </div>
          <div>
            <Typography.Text type="secondary">Thời điểm</Typography.Text>
            <strong>{formatSnapshotDate(activeSnapshot.timestamp)}</strong>
          </div>
        </div>
      )}

      <div className="batch-playback-slider">
        <Button
          type="text"
          icon={<LeftOutlined />}
          aria-label="Ảnh trước"
          disabled={playbackIndex <= 0}
          onClick={() => movePlayback(-1)}
        />
        <Slider
          min={0}
          max={Math.max(0, filteredSnapshots.length - 1)}
          value={playbackIndex}
          onChange={setActiveIndex}
          tooltip={{
            formatter: (value) => {
              const snapshot = filteredSnapshots[value ?? 0]
              return snapshot ? formatSnapshotDate(snapshot.timestamp) : ''
            },
          }}
          aria-label="Kéo để xem từng mốc ảnh playback"
        />
        <Button
          type="text"
          icon={<RightOutlined />}
          aria-label="Ảnh tiếp theo"
          disabled={playbackIndex >= filteredSnapshots.length - 1}
          onClick={() => movePlayback(1)}
        />
      </div>
      <Typography.Text type="secondary" className="batch-playback-help">
        Kéo thanh thời gian để xem lại từng ngày trong chu kỳ mẻ trồng.
      </Typography.Text>
    </div>
  )

  return (
    <>
      <Modal
        className="batch-playback-modal"
        title={
          <div className="visual-modal-title">
            <VideoCameraOutlined aria-hidden="true" />
            Playback & Gallery · {batch?.batchCode ?? 'Mẻ trồng'}
          </div>
        }
        open={open}
        onCancel={onCancel}
        footer={null}
        width={900}
        centered
        destroyOnHidden
      >
        <div className="batch-playback-modal-content">
          <div className="batch-playback-context">
            <span>
              <strong>{batch?.tenantName}</strong>
              <small>{batch?.mushroomType} · {batch?.trayName}</small>
            </span>
            <MetadataBadge label={<>{batch?.gallerySnapshots.length ?? 0} ảnh đã lưu</>} />
          </div>
          <Tabs
            items={[
              { key: 'gallery', label: 'Album ảnh tiến trình', children: renderGallery() },
              { key: 'playback', label: 'Timelapse Playback', children: renderPlayback() },
            ]}
          />
        </div>
      </Modal>

      <GrowthSnapshotLightbox
        snapshot={lightboxSnapshot}
        onClose={() => setLightboxSnapshot(null)}
      />
    </>
  )
}
